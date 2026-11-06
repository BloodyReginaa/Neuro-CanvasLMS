import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { extractBytes } from './file-content.mjs';
import { extractZip } from './zip-content.mjs';
import { fileOriginal } from './module-file.mjs';
import { endpoint } from './canvas.mjs';
import { officeKind, typeName, notebookText, OFFICE_MIME } from './file-types.mjs';

const pptx = text =>
  zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'ppt/presentation.xml': strToU8('<p:presentation/>'),
    'ppt/slides/slide1.xml': strToU8(`<p:sld><a:p><a:t>${text}</a:t></a:p></p:sld>`),
  });
const docx = text =>
  zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'word/document.xml': strToU8(`<w:document><w:p><w:t>${text}</w:t></w:p></w:document>`),
  });
// A real multi-page PDF; '' makes a page with no text layer (like a scan).
function pdf(pageTexts) {
  const n = pageTexts.length;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageTexts.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${n} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  for (const [i, t] of pageTexts.entries()) {
    const content = t ? `BT /F1 12 Tf 72 720 Td (${t}) Tj ET` : '';
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );
  }
  let out = '%PDF-1.4\n';
  const offsets = [];
  for (const [i, o] of objects.entries()) {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  }
  const xref = out.length;
  out +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map(x => String(x).padStart(10, '0') + ' 00000 n \n').join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}
const notebook = JSON.stringify({
  nbformat: 4,
  metadata: { language_info: { name: 'python' } },
  cells: [
    { cell_type: 'markdown', source: ['# Lab 3\n', 'Plot the data.'] },
    {
      cell_type: 'code',
      source: 'import numpy as np\nprint(np.arange(3))',
      outputs: [
        { output_type: 'stream', text: ['[0 1 2]\n'] },
        { output_type: 'display_data', data: { 'image/png': 'iVBORw0KGgo'.repeat(5000) } },
        { output_type: 'stream', text: 'x'.repeat(5000) },
      ],
    },
  ],
});

test('single code and text files are read like the same files inside a ZIP', async () => {
  for (const [name, mime] of [
    ['main.go', 'application/octet-stream'],
    ['lib.rs', 'application/octet-stream'],
    ['config.yaml', 'application/x-yaml'],
    ['paper.tex', 'application/x-tex'],
    ['Makefile', 'application/octet-stream'],
  ]) {
    const r = await extractBytes(strToU8('hello from ' + name), name, mime);
    assert.equal(r.text, 'hello from ' + name, name);
  }
  // Unknown extension: shown as text only when the bytes really are text.
  const odd = await extractBytes(strToU8('plain words'), 'notes.weird', 'application/octet-stream');
  assert.equal(odd.text, 'plain words');
  assert.match(odd.extraction_note, /plain text/);
  const binary = await extractBytes(
    new Uint8Array([0, 1, 2, 0, 255]),
    'data.weird',
    'application/octet-stream',
  );
  assert.equal(binary.text, null);
  assert.match(binary.extraction_note, /canvas_file_original/);
});

