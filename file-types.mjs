// What kind of file is this? Shared by single-file reading (file-content.mjs), ZIP entries
// (zip-content.mjs) and original downloads (module-file.mjs), so all three agree.
// Names can't be trusted alone: teachers rename files ("Lecture 5" with no extension) and file
// storage often answers with application/octet-stream. So the extension, the MIME type and the
// bytes themselves are all consulted.
import { unzipSync } from 'fflate';

export const TEXT_EXT = new Set(
  (
    'txt md markdown rst csv tsv json jsonl xml yaml yml toml ini cfg conf properties env sample ' +
    'html htm css scss sass less svg js mjs cjs ts tsx jsx vue java kt kts scala groovy gradle ' +
    'c h cc cpp cxx hpp hh cs go rs py pyi ipynb rb php pl pm sh bash zsh fish bat cmd ps1 sql r ' +
    'rmd m mm swift lua tex bib sty cls asm s v sv vhd hs ml mli ex exs erl clj lisp scm rkt dart ' +
    'jl f f90 pro make mk cmake in am gitignore gitattributes editorconfig dockerfile log out diff patch'
  ).split(' '),
);
export const TEXT_NAMES = new Set([
  'makefile',
  'dockerfile',
  'readme',
  'license',
  'notice',
  'copying',
]);
export const DOC_EXT = new Set(['pdf', 'docx', 'pptx', 'xlsx']);
export const ARCHIVE_EXT = new Set('zip jar war ear 7z rar tar gz tgz bz2 xz zst'.split(' '));
export const IMAGE_EXT = new Set('png jpg jpeg gif bmp webp heic tif tiff'.split(' '));
export const BINARY_EXT = new Set(
  (
    'class o obj a lib so dylib dll exe bin out.o pyc pyo wasm ico ' +
    'psd ai eps mp3 wav flac aac ogg m4a mp4 mov avi mkv webm ttf otf woff woff2 eot ' +
    'db sqlite doc ppt xls key pages numbers dmg iso'
  )
    .split(' ')
    .concat([...IMAGE_EXT]),
);

// "src/Main.java" → "java", "Makefile" → "makefile", "Lecture 5" → ""
export const ext = path => {
  const base = String(path ?? '')
    .split('/')
    .pop()
    .toLowerCase();
  if (!base.includes('.')) return TEXT_NAMES.has(base) ? base : '';
  return base.split('.').pop();
};
const KNOWN = [TEXT_EXT, TEXT_NAMES, DOC_EXT, ARCHIVE_EXT, BINARY_EXT];
const known = name => KNOWN.some(set => set.has(ext(name)));
// The name to judge the type by: the shown name if its extension means something, else the stored
// file name (Canvas keeps the uploaded name, e.g. "Lecture_5.pptx", in `filename`).
export const typeName = (shown, stored) =>
  known(shown) || !known(stored) ? (shown ?? stored ?? '') : stored;

export function looksLikeText(bytes) {
  const sample = bytes.subarray(0, 8192);
  if (sample.includes(0)) return false;
  const text = new TextDecoder().decode(sample);
  const bad = (text.match(/�/g) ?? []).length;
  return bad <= text.length * 0.02;
}
export const isPdfBytes = b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
export const isZipBytes = b => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
const TEXT_MIME =
  /^text\/|json|xml|javascript|ecmascript|x-sh|x-python|x-tex|x-latex|yaml|toml|x-ipynb/i;
export const isTextMime = mime => TEXT_MIME.test(mime ?? '');

export const OFFICE_MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
// Word, PowerPoint or Excel (OOXML) by extension, MIME type, or the archive's own entries.
// Returns 'docx' | 'pptx' | 'xlsx' | null.
export function officeKind(bytes, name, mime = '') {
  const e = ext(name);
  if (e === 'docx' || e === 'pptx' || e === 'xlsx') return e;
  if (/wordprocessingml/i.test(mime)) return 'docx';
  if (/presentationml/i.test(mime)) return 'pptx';
  if (/spreadsheetml/i.test(mime)) return 'xlsx';
  if (!isZipBytes(bytes) || e === 'zip') return null;
  const names = new Set();
  try {
    // Reads only the archive's directory; nothing is decompressed.
    unzipSync(bytes, {
      filter: f => {
        names.add(f.name);
        return false;
      },
    });
  } catch {
    return null;
  }
  if (!names.has('[Content_Types].xml')) return null;
  if (names.has('word/document.xml')) return 'docx';
  if (names.has('ppt/presentation.xml')) return 'pptx';
  if (names.has('xl/workbook.xml')) return 'xlsx';
  return null;
}

// Jupyter notebooks: the cells' source and short text outputs only. Raw .ipynb JSON is mostly
// base64 images and metadata, which would fill the AI's context. Returns null if it isn't one.
const OUTPUT_CHARS = 2000;
export function notebookText(raw) {
  let nb;
  try {
    nb = JSON.parse(raw);
  } catch {
    return null;
  }
  const cells = Array.isArray(nb?.cells)
    ? nb.cells
    : Array.isArray(nb?.worksheets?.[0]?.cells) // nbformat 3
      ? nb.worksheets[0].cells
      : null;
  if (!cells) return null;
  const join = v => (Array.isArray(v) ? v.join('') : typeof v === 'string' ? v : '');
  const lang = nb.metadata?.language_info?.name ?? nb.metadata?.kernelspec?.language ?? 'unknown';
  const out = [`[Jupyter notebook: ${cells.length} cells, language ${lang}]`];
  cells.forEach((cell, i) => {
    const type = cell?.cell_type ?? 'cell';
    out.push(`\n[Cell ${i + 1}: ${type}]\n` + join(cell?.source ?? cell?.input));
    for (const o of Array.isArray(cell?.outputs) ? cell.outputs : []) {
      const text = join(o?.text) || join(o?.data?.['text/plain']) || join(o?.traceback);
      const hasImage = Object.keys(o?.data ?? {}).some(k => k.startsWith('image/'));
      if (text)
        out.push(
          '[Output]\n' +
            (text.length > OUTPUT_CHARS ? text.slice(0, OUTPUT_CHARS) + '\n[… output cut]' : text),
        );
      else if (hasImage) out.push('[Output: image, not included]');
    }
  });
  return out.join('\n');
}
