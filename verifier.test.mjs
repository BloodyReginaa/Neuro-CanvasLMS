import test from 'node:test';
import assert from 'node:assert/strict';
import { CANVAS_HOST as H } from './config.mjs';
import { withoutVerifiers, callCanvas } from './canvas.mjs';

test('verifier passes are removed from everything the AI sees, links still work', () => {
  const cases = [
    [
      `https://${H}/files/5/download?download_frd=1&verifier=abc-123`,
      `https://${H}/files/5/download?download_frd=1`,
    ],
    [`https://${H}/courses/1/files/5?verifier=abc&wrap=1`, `https://${H}/courses/1/files/5?wrap=1`],
    [
      `https://${H}/courses/1/files/5?a=1&verifier=abc&b=2`,
      `https://${H}/courses/1/files/5?a=1&b=2`,
    ],
    [`https://${H}/courses/1/files/5?verifier=abc`, `https://${H}/courses/1/files/5`],
    // Inside page HTML the & is written &amp;
    [
      `<a href="/courses/1/files/5?verifier=abc&amp;wrap=1">x</a>`,
      `<a href="/courses/1/files/5?wrap=1">x</a>`,
    ],
    [`<a href="/files/5?a=1&amp;verifier=abc">x</a>`, `<a href="/files/5?a=1">x</a>`],
    ['no links here', 'no links here'],
  ];
  for (const [input, output] of cases) assert.equal(withoutVerifiers(input), output);
  const nested = withoutVerifiers({
    data: [{ url: `https://${H}/files/9/download?verifier=s3cret`, size: 3, ok: true, none: null }],
    body: `<a href="/files/9?verifier=s3cret&amp;wrap=1">a</a>`,
  });
  assert.ok(!JSON.stringify(nested).includes('s3cret'));
  assert.equal(nested.data[0].size, 3);
  assert.equal(nested.data[0].none, null);
});

test('file text results link to the Canvas file page, never the download URL', async () => {
  const r = await callCanvas('canvas_file_content', { file_id: 5 }, 'tok', async u =>
    String(u).includes('/api/v1/files/5')
      ? Response.json({
          id: 5,
          display_name: 'notes.txt',
          'content-type': 'text/plain',
          size: 5,
          url: `https://${H}/files/5/download?download_frd=1&verifier=SECRET`,
        })
      : new Response('hello'),
  );
  assert.equal(r.text, 'hello');
  assert.equal(r.html_url, `https://${H}/files/5`);
  assert.ok(!JSON.stringify(r).includes('SECRET'));
});

test('list results name the API request api_url, not a link for the user', async () => {
  const r = await callCanvas('canvas_courses', {}, 'tok', async () => Response.json([]));
  assert.match(r.api_url, /\/api\/v1\/courses\?/);
  assert.equal(r.source_url, undefined);
});

test('raw results lose signed links too; ordinary and shared links stay', async () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyMTcwNTZ9.c2lnbmF0dXJl';
  // canvas_file with raw: true, as Canvas answers (the shape the security scan reported)
  const raw = {
    id: 5,
    display_name: 'notes.pdf',
    url: `https://${H}/files/5/download?download_frd=1&verifier=SECRET`,
    canvadoc_session_url: `/api/v1/canvadoc_session?blob=%7B%22user_id%22%3A1%7D&hmac=abc123`,
    crocodoc_session_url: `/api/v1/crocodoc_session?blob=x&hmac=y`,
    preview_url: `/api/v1/canvadoc_session?blob=%7B%7D&hmac=abc123`,
    thumbnail_url: `https://inst-fs-iad-prod.inscloudgate.net/thumbnails/1?token=${jwt}`,
    // the file's uuid is its legacy verifier (Canvas accepts ?verifier=<uuid>)
    uuid: 'UUIDPASS0123456789abcdefghijklmnopqrstu',
    attachments: [
      {
        id: 6,
        uuid: 'UUIDPASS-att',
        thumbnail_url: `https://${H}/images/thumbnails/6/UUIDPASS-att`,
      },
    ],
    login: `https://${H}/login?return_to=%2Ffiles%2F5%2Fdownload%3Fverifier%3DENCODEDPASS%26wrap%3D1`,
  };
  const out = withoutVerifiers({ data: raw });
  const text = JSON.stringify(out);
  for (const secret of [
    'SECRET',
    'hmac',
    'blob=',
    jwt,
    'canvadoc_session_url',
    'crocodoc_session_url',
    'UUIDPASS',
    'ENCODEDPASS',
    'thumbnail',
  ])
    assert.ok(!text.includes(secret), secret);
  assert.equal(out.data.url, `https://${H}/files/5/download?download_frd=1`);
  assert.equal(out.data.preview_url, '[signed link removed]');
  assert.equal(out.data.uuid, undefined);
  assert.equal(out.data.attachments[0].id, 6);
  assert.match(out.data.login, /verifier%3D%26wrap%3D1$/);
  assert.equal(out.data.display_name, 'notes.pdf');

  // inside page HTML (raw) and inside text: signed storage links go, the rest of the text stays
  const html = `<p>See <img src="https://inst-fs-iad-prod.inscloudgate.net/files/1/a.png?token=${jwt}&amp;download=1"> and <a href="https://a1-5.cluster1.canvas-user-content.com/files/5/download?download_frd=1&amp;sf_verifier=${jwt}">slides</a>.</p>`;
  const cleaned = withoutVerifiers(html);
  assert.ok(!cleaned.includes(jwt));
  assert.match(
    cleaned,
    /^<p>See <img src="\[signed link removed\]"> and <a href="\[signed link removed\]">slides<\/a>\.<\/p>$/,
  );
  for (const signed of [
    'https://bucket.s3.amazonaws.com/f.zip?X-Amz-Algorithm=AWS4&X-Amz-Signature=abcd',
    'https://d1.cloudfront.net/f.pdf?Expires=1800000000&Signature=abcd&Key-Pair-Id=K',
  ])
    assert.equal(
      withoutVerifiers(`get it at ${signed} today`),
      'get it at [signed link removed] today',
    );

  // these must survive untouched
  for (const keep of [
    `https://${H}/courses/1/assignments/2/submissions/3?preview=1&version=0`,
    `https://${H}/courses/1/files/5?wrap=1`,
    `https://${H}/api/v1/files/5?per_page=50&page=1`,
    'https://www.dropbox.com/scl/fi/abc/x.pdf?rlkey=KEY&dl=0',
    'https://docs.google.com/presentation/d/ID/edit?usp=sharing',
    'https://umass-amherst.zoom.us/j/123456789?pwd=abc',
    'https://example.org/page?token=not-a-jwt',
    'https://neuro-canvas-lms.you.workers.dev/dl/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCdE',
    "What's due this week? Office hours moved?",
  ])
    assert.equal(withoutVerifiers(keep), keep, keep);

  // a canvas_file_download_link result reaches the AI unchanged
  const dl =
    'https://neuro-canvas-lms.you.workers.dev/dl/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCdE';
  const link = {
    file_id: 5,
    name: 'hamspam-student.zip',
    html_url: `https://${H}/files/5`,
    download_url: dl,
    command: `curl -L --fail -H "X-Canvas-Download: 1" -o "hamspam-student.zip" "${dl}"`,
  };
  assert.deepEqual(withoutVerifiers(link), link);
});
