import test from 'node:test';
import assert from 'node:assert/strict';
import { CANVAS_HOST as H } from './config.mjs';
import { callCanvas } from './canvas.mjs';

// When Canvas is slow, down or unreachable the AI must hear that (and that the token is fine), not
// "check tool arguments", and never "make a new token".
const fails = (fn, ...parts) =>
  assert.rejects(fn(), e => {
    for (const p of parts) assert.match(e.message, p);
    assert.match(e.message, /^Canvas/, 'shown to the AI as is');
    return true;
  });

test('a Canvas timeout or network error says so and says not to reconnect', async () => {
  const timeout = async () => {
    throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  };
  await fails(
    () => callCanvas('canvas_courses', {}, 't', timeout),
    /did not answer within 20 seconds/,
    /do not reconnect/,
  );
  const offline = async () => {
    throw new TypeError('Network connection lost.');
  };
  await fails(
    () => callCanvas('canvas_courses', {}, 't', offline),
    /could not be reached \(network error: TypeError\)/,
    /do not reconnect/,
  );
  // our own transport messages are kept
  const transport = async () => {
    throw new Error('Canvas transport: response is too large.');
  };
  await fails(() => callCanvas('canvas_courses', {}, 't', transport), /response is too large/);
});

test('Canvas maintenance (HTML 502/503/504) says to wait, not to make a new token', async () => {
  for (const status of [502, 503, 504])
    await fails(
      () =>
        callCanvas(
          'canvas_courses',
          {},
          't',
          async () =>
            new Response('<h1>Down for maintenance</h1>', {
              status,
              headers: { 'content-type': 'text/html' },
            }),
        ),
      /temporarily unavailable/,
      new RegExp(`HTTP ${status}`),
      /HTML error page/,
      /do not reconnect/,
    );
  for (const status of [406, 500])
    await assert.rejects(
      callCanvas(
        'canvas_courses',
        {},
        't',
        async () =>
          new Response('<h1>x</h1>', { status, headers: { 'content-type': 'text/html' } }),
      ),
      e => !/fresh|new token|malformed/i.test(e.message) && e.htmlError === status,
    );
});

test('a 200 answer that is not JSON is reported as a Canvas problem', async () => {
  await fails(
    () =>
      callCanvas(
        'canvas_courses',
        {},
        't',
        async () =>
          new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }),
      ),
    /HTTP 200 but not with JSON/,
  );
});

test('a damaged PDF or Office file becomes a note pointing to the original, not an error', async () => {
  for (const [name, mime, body] of [
    ['Lecture 3.pdf', 'application/pdf', '%PDF-1.4 this is not really a pdf'],
    [
      'notes.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'PK\x03\x04 truncated',
    ],
    ['Lecture 4.pdf', 'application/pdf', '<html><body>Please log in</body></html>'],
  ]) {
    const r = await callCanvas('canvas_file_content', { file_id: 5 }, 't', async u =>
      String(u).includes('/api/v1/files/5')
        ? Response.json({
            id: 5,
            display_name: name,
            'content-type': mime,
            size: body.length,
            url: `https://${H}/files/5/download?download_frd=1`,
          })
        : new Response(body),
    );
    assert.equal(r.text, null, name);
    assert.match(r.extraction_note, /Could not read the text of this file/, name);
    assert.match(r.extraction_note, /canvas_file_original/, name);
  }
});

test('a file download that times out says so', async () => {
  await fails(
    () =>
      callCanvas('canvas_file_content', { file_id: 5 }, 't', async u => {
        if (String(u).includes('/api/v1/files/5'))
          return Response.json({
            id: 5,
            display_name: 'a.txt',
            'content-type': 'text/plain',
            size: 3,
            url: `https://${H}/files/5/download?download_frd=1`,
          });
        throw new DOMException('timeout', 'TimeoutError');
      }),
    /did not finish \(no answer within 20 seconds/,
  );
});

test('a file without a download address says so', async () => {
  const r = await callCanvas('canvas_file_content', { file_id: 5 }, 't', async () =>
    Response.json({ id: 5, display_name: 'a.pdf', 'content-type': 'application/pdf', size: 3 }),
  );
  assert.equal(r.text, null);
  assert.match(r.extraction_note, /no download address/);
});

test('a Canvas rate limit says to wait, not that the course hides it (no find_files hint)', async () => {
  const limited = (status, headers, body) => async () =>
    new Response(body, { status, headers: { 'content-type': 'text/plain', ...headers } });
  // Canvas's own answer: 403 text "Rate Limit Exceeded"
  await fails(
    () =>
      callCanvas(
        'canvas_files',
        { context_type: 'course', context_id: 7 },
        't',
        limited(403, {}, '403 Forbidden (Rate Limit Exceeded)'),
      ),
    /^Canvas rate limit reached \(HTTP 403\)/,
    /Wait about a minute/,
  );
  // the header alone is enough, and the message has no "hidden for students" hint
  await assert.rejects(
    callCanvas(
      'canvas_file',
      { file_id: 1 },
      't',
      limited(403, { 'x-rate-limit-remaining': '0.0' }, '{}'),
    ),
    e => e.rateLimited && e.status === undefined && !/canvas_find_files/.test(e.message),
  );
  // a proxy's 429 with Retry-After
  await fails(
    () => callCanvas('canvas_courses', {}, 't', limited(429, { 'retry-after': '30' }, '')),
    /Wait 30 seconds/,
  );
  // an ordinary 403 is still a permission answer, with the hint
  await assert.rejects(
    callCanvas(
      'canvas_file',
      { file_id: 1 },
      't',
      async () =>
        new Response('{"status":"unauthorized"}', {
          status: 403,
          headers: { 'content-type': 'application/json', 'x-rate-limit-remaining': '600' },
        }),
    ),
    e => e.status === 403 && /canvas_find_files/.test(e.message),
  );
});