test('Jupyter notebooks give cells and short outputs, never base64 images', async () => {
  const r = await extractBytes(strToU8(notebook), 'lab3.ipynb', 'application/x-ipynb+json');
  assert.match(r.text, /\[Jupyter notebook: 2 cells, language python\]/);
  assert.match(r.text, /\[Cell 1: markdown\]\n# Lab 3\nPlot the data\./);
  assert.match(r.text, /print\(np\.arange\(3\)\)\n\[Output\]\n\[0 1 2\]/);
  assert.match(r.text, /\[Output: image, not included\]/);
  assert.match(r.text, /\[… output cut\]/);
  assert.ok(!r.text.includes('iVBORw0KGgo'));
  assert.ok(r.text.length < 4000);
  // The same inside a ZIP.
  const z = await extractZip(
    zipSync({ 'lab/lab3.ipynb': strToU8(notebook) }),
    'lab.zip',
    extractBytes,
  );
  assert.match(z.text, /included \(notebook cells and text outputs\)/);
  assert.ok(!z.text.includes('iVBORw0KGgo'));
  // Not really a notebook: plain text instead of an error.
  assert.equal(notebookText('{ not json'), null);
  assert.equal((await extractBytes(strToU8('{ not json'), 'x.ipynb', '')).text, '{ not json');
});

test('scanned PDFs say so and point to canvas_file_original', async () => {
  const scanned = await extractBytes(
    pdf(['', '', '', 'Page four has words']),
    'scan.pdf',
    'application/pdf',
  );
  assert.equal(scanned.likely_scanned, true);
  assert.equal(scanned.pages_without_text, '1-3');
  assert.match(scanned.extraction_note, /3 of 4 pages have no text layer/);
  assert.match(scanned.extraction_note, /canvas_file_original/);
  const mostlyText = await extractBytes(
    pdf(['Intro to data structures', 'Diagram:', 'Binary search trees', 'Hash tables explained']),
    'slides.pdf',
    'application/pdf',
  );
  assert.equal(mostlyText.likely_scanned, undefined);
  assert.equal(mostlyText.pages_without_text, '2');
  assert.match(mostlyText.extraction_note, /Page 2 has no text/);
  const text = await extractBytes(pdf(['All of this is text']), 'notes.pdf', 'application/pdf');
  assert.equal(text.pages_without_text, undefined);
  // A PDF renamed without its extension and served as octet-stream is still a PDF.
  const renamed = await extractBytes(
    pdf(['Renamed handout']),
    'Handout',
    'application/octet-stream',
  );
  assert.match(renamed.text, /Renamed handout/);
  // Scanned PDF inside a ZIP: the listing says so.
  const z = await extractZip(zipSync({ 'hw/scan.pdf': pdf(['', '']) }), 'hw.zip', extractBytes);
  assert.match(z.text, /scanned PDF/);
});

test('Office files renamed without an extension are read as Office, not as a ZIP', async () => {
  // Teacher renamed "Lecture_5.pptx" to "Lecture 5"; storage says octet-stream.
  const r = await extractBytes(pptx('Graphs and BFS'), 'Lecture 5', 'application/octet-stream');
  assert.match(r.text, /Graphs and BFS/);
  assert.match(r.extraction_note, /Office XML/);
  assert.ok(!/ZIP unpacked/.test(r.extraction_note));
  // By MIME type alone, and by the stored file name.
  assert.match(
    (await extractBytes(docx('Essay draft'), 'Draft', OFFICE_MIME.docx)).text,
    /Essay draft/,
  );
  assert.match(
    (await extractBytes(docx('Rubric'), 'Rubric', '', { storedName: 'rubric.docx' })).text,
    /Rubric/,
  );
  assert.equal(typeName('Lecture 5', 'Lecture_5.pptx'), 'Lecture_5.pptx');
  assert.equal(typeName('slides.pdf', 'upload.bin'), 'slides.pdf');
  assert.equal(typeName('Lecture 5', undefined), 'Lecture 5');
  // A real ZIP stays a ZIP, even one that happens to contain a word/ folder.
  const plain = zipSync({ 'word/document.xml': strToU8('<x/>'), 'README.md': strToU8('# hi') });
  assert.equal(officeKind(plain, 'project', 'application/octet-stream'), null);
  assert.match(
    (await extractBytes(plain, 'project', 'application/octet-stream')).extraction_note,
    /ZIP unpacked/,
  );
});

test('original downloads label renamed Office files correctly and add the extension', async () => {
  const bytes = pptx('slides');
  const r = await fileOriginal(
    { file_id: 9 },
    't',
    async () =>
      Response.json({
        id: 9,
        display_name: 'Lecture 5',
        size: bytes.length,
        url: 'https://files.example.org/x',
      }),
    {
      resolve: async () => {},
      fetcher: async () =>
        new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }),
    },
  );
  assert.equal(r.structuredContent.mime_type, OFFICE_MIME.pptx);
  assert.equal(r.structuredContent.name, 'Lecture 5.pptx');
});

test('images point to canvas_file_original instead of a download link', async () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const r = await extractBytes(png, 'board.png', 'image/png');
  assert.equal(r.text, null);
  assert.match(r.extraction_note, /Image file.*canvas_file_original/);
  // SVG is text.
  assert.match((await extractBytes(strToU8('<svg/>'), 'fig.svg', 'image/svg+xml')).text, /svg/);
});

test('canvas_courses can list past courses without changing the default', () => {
  const now = endpoint('canvas_courses', {});
  assert.equal(now.searchParams.get('enrollment_state'), 'active');
  assert.deepEqual(now.searchParams.getAll('include[]'), ['total_scores']);
  const past = endpoint('canvas_courses', { enrollment_state: 'completed' });
  assert.equal(past.searchParams.get('enrollment_state'), 'completed');
  assert.deepEqual(past.searchParams.getAll('include[]'), ['total_scores', 'term']);
  assert.throws(() => endpoint('canvas_courses', { enrollment_state: 'deleted' }), /Invalid/);
});

test('PDF text keeps its line breaks', async () => {
  // Two lines on one page: "(first line) Tj 0 -14 Td (second line)".
  const r = await extractBytes(
    pdf(['int main(void) {) Tj 0 -14 Td (  return 0;) Tj 0 -14 Td (}']),
    'code.pdf',
    'application/pdf',
  );
  assert.match(r.text, /int main\(void\) \{\n\s*return 0;\n\}/);
});
