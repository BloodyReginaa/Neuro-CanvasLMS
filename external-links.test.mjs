import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { CANVAS_HOST as H } from './config.mjs';
import { directFileURL } from './external-links.mjs';
import { moduleFileContent, moduleFile } from './module-file.mjs';
import { OFFICE_MIME } from './file-types.mjs';

const G = '1ana8n8DruRVlMmbIc-PYS_PYiwseN8o6SFwEYiVr9es';
const to = (link, purpose) => directFileURL(new URL(link), purpose).href;

test('share links become the address of the file itself', () => {
  const cases = [
    // Google Docs / Slides / Sheets: text exports for reading, real files for originals.
    [
      `https://docs.google.com/document/d/${G}/edit?usp=sharing`,
      'text',
      `https://docs.google.com/document/d/${G}/export?format=txt`,
    ],
    [
      `https://docs.google.com/document/d/${G}/edit`,
      'original',
      `https://docs.google.com/document/d/${G}/export?format=docx`,
    ],
    [
      `https://docs.google.com/presentation/d/${G}`,
      'text',
      `https://docs.google.com/presentation/d/${G}/export/txt`,
    ],
    [
      `https://docs.google.com/presentation/d/${G}/edit#slide=id.p`,
      'original',
      `https://docs.google.com/presentation/d/${G}/export/pptx`,
    ],
    [
      `https://docs.google.com/spreadsheets/d/${G}/edit#gid=123`,
      'text',
      `https://docs.google.com/spreadsheets/d/${G}/export?format=csv&gid=123`,
    ],
    [
      `https://docs.google.com/spreadsheets/d/${G}/edit`,
      'text',
      `https://docs.google.com/spreadsheets/d/${G}/export?format=csv&gid=0`,
    ],
    [
      `https://docs.google.com/spreadsheets/d/${G}/edit`,
      'original',
      `https://docs.google.com/spreadsheets/d/${G}/export?format=xlsx`,
    ],
    // Google Drive files.
    [
      `https://drive.google.com/file/d/${G}/view?usp=sharing`,
      'text',
      `https://drive.usercontent.google.com/download?id=${G}&export=download&confirm=t`,
    ],
    [
      `https://drive.google.com/open?id=${G}`,
      'original',
      `https://drive.usercontent.google.com/download?id=${G}&export=download&confirm=t`,
    ],
    // Dropbox files and folders (a folder downloads as a ZIP).
    [
      'https://www.dropbox.com/scl/fi/abc/lec1.pdf?rlkey=k&dl=0',
      'text',
      'https://www.dropbox.com/scl/fi/abc/lec1.pdf?rlkey=k&dl=1',
    ],
    [
      'https://www.dropbox.com/scl/fo/abc/xyz?rlkey=k&dl=0',
      'text',
      'https://www.dropbox.com/scl/fo/abc/xyz?rlkey=k&dl=1',
    ],
    [
      'https://www.dropbox.com/s/abc/notes.pdf?raw=1',
      'original',
      'https://www.dropbox.com/s/abc/notes.pdf?dl=1',
    ],
    // GitHub files and repositories.
    [
      'https://github.com/prof/cs210/blob/main/src/Tree.java',
      'text',
      'https://raw.githubusercontent.com/prof/cs210/main/src/Tree.java',
    ],
    ['https://github.com/prof/cs210', 'text', 'https://codeload.github.com/prof/cs210/zip/HEAD'],
    [
      'https://github.com/prof/cs210.git',
      'text',
      'https://codeload.github.com/prof/cs210/zip/HEAD',
    ],
    [
      'https://github.com/prof/cs210/tree/fall26/labs',
      'text',
      'https://codeload.github.com/prof/cs210/zip/fall26',
    ],
  ];
  for (const [link, purpose, expected] of cases) assert.equal(to(link, purpose), expected, link);
  // Left alone: pages that are not a single file, and every other site.
  for (const link of [
    'https://docs.google.com/document/d/e/2PACX-1vT/pub',
    `https://drive.google.com/drive/folders/${G}`,
    'https://www.dropbox.com/home',
    'https://github.com/prof/cs210/issues/3',
    'https://people.cs.example.edu/~prof/lec1.pdf',
    'https://echo360.org/media/abc/public',
  ])
    assert.equal(to(link, 'text'), link);
});

