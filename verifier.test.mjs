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
