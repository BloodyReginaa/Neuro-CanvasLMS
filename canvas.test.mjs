import { CANVAS_HOST as H } from './config.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { endpoint, callCanvas, tools, nextPage } from './canvas.mjs';
test('every tool is explicitly read only', () =>
  assert.ok(tools.every(t => t.annotations.readOnlyHint && !t.annotations.destructiveHint)));
test('rejects arbitrary URLs and invalid course IDs', () => {
  assert.throws(() => endpoint('canvas_assignments', { course_id: '../../users' }));
  assert.throws(() => endpoint('canvas_profile', { url: 'https://evil.test' }));
  assert.throws(() => endpoint('delete_course', {}));
});
test('all Canvas requests use GET and refuse redirects', async () => {
  let seen;
  await callCanvas('canvas_assignments', { course_id: 123 }, 'test-token', async (u, opt) => {
    seen = { u, opt };
    return new Response('[]', {
      headers: { link: `<https://${H}/api/v1/courses/123/assignments?page=2>; rel="next"` },
    });
  });
  assert.equal(seen.opt.method, 'GET');
  assert.equal(seen.opt.redirect, 'manual');
  assert.equal(seen.u.origin, `https://${H}`);
  assert.equal(seen.u.searchParams.get('include[]'), 'submission');
});
test('errors never reflect upstream token or response body', async () => {
  await assert.rejects(
    callCanvas('canvas_profile', {}, 'secret', async () => new Response('secret', { status: 401 })),
    e => !e.message.includes('secret'),
  );
});
test('encodes course-page slugs as a single path component', () =>
  assert.ok(
    endpoint('canvas_page', { course_id: 1, page_url: '../../evil?token=x' }).pathname.includes(
      '%2F',
    ),
  ));
test('pagination is exposed explicitly', async () => {
  const r = await callCanvas(
    'canvas_courses',
    {},
    'test',
    async () =>
      new Response('[]', { headers: { link: `<https://${H}/api/v1/courses?page=2>; rel="next"` } }),
  );
  assert.equal(r.has_more, true);
  assert.equal(r.next_page, 2);
});

test('redirects are rejected without forwarding credentials', async () => {
  await assert.rejects(
    callCanvas(
      'canvas_profile',
      {},
      'secret',
      async () => new Response(null, { status: 302, headers: { location: 'https://evil.test' } }),
    ),
    /HTTP 302/,
  );
});