// A module with one ExternalUrl item, and a pretend internet behind it.
const item =
  (external_url, type = 'ExternalUrl', extra = {}) =>
  async u => {
    assert.equal(new URL(u).hostname, H);
    return Response.json({
      id: 3,
      module_id: 2,
      type,
      title: 'Module 5 slides',
      external_url,
      ...extra,
    });
  };
const args = { course_id: 1, module_id: 2, item_id: 3 };
const web = routes => ({
  resolve: async () => {},
  fetcher: async (u, o) => {
    assert.equal(new Headers(o.headers).has('Authorization'), false); // never Canvas credentials
    const r = routes[u];
    if (!r) throw new Error('unexpected request ' + u);
    return typeof r === 'function' ? r() : r;
  },
});

test('Google Slides in a module come back as slide text', async () => {
  const exp = `https://docs.google.com/presentation/d/${G}/export/txt`;
  const r = await moduleFileContent(
    args,
    't',
    item(`https://docs.google.com/presentation/d/${G}/edit?usp=sharing`),
    web({
      [exp]: new Response(null, {
        status: 307,
        headers: { location: 'https://doc-0s-slides.googleusercontent.com/x' },
      }),
      'https://doc-0s-slides.googleusercontent.com/x': new Response(
        '﻿Programming in C\vPointers\n\nDefining a Pointer\n2',
        {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'content-disposition': 'attachment; filename="Module 5.txt"',
          },
        },
      ),
    }),
  );
  assert.equal(r.text, 'Programming in C\nPointers\n\nDefining a Pointer\n2');
  assert.equal(r.name, 'Module 5.txt');
  assert.match(
    r.extraction_note,
    /Google Slides exported as plain text.*canvas_module_file.*\.pptx/,
  );
  assert.deepEqual(r.module_item, { module_id: 2, item_id: 3, title: 'Module 5 slides' });
  assert.equal(r.link, `https://docs.google.com/presentation/d/${G}/edit?usp=sharing`);
  assert.equal(r.has_more, false);
  // Paging works like canvas_file_content.
  const page = await moduleFileContent(
    { ...args, offset: 3, max_chars: 1000 },
    't',
    item(`https://docs.google.com/presentation/d/${G}/edit`),
    web({
      [exp]: () => new Response('0123456789', { headers: { 'content-type': 'text/plain' } }),
    }),
  );
  assert.equal(page.text, '3456789');
});

test('a Google file that is not shared publicly gets a clear explanation and the link', async () => {
  const link = `https://docs.google.com/document/d/${G}/edit`;
  await assert.rejects(
    moduleFileContent(
      args,
      't',
      item(link),
      web({
        [`https://docs.google.com/document/d/${G}/export?format=txt`]: new Response(null, {
          status: 302,
          headers: { location: 'https://accounts.google.com/ServiceLogin?continue=x' },
        }),
        'https://accounts.google.com/ServiceLogin?continue=x': new Response(
          '<!doctype html><title>Sign in</title>',
          {
            headers: { 'content-type': 'text/html' },
          },
        ),
      }),
    ),
    e =>
      e.message.startsWith('Canvas file:') &&
      e.message.includes('Anyone with the link') &&
      e.message.includes(link),
  );
});

test('a Dropbox folder is read as a ZIP', async () => {
  const zip = zipSync({ 'hw1/main.c': strToU8('int main(void) { return 0; }') });
  const r = await moduleFileContent(
    args,
    't',
    item('https://www.dropbox.com/scl/fo/abc/xyz?rlkey=k&dl=0'),
    web({
      'https://www.dropbox.com/scl/fo/abc/xyz?rlkey=k&dl=1': new Response(zip, {
        headers: {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="hw1.zip"',
        },
      }),
    }),
  );
  assert.match(r.text, /hw1\/main\.c/);
  assert.match(r.text, /int main\(void\)/);
});

