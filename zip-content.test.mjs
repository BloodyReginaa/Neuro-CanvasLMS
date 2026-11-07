import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { extractZip, isZip, ZIP_LIMITS } from './zip-content.mjs';
import { extractBytes, readFileContent } from './file-content.mjs';
import { endpoint } from './canvas.mjs';
import { CANVAS_HOST as H } from './config.mjs';

const doc = (b, n, m) => extractBytes(b, n, m, { insideZip: true });
const docx = text =>
  zipSync({
    'word/document.xml': strToU8(`<w:document><w:p><w:t>${text}</w:t></w:p></w:document>`),
  });
const course = () =>
  zipSync({
    'trees3/src/BinaryTree.java': strToU8('public class BinaryTree<E> { Node<E> root; }'),
    'trees3/README.md': strToU8('# Trees\nRun with `java Main`.'),
    'trees3/Makefile': strToU8('all:\n\tjavac src/*.java'),
    'trees3/bin/BinaryTree.class': new Uint8Array([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 52]),
    'trees3/notes.docx': docx('Height of an empty tree is -1'),
    'trees3/inner.zip': zipSync({ 'x.txt': strToU8('nested') }),
    '__MACOSX/trees3/._README.md': strToU8('junk'),
    'trees3/data.weird': strToU8('plain text with an unknown extension'),
    'trees3/blob.weird': new Uint8Array([0, 1, 2, 3, 0, 255, 254]),
  });

test('ZIP detection: by name, mime or magic bytes, but never Office files', () => {
  const z = course();
  assert.equal(isZip(z, 'trees3.zip', ''), true);
  assert.equal(isZip(z, 'download', 'application/x-zip-compressed'), true);
  assert.equal(isZip(z, 'download', ''), true);
  assert.equal(isZip(docx('x'), 'a.docx', ''), false);
  assert.equal(isZip(strToU8('hello'), 'a.txt', 'text/plain'), false);
});

test('a course code ZIP: listing for everything, text for code/docs, binaries and junk skipped', async () => {
  const r = await extractZip(course(), 'trees3.zip', doc);
  assert.match(r.text, /^\[ZIP\] trees3\.zip: 9 files, \d+ folders/);
  for (const [path, status] of [
    ['trees3/src/BinaryTree.java', 'included'],
    ['trees3/README.md', 'included'],
    ['trees3/Makefile', 'included'],
    ['trees3/notes.docx', 'included (document text)'],
    ['trees3/data.weird', 'included'],
    ['trees3/bin/BinaryTree.class', 'skipped (binary)'],
    ['trees3/inner.zip', 'skipped (nested archive)'],
    ['__MACOSX/trees3/._README.md', 'skipped (system/junk file)'],
    ['trees3/blob.weird', 'skipped (binary content)'],
  ])
    assert.match(
      r.text,
      new RegExp(
        `  ${path.replace(/[.*]/g, '\\$&')}  \\([^)]*\\)  ${status.replace(/[()]/g, '\\$&')}`,
      ),
      path,
    );
  assert.match(r.text, /===== trees3\/src\/BinaryTree\.java =====\npublic class BinaryTree<E>/);
  assert.match(r.text, /Height of an empty tree is -1/);
  assert.doesNotMatch(r.text, /={5} (trees3\/inner\.zip|__MACOSX)/);
  assert.doesNotMatch(r.text, /\nnested\b|\njunk\b/);
  assert.equal(r.zip_included, 5);
});

test('`entry` reads exactly one file; unknown entries and non-ZIP files are refused', async () => {
  const r = await extractZip(course(), 'trees3.zip', doc, { entry: 'trees3/README.md' });
  assert.equal(r.text, '# Trees\nRun with `java Main`.');
  assert.equal(r.zip_entry, 'trees3/README.md');
  await assert.rejects(
    extractZip(course(), 'trees3.zip', doc, { entry: 'nope.txt' }),
    /not found in the ZIP/,
  );
  await assert.rejects(
    extractBytes(strToU8('hi'), 'a.txt', 'text/plain', { entry: 'x' }),
    /only be used with ZIP/,
  );
  assert.throws(
    () => endpoint('canvas_file_content', { file_id: 1, entry: 'a\nb' }),
    /Invalid entry/,
  );
});