test('new tools reject privilege-expanding and state-changing arguments', () => {
  for (const [name, args] of [
    ['canvas_conversation', { conversation_id: 1, auto_mark_as_read: true }],
    ['canvas_submission', { course_id: 1, assignment_id: 1, user_id: 999 }],
    ['canvas_files', { context_type: 'account', context_id: 1 }],
    [
      'canvas_calendar_events',
      { start_date: '2026-09-01', end_date: '2026-09-30', context_codes: ['../../admin'] },
    ],
    ['canvas_file_content', { file_id: 1, url: 'https://evil.test' }],
  ])
    assert.throws(() => endpoint(name, args));
  assert.throws(() => endpoint('canvas_files', { context_type: 'course' }));
});
test('messages and feedback reads do not request read-state changes', () => {
  assert.equal(
    endpoint('canvas_conversation', { conversation_id: 1 }).searchParams.get('auto_mark_as_read'),
    'false',
  );
  const submission = endpoint('canvas_submission', { course_id: 1, assignment_id: 2 });
  assert.ok(submission.pathname.endsWith('/submissions/self'));
  assert.ok(!submission.searchParams.getAll('include[]').includes('read_status'));
  assert.deepEqual(
    endpoint('canvas_course_submissions', { course_id: 1 }).searchParams.getAll('student_ids[]'),
    ['self'],
  );
});
test('every registered tool routes only to approved Canvas GET endpoints', async () => {
  assert.equal(new Set(tools.map(t => t.name)).size, tools.length);
  for (const t of tools) {
    const args = {};
    for (const key of t.inputSchema.required) {
      const p = t.inputSchema.properties[key];
      args[key] =
        p.type === 'integer' ? 1 : p.enum ? p.enum[0] : p.pattern ? '2026-09-27' : 'example';
    }
    if (args.context_type && args.context_type !== 'user') args.context_id = 1;
    let calls = 0;
    await callCanvas(t.name, args, 'secret', async (u, options) => {
      calls++;
      assert.equal(u.origin, `https://${H}`);
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'manual');
      assert.ok(!u.pathname.includes('undefined'));
      return new Response(t.name === 'canvas_file_content' ? '{}' : '[]');
    });
    assert.equal(calls, 1, t.name);
  }
});
import { allowedDownload, extractBytes, readFileContent } from './file-content.mjs';
import { zipSync, strToU8 } from 'fflate';
test('download allowlist rejects credentials, private hosts and suffix tricks', () => {
  for (const url of [
    `http://${H}/x`,
    'https://127.0.0.1/x',
    'https://instructure.com.evil.test/x',
    `https://user:pass@${H}/x`,
    'https://evil.test/a',
  ])
    assert.equal(allowedDownload(url), false);
  assert.equal(allowedDownload(`https://${H}/files/1/download`), true);
  assert.equal(allowedDownload('https://files.inscloudgate.net/file'), true);
  assert.equal(allowedDownload('https://files.inscloudgate.net.evil.test/file'), false);
});
test('file download never forwards the Canvas token and paginates text', async () => {
  const result = await callCanvas(
    'canvas_file_content',
    { file_id: 1, offset: 3, max_chars: 1000 },
    'sensitive-token',
    async (u, opt) => {
      if (String(u).includes('/api/v1/'))
        return Response.json({
          id: 1,
          filename: 'test.txt',
          'content-type': 'text/plain',
          url: `https://${H}/files/1/download`,
        });
      assert.equal(opt.headers.Authorization, undefined);
      assert.equal(opt.method, 'GET');
      return new Response('abcdefgh');
    },
  );
  assert.equal(result.text, 'defgh');
  assert.equal(result.has_more, false);
});
test('locked and oversized files are not downloaded; redirect SSRF is rejected', async () => {
  let requests = 0;
  const fetcher = async () => {
    requests++;
    return new Response(null, { status: 302, headers: { location: 'https://evil.test' } });
  };
  await assert.rejects(readFileContent({ locked_for_user: true }, {}, fetcher), /locked/);
  await readFileContent({ url: `https://${H}/files/1`, size: 16000000 }, {}, fetcher);
  assert.equal(requests, 0);
  await assert.rejects(
    readFileContent({ url: `https://${H}/files/1` }, {}, fetcher),
    /not allowed/,
  );
  assert.equal(requests, 1);
});
test('Office documents extract only content XML and do not execute embedded code', async () => {
  const bytes = zipSync({
    'word/document.xml': strToU8('<w:p><w:t>Hello &amp; Canvas</w:t></w:p>'),
    'evil.js': strToU8('throw new Error("bad")'),
  });
  const result = await extractBytes(bytes, 'test.docx', 'application/zip');
  assert.match(result.text, /Hello & Canvas/);
  assert.ok(!result.text.includes('throw'));
});
test('PDF extraction reads a real text layer and reports its limitations', async () => {
  const content = 'BT /F1 12 Tf 72 720 Td (Canvas read-only PDF test) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf +=
    `xref\n0 6\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map(n => String(n).padStart(10, '0') + ' 00000 n \n')
      .join('') +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const r = await extractBytes(new TextEncoder().encode(pdf), 'test.pdf', 'application/pdf');
  assert.match(r.text, /Canvas read-only PDF test/);
  assert.equal(r.total_pages, 1);
  assert.match(r.extraction_note, /not OCRed/);
});

test('HTML 406 / 5xx pages are reported plainly and never echo the body', async () => {
  for (const status of [406, 500, 503]) {
    await assert.rejects(
      callCanvas(
        'canvas_courses',
        {},
        'private-token',
        async () =>
          new Response('<h1>Not Acceptable</h1>private-token private course details', {
            status,
            headers: { 'content-type': 'text/html' },
          }),
      ),
      e =>
        e.message.includes(`HTTP ${status}`) &&
        e.message.includes('HTML error page') &&
        !e.message.includes('private-token') &&
        !e.message.includes('private course details'),
    );
  }
  // A JSON 5xx from Canvas itself keeps the ordinary error path.
  await assert.rejects(
    callCanvas('canvas_courses', {}, 't', async () =>
      Response.json({ errors: [] }, { status: 502 }),
    ),
    /Canvas returned HTTP 502/,
  );
});
test('pagination follows Canvas bookmarks instead of guessing page+1', async () => {
  const bm = 'bookmark:WyIyMDI2LTExLTA1IiwxMjM0XQ';
  const r = await callCanvas(
    'canvas_planner',
    { start_date: '2026-11-01', end_date: '2026-11-30' },
    't',
    async () =>
      new Response('[]', {
        headers: {
          link: `<https://${H}/api/v1/planner/items?page=first>; rel="first", <https://${H}/api/v1/planner/items?page=${bm}&per_page=50>; rel="next"`,
        },
      }),
  );
  assert.equal(r.next_page, bm);
  let asked;
  await callCanvas(
    'canvas_planner',
    { start_date: '2026-11-01', end_date: '2026-11-30', page: bm },
    't',
    async u => {
      asked = u.searchParams.get('page');
      return new Response('[]');
    },
  );
  assert.equal(asked, bm);
  assert.equal(endpoint('canvas_courses', { page: 3 }).searchParams.get('page'), '3');
  assert.equal(endpoint('canvas_courses', { page: '3' }).searchParams.get('page'), '3');
  for (const bad of [0, '0', 'bookmark:../../x', 'javascript:1', 10001])
    assert.throws(() => endpoint('canvas_courses', { page: bad }), String(bad));
  assert.equal(nextPage(null), null);
  assert.equal(nextPage(`<https://${H}/x?page=2>; rel="current"`), null);
});
test('401 "not authorized for this item" is not reported as an expired token', async () => {
  const denied = async () =>
    Response.json(
      {
        status: 'unauthorized',
        errors: [{ message: 'user not authorized to perform that action' }],
      },
      { status: 401 },
    );
  await assert.rejects(
    callCanvas('canvas_profile', {}, 't', denied),
    /denied access.*connection itself is fine/,
  );
  const expired = async () =>
    Response.json(
      { errors: [{ message: 'Invalid access token.' }] },
      { status: 401, headers: { 'www-authenticate': 'Bearer realm="canvas-lms"' } },
    );
  await assert.rejects(callCanvas('canvas_profile', {}, 't', expired), /authorization expired/);
});
test('argument errors name the offending argument without echoing values', () => {
  assert.throws(
    () => endpoint('canvas_courses', { bogus_arg: 1 }),
    /Unexpected argument: bogus_arg/,
  );
  assert.throws(() => endpoint('canvas_assignments', {}), /Missing argument: course_id/);
  assert.throws(
    () => endpoint('canvas_assignments', { course_id: '<script>' }),
    /^Error: Invalid course_id$/,
  );
});
