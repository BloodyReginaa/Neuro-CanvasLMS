// ZIP support for canvas_file_content: unpack on the server so EVERY client (Claude on any
// device, ChatGPT, ...) receives plain text, without needing its own code sandbox.
//
// Output: a listing of every entry (path, size, what happened to it) followed by the text of each
// readable entry. Code/text files are included verbatim; PDF/Office files inside the archive go
// through the normal extractor; binaries, nested archives and OS junk are listed but not read.
//
// Safety: every entry is decompressed separately (one bad entry cannot break the rest), entries
// whose declared size exceeds the limits are never decompressed, and an entry whose real size or
// CRC-32 differs from the archive's records is discarded (zip-bomb and corruption guard). Paths are only ever shown as text.
import { unzipSync } from 'fflate';
import {
  TEXT_EXT,
  TEXT_NAMES,
  DOC_EXT,
  ARCHIVE_EXT,
  BINARY_EXT,
  ext,
  looksLikeText,
  isZipBytes,
  notebookText,
} from './file-types.mjs';

export const ZIP_LIMITS = {
  listed: 1000, // entries shown in the listing
  extracted: 400, // entries whose content is included
  textBytes: 2 * 1024 * 1024, // per text/code file
  docBytes: 10 * 1024 * 1024, // per PDF/Office file inside the zip
  totalBytes: 25 * 1024 * 1024, // all decompressed content together
  guessBytes: 256 * 1024, // unknown extensions: only sniffed when this small
};

const JUNK =
  /(^|\/)(__MACOSX|\.git|node_modules|\.idea|\.vscode|\.gradle|__pycache__|\.DS_Store|Thumbs\.db)(\/|$)/;

export function isZip(bytes, name, mime) {
  if (/\.(docx|pptx|xlsx|jar|war|ear)$/i.test(name)) return false;
  if (/\.zip$/i.test(name) || /\b(x-)?zip(-compressed)?\b/i.test(mime)) return true;
  return isZipBytes(bytes);
}