test('File items are read like canvas_file_content; other items and URLs are refused', async () => {
  const canvas = async u => {
    const p = new URL(u);
    if (p.pathname.endsWith('/items/3'))
      return Response.json({ id: 3, module_id: 2, type: 'File', content_id: 77, title: 'HW 1' });
    if (p.pathname === '/api/v1/files/77')
      return Response.json({
        id: 77,
        display_name: 'hw1.txt',
        'content-type': 'text/plain',
        size: 5,
        url: `https://${H}/files/77/download?verifier=v`,
      });
    return new Response('hello');
  };
  const r = await moduleFileContent(args, 't', canvas);
  assert.equal(r.text, 'hello');
  assert.equal(r.file_id, 77);
  assert.equal(r.module_item.title, 'HW 1');
  await assert.rejects(moduleFileContent(args, 't', item(null, 'Page')), /canvas_page/);
  await assert.rejects(
    moduleFileContent({ ...args, url: 'https://evil.example' }, 't', item('x')),
    /only positive Canvas/,
  );
  await assert.rejects(
    moduleFileContent({ ...args, offset: -1 }, 't', item('https://github.com/a/bb')),
    /Invalid offset/,
  );
  await assert.rejects(
    moduleFileContent(
      args,
      't',
      item('https://docs.google.com/document/d/x', 'ExternalUrl', { locked_for_user: true }),
    ),
    /inaccessible/,
  );
});

test('the original of a Google Slides deck is its PowerPoint export', async () => {
  const pptx = zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'ppt/presentation.xml': strToU8('<p/>'),
    'ppt/slides/slide1.xml': strToU8('<a:t>Pointers</a:t>'),
  });
  const r = await moduleFile(
    args,
    't',
    item(`https://docs.google.com/presentation/d/${G}/edit`),
    web({
      [`https://docs.google.com/presentation/d/${G}/export/pptx`]: new Response(pptx, {
        headers: {
          'content-type': OFFICE_MIME.pptx,
          'content-disposition': 'attachment; filename="Module 5.pptx"',
        },
      }),
    }),
  );
  assert.equal(r.structuredContent.mime_type, OFFICE_MIME.pptx);
  assert.equal(r.structuredContent.name, 'Module 5.pptx');
});

test('reading the original of a Google export works although Google rebuilds it each time', async () => {
  const { readFileResource } = await import('./file-resource.mjs');
  const { fileResourceURI } = await import('./file-resource.mjs');
  let n = 0;
  const deck = () =>
    zipSync({
      '[Content_Types].xml': strToU8('<Types/>'),
      'ppt/presentation.xml': strToU8(`<p time="${++n}"/>`), // different bytes every download
      'ppt/slides/slide1.xml': strToU8('<a:t>Pointers</a:t>'),
    });
  const exp = `https://docs.google.com/presentation/d/${G}/export/pptx`;
  const options = web({
    [exp]: () =>
      new Response(deck(), {
        headers: {
          'content-type': OFFICE_MIME.pptx,
          'content-disposition': 'attachment; filename="Pointers.pptx"',
        },
      }),
  });
  const google = item(`https://docs.google.com/presentation/d/${G}/edit`);
  const first = await moduleFile(args, 't', google, {
    ...options,
    store: async (bytes, meta) => fileResourceURI(args, meta),
  });
  assert.equal(first.structuredContent.regenerated, true);
  const uri = first.structuredContent.file_resource.uri;
  const read = await readFileResource(uri, 't', google, options);
  assert.equal(read.contents[0].mimeType, OFFICE_MIME.pptx);
  // A file that should not change still must match its hash.
  let m = 0;
  const pdfLink = item('https://people.cs.example.edu/~prof/lec1.pdf');
  const pdfWeb = web({
    'https://people.cs.example.edu/~prof/lec1.pdf': () =>
      new Response(`%PDF-1.4 version ${++m}`, { headers: { 'content-type': 'application/pdf' } }),
  });
  const pdf = await moduleFile(args, 't', pdfLink, {
    ...pdfWeb,
    store: async (b, meta) => fileResourceURI(args, meta),
  });
  assert.equal(pdf.structuredContent.regenerated, undefined);
  await assert.rejects(
    readFileResource(pdf.structuredContent.file_resource.uri, 't', pdfLink, pdfWeb),
    /resource changed/,
  );
});