test('zip bombs: oversized entries are never inflated, and lying size headers are discarded', async () => {
  const big = new Uint8Array(ZIP_LIMITS.textBytes + 1); // compresses to almost nothing
  const r = await extractZip(zipSync({ 'big.txt': big, 'ok.txt': strToU8('fine') }), 'b.zip', doc);
  assert.match(r.text, /big\.txt .* skipped \(larger than 2\.0 MB\)/);
  assert.match(r.text, /===== ok\.txt =====\nfine/);

  // Forge a ZIP whose headers claim a tiny entry that actually inflates to 1 MB.
  const z = zipSync({ 'liar.txt': new Uint8Array(1024 * 1024).fill(65) }, { level: 9 });
  const view = new DataView(z.buffer);
  for (let i = 0; i + 4 <= z.length; i++) {
    const sig = view.getUint32(i, true);
    if (sig === 0x04034b50) view.setUint32(i + 22, 10, true); // local header: uncompressed size
    if (sig === 0x02014b50) view.setUint32(i + 24, 10, true); // central directory: uncompressed size
  }
  const lied = await extractZip(z, 'liar.zip', doc);
  assert.match(lied.text, /liar\.txt .* skipped \(damaged or failed integrity check\)/);
  assert.doesNotMatch(lied.text, /AAAA/);
});

test('the total decompressed budget stops reading and says how to continue', async () => {
  const files = {};
  const chunk = new Uint8Array(ZIP_LIMITS.textBytes - 10).fill(120);
  const n = Math.ceil(ZIP_LIMITS.totalBytes / chunk.length) + 2;
  for (let i = 0; i < n; i++) files[`f${String(i).padStart(2, '0')}.txt`] = chunk;
  const r = await extractZip(zipSync(files), 'many.zip', doc);
  assert.match(r.text, /not read \(total size limit reached; use `entry`\)/);
  assert.ok(r.zip_included < n);
});

test('damaged archives are reported instead of crashing', async () => {
  const z = course().slice(0, 40);
  const r = await extractZip(z, 'broken.zip', doc);
  assert.equal(r.text, null);
  assert.match(r.extraction_note, /could not be read/);
});

test('canvas_file_content end to end: a Canvas .zip comes back as paginated text', async () => {
  const bytes = zipSync({
    'trees3/Makefile': strToU8('all:\n\tjavac src/*.java'),
    'trees3/src/BinaryTree.java': strToU8(
      'public class BinaryTree<E> {\n' + '  // walk\n'.repeat(400) + '}',
    ),
  });
  const fetcher = async () =>
    new Response(bytes, { headers: { 'content-type': 'application/zip' } });
  const meta = {
    id: 7,
    display_name: 'trees3.zip',
    size: bytes.length,
    url: `https://${H}/files/7/download?verifier=x`,
    'content-type': 'application/zip',
  };
  const first = await readFileContent(meta, { max_chars: 1000 }, fetcher);
  assert.match(first.text, /^\[ZIP\] trees3\.zip/);
  assert.equal(first.has_more, true);
  const rest = await readFileContent(
    meta,
    { offset: first.next_offset, max_chars: 30000 },
    fetcher,
  );
  assert.match(first.text + rest.text, /public class BinaryTree<E>/);
  const one = await readFileContent(meta, { entry: 'trees3/Makefile' }, fetcher);
  assert.equal(one.text, 'all:\n\tjavac src/*.java');
});

test('canvas_file_original returns the ORIGINAL zip byte-for-byte, labelled as a ZIP', async () => {
  const { fileOriginal } = await import('./module-file.mjs');
  const { readFileResource, fileResourceURI } = await import('./file-resource.mjs');
  const bytes = zipSync({ 'trees3/src/Node.java': strToU8('class Node<E> {}') });
  const sha = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex');
  const api = async () =>
    Response.json({
      id: 8888,
      display_name: 'trees3.zip',
      size: bytes.length,
      url: 'https://files.example.org/t.zip',
    });
  // Storage commonly answers with a generic content type.
  const options = {
    resolve: async () => {},
    fetcher: async () =>
      new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }),
  };
  const linked = await fileOriginal({ file_id: 8888 }, 't', api, {
    ...options,
    store: async (b, m) => fileResourceURI({ file_id: 8888 }, m),
  });
  assert.equal(linked.structuredContent.name, 'trees3.zip');
  assert.equal(linked.structuredContent.mime_type, 'application/zip');
  assert.equal(linked.structuredContent.sha256, sha);
  assert.equal(linked.content[1].type, 'resource_link');
  assert.match(linked.content[0].text, /for a ZIP, unpack it/);
  // The client then reads the resource: exact original bytes come back.
  const read = await readFileResource(linked.content[1].uri, 't', api, options);
  assert.equal(read.contents[0].mimeType, 'application/zip');
  assert.deepEqual(new Uint8Array(Buffer.from(read.contents[0].blob, 'base64')), bytes);
});