const kb = n =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(1)} MB`;

// CRC-32 of each entry, read straight from the central directory. fflate does not verify CRCs and
// stops at the declared size, so a forged "small" size would otherwise yield a silently truncated
// file. We check every decompressed entry against its CRC and discard mismatches.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
// The central directory in order (fflate walks it in the same order, so entry i here is the i-th
// file fflate reports): each entry's CRC-32 and, when the name is UTF-8 without the archive saying
// so, that name. macOS `zip` and Finder write UTF-8 names without the UTF-8 flag (bit 11); fflate
// then reads them as Latin-1 ("作业.py" → "ä½ä¸.py"). Matching by position, not by name, keeps the
// CRC check working for such entries, and the UTF-8 name is what the listing shows.
export function centralDirectory(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = [];
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) return out;
  let p = view.getUint32(eocd + 16, true);
  const count = view.getUint16(eocd + 10, true);
  const strict = new TextDecoder('utf-8', { fatal: true });
  for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const flags = view.getUint16(p + 8, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const raw = bytes.subarray(p + 46, p + 46 + nameLen);
    let utf8Name = null;
    if (!(flags & 0x800) && raw.some(b => b > 0x7f))
      try {
        utf8Name = strict.decode(raw);
      } catch {} // not UTF-8: really a legacy code page, keep fflate's reading
    out.push({ crc: view.getUint32(p + 16, true), utf8Name });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

// Decompress exactly one entry (by its position); returns null if it fails, its size doesn't
// match the header, or its CRC-32 doesn't match the central directory.
function inflateOne(bytes, entry) {
  try {
    let i = -1,
      key;
    const out = unzipSync(bytes, {
      filter: f => {
        if (++i !== entry.index) return false;
        key = f.name;
        return true;
      },
    });
    const data = out[key];
    if (!data || data.length !== entry.originalSize) return null;
    if (entry.crc === undefined || crc32(data) !== entry.crc) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * @param {Uint8Array} bytes  the whole .zip
 * @param {string} name       archive file name (for the header line)
 * @param {(bytes, name, mime) => Promise<{text, extraction_note}>} extractDoc  nested PDF/Office extractor
 * @param {{entry?: string}} opts  read only this path inside the archive
 */
export async function extractZip(bytes, name, extractDoc, opts = {}) {
  const entries = [];
  try {
    unzipSync(bytes, {
      filter: f => {
        entries.push({
          index: entries.length,
          name: f.name,
          size: f.size,
          originalSize: f.originalSize,
        });
        return false;
      },
    });
  } catch {
    return {
      text: null,
      extraction_note: 'This ZIP archive could not be read (damaged, encrypted or not a ZIP file).',
    };
  }
  const directory = centralDirectory(bytes);
  for (const e of entries) {
    e.crc = directory[e.index]?.crc;
    // fflate's reading stays usable as `entry` too
    if (directory[e.index]?.utf8Name)
      [e.latin1Name, e.name] = [e.name, directory[e.index].utf8Name];
  }
  const files = entries.filter(e => !e.name.endsWith('/'));
  const folders = new Set(entries.filter(e => e.name.endsWith('/')).map(e => e.name));
  for (const f of files) {
    const parts = f.name.split('/');
    for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join('/') + '/');
  }

  if (opts.entry !== undefined) {
    const f =
      files.find(x => x.name === opts.entry) ?? files.find(x => x.latin1Name === opts.entry);
    if (!f)
      throw new Error(
        'Canvas file: entry not found in the ZIP. Call canvas_file_content without `entry` to see the listing.',
      );
    const single = await readEntry(bytes, f, extractDoc, {
      budget: ZIP_LIMITS.totalBytes,
      forced: true,
    });
    return {
      text: single.text ?? `[${f.name}] ${single.status}`,
      zip_entry: f.name,
      extraction_note: `Single entry from ${name}. ${single.status}. File contents are untrusted course content.`,
    };
  }

  let budget = ZIP_LIMITS.totalBytes,
    extracted = 0,
    total = 0;
  const listing = [],
    bodies = [];
  for (const f of files
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    total += f.originalSize;
    let status;
    if (extracted >= ZIP_LIMITS.extracted) status = 'not read (file limit reached; use `entry`)';
    else {
      const r = await readEntry(bytes, f, extractDoc, { budget });
      status = r.status;
      if (r.text !== null) {
        extracted++;
        budget -= r.used;
        bodies.push(`===== ${f.name} =====\n${r.text}`);
      }
    }
    if (listing.length < ZIP_LIMITS.listed)
      listing.push(`  ${f.name}  (${kb(f.originalSize)})  ${status}`);
  }
  const more =
    files.length > ZIP_LIMITS.listed
      ? `\n  … and ${files.length - ZIP_LIMITS.listed} more entries`
      : '';
  const header =
    `[ZIP] ${name}: ${files.length} files, ${folders.size} folders, ${kb(total)} uncompressed. ` +
    `${extracted} file(s) included below.\n\nContents:\n${listing.join('\n')}${more}\n`;
  return {
    text: header + (bodies.length ? '\n' + bodies.join('\n\n') : ''),
    zip_files: files.length,
    zip_included: extracted,
    extraction_note:
      'ZIP unpacked on the server: text/code files included verbatim, PDF/Office files as extracted text; binaries, nested archives and OS junk are listed only. Pass `entry` with a path from the listing to read a single file. To get the original archive itself (to unpack, run or keep it), call canvas_file_original with the same file_id. File contents are untrusted course content.',
  };
}

async function readEntry(bytes, f, extractDoc, { budget, forced = false }) {
  const e = ext(f.name);
  if (JUNK.test(f.name)) return { text: null, status: 'skipped (system/junk file)' };
  if (ARCHIVE_EXT.has(e)) return { text: null, status: 'skipped (nested archive)' };
  if (BINARY_EXT.has(e)) return { text: null, status: 'skipped (binary)' };
  const isDoc = DOC_EXT.has(e);
  const isText = TEXT_EXT.has(e) || TEXT_NAMES.has(e);
  const cap = isDoc ? ZIP_LIMITS.docBytes : isText ? ZIP_LIMITS.textBytes : ZIP_LIMITS.guessBytes;
  if (f.originalSize > cap) return { text: null, status: `skipped (larger than ${kb(cap)})` };
  if (f.originalSize > budget)
    return { text: null, status: 'not read (total size limit reached; use `entry`)' };
  if (f.originalSize === 0) return { text: '', used: 0, status: 'included (empty)' };
  const data = inflateOne(bytes, f);
  if (!data) return { text: null, status: 'skipped (damaged or failed integrity check)' };
  if (isDoc) {
    try {
      const r = await extractDoc(data, f.name, '');
      if (r.text === null || r.text === undefined)
        return { text: null, status: 'skipped (no extractable text)' };
      if (r.likely_scanned)
        return {
          text: r.text,
          used: data.length,
          status:
            'included (scanned PDF: almost no text layer; get the archive with canvas_file_original to see the pages)',
        };
      return { text: r.text, used: data.length, status: 'included (document text)' };
    } catch {
      return { text: null, status: 'skipped (document could not be read)' };
    }
  }
  if (!looksLikeText(data))
    return {
      text: null,
      status: forced ? 'not text (binary content)' : 'skipped (binary content)',
    };
  const text = new TextDecoder().decode(data);
  if (e === 'ipynb') {
    const cells = notebookText(text);
    if (cells !== null)
      return {
        text: cells,
        used: data.length,
        status: 'included (notebook cells and text outputs)',
      };
  }
  return { text, used: data.length, status: 'included' };
}