test('Office files are not relabelled as ZIP when fetched as originals', async () => {
  const { fileOriginal } = await import('./module-file.mjs');
  const bytes = docx('hello');
  const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const r = await fileOriginal(
    { file_id: 1 },
    't',
    async () =>
      Response.json({
        id: 1,
        display_name: 'a.docx',
        size: bytes.length,
        url: 'https://files.example.org/a.docx',
      }),
    {
      resolve: async () => {},
      fetcher: async () => new Response(bytes, { headers: { 'content-type': mime } }),
    },
  );
  assert.equal(r.structuredContent.mime_type, mime);
});

test('the ZIP text result tells the AI how to get the original archive', async () => {
  const r = await extractZip(course(), 'trees3.zip', doc);
  assert.match(r.extraction_note, /canvas_file_original/);
});

test('UTF-8 names without the UTF-8 flag (macOS zip / Finder) are read, not called damaged', async () => {
  // Made with macOS `zip -r`: 作业/第一题.py, name bytes UTF-8, flag bit 11 not set.
  const bytes = new Uint8Array(
    Buffer.from(
      'UEsDBAoAAAAAADR6Z129ciwLCQAAAAkAAAAKABwAcmVhZG1lLnR4dFVUCQADZIfvamSH72p1eAsAAQT1AQAABAAAAABhc2NpaSBvawpQSwMECgAAAAAANHpnXQAAAAAAAAAAAAAAAAcAHADkvZzkuJovVVQJAANkh+9qZIfvanV4CwABBPUBAAAEAAAAAFBLAwQKAAAAAAA0emdd9/WYrgwAAAAMAAAAEwAcAOS9nOS4mi/nrKzkuIDpopgucHlVVAkAA2SH72pkh+9qdXgLAAEE9QEAAAQAAAAAcHJpbnQoImhpIikKUEsBAh4DCgAAAAAANHpnXb1yLAsJAAAACQAAAAoAGAAAAAAAAQAAAKSBAAAAAHJlYWRtZS50eHRVVAUAA2SH72p1eAsAAQT1AQAABAAAAABQSwECHgMKAAAAAAA0emddAAAAAAAAAAAAAAAABwAYAAAAAAAAABAA7UFNAAAA5L2c5LiaL1VUBQADZIfvanV4CwABBPUBAAAEAAAAAFBLAQIeAwoAAAAAADR6Z1339ZiuDAAAAAwAAAATABgAAAAAAAEAAACkgY4AAADkvZzkuJov56ys5LiA6aKYLnB5VVQFAANkh+9qdXgLAAEE9QEAAAQAAAAAUEsFBgAAAAADAAMA9gAAAOcAAAAAAA==',
      'base64',
    ),
  );
  const r = await extractZip(bytes, 'pa.zip', async () => ({ text: 'doc' }));
  assert.match(r.text, /作业\/第一题\.py {2}\(12 B\) {2}included/);
  assert.match(r.text, /===== 作业\/第一题\.py =====\nprint\("hi"\)/);
  assert.ok(!r.text.includes('damaged'));
  // `entry` takes the real name, and the Latin-1 reading older results showed
  const one = await extractZip(bytes, 'pa.zip', null, { entry: '作业/第一题.py' });
  assert.equal(one.text, 'print("hi")\n');
  const latin1 = Buffer.from('作业/第一题.py', 'utf8').toString('latin1');
  assert.equal((await extractZip(bytes, 'pa.zip', null, { entry: latin1 })).text, 'print("hi")\n');
});
