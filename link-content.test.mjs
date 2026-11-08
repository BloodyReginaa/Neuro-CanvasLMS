import test from 'node:test';
import assert from 'node:assert/strict';
import { CANVAS_HOST as H } from './config.mjs';
import { linkContent, linkContentTool, fileLinksIn } from './link-content.mjs';

const DOC = 'https://docs.google.com/document/d/1ana8n8DruRVlMmbIc-PYS_PYiwseN8o6SFwEYiVr9es/edit';
const BOX = 'https://www.dropbox.com/scl/fi/abc/MATH-235-Syllabus.pdf?rlkey=k&dl=0';
// A course whose syllabus links a Google Doc and names a Dropbox PDF as plain text.
const canvas = (body = {}) => {
  const seen = [];
  const f = async (u, o) => {
    const url = new URL(u);
    assert.equal(url.hostname, H);
    assert.equal(new Headers(o?.headers).get('Authorization'), 'Bearer t');
    seen.push(url.pathname);
    if (url.pathname === '/api/v1/courses/1')
      return Response.json({
        id: 1,
        syllabus_body: `<p>Schedule: <a href="${DOC.replace('/edit', '/edit?usp=sharing')}">course calendar</a></p>
          <p>Full syllabus: ${BOX.replace('&', '&amp;')}.</p><p><a href="https://piazza.com/x">Piazza</a></p>`,
        ...body,
      });
    if (url.pathname === '/api/v1/courses/1/assignments/9')
      return Response.json({ id: 9, name: 'HW 9', description: `<a href="${BOX}">pdf</a>` });
    return new Response('{}', { status: 404 });
  };
  f.seen = seen;
  return f;
};
const web = routes => ({
  resolve: async () => {},
  fetcher: async (u, o) => {
    assert.equal(new Headers(o.headers).has('Authorization'), false); // never Canvas credentials
    const r = routes[u];
    if (!r) throw new Error('unexpected request ' + u);
    return typeof r === 'function' ? r() : r;
  },
});
const docText = {
  'https://docs.google.com/document/d/1ana8n8DruRVlMmbIc-PYS_PYiwseN8o6SFwEYiVr9es/export?format=txt':
    () =>
      new Response('Midterm 2: Thu Nov 20, in class', {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }),
};

test('a Google Doc linked in the syllabus is read as text, with where it was linked', async () => {
  const r = await linkContent(
    { course_id: 1, source: 'syllabus', url: DOC + '?usp=sharing' },
    't',
    canvas(),
    web(docText),
  );
  assert.equal(r.text, 'Midterm 2: Thu Nov 20, in class');
  assert.deepEqual(r.linked_from, { source: 'syllabus' });
  assert.match(r.extraction_note, /Google Docs exported as plain text.*Opening the link gives/);
});

test('an address written as plain text in the syllabus counts as a link', () => {
  const links = fileLinksIn(
    `<p>Full syllabus: ${BOX.replace('&', '&amp;')}.</p><a href="https://piazza.com/x">x</a>`,
    1,
  );
  assert.deepEqual([...links.keys()], [BOX]);
});

test('a link that is not in that Canvas content is refused before anything is downloaded', async () => {
  const none = web({});
  for (const url of [
    'https://docs.google.com/document/d/someoneElsesDocument12345/edit',
    'https://evil.example.com/steal.pdf',
    'https://piazza.com/x', // in the syllabus, but not a file link
  ])
    await assert.rejects(
      linkContent({ course_id: 1, source: 'syllabus', url }, 't', canvas(), none),
      e => e.message.startsWith('Canvas file: this link is not in that syllabus'),
    );
  // The error lists the links that are there.
  await assert.rejects(
    linkContent(
      { course_id: 1, source: 'syllabus', url: 'https://x.example/a.pdf' },
      't',
      canvas(),
      none,
    ),
    e => e.message.includes(BOX) && e.message.includes('docs.google.com'),
  );
});

test('a link in an assignment is checked against that assignment', async () => {
  const f = canvas();
  await assert.rejects(
    linkContent({ course_id: 1, source: 'assignment', url: BOX }, 't', f, web({})),
    /Missing source_id/,
  );
  await assert.rejects(
    linkContent(
      { course_id: 1, source: 'assignment', source_id: 'abc', url: BOX },
      't',
      f,
      web({}),
    ),
    /Invalid source_id/,
  );
  const pdf = Buffer.from('%PDF-1.4\n%%EOF');
  const dl = 'https://www.dropbox.com/scl/fi/abc/MATH-235-Syllabus.pdf?rlkey=k&dl=1';
  const r = await linkContent(
    { course_id: 1, source: 'assignment', source_id: '9', url: BOX },
    't',
    f,
    web({ [dl]: () => new Response(pdf, { headers: { 'content-type': 'application/pdf' } }) }),
  );
  assert.deepEqual(r.linked_from, { source: 'assignment', source_id: '9', title: 'HW 9' });
  assert.equal(r.link, BOX);
  assert.ok(f.seen.includes('/api/v1/courses/1/assignments/9'));
});

test('only the declared arguments are accepted', async () => {
  await assert.rejects(
    linkContent({ course_id: 1, source: 'syllabus', url: DOC, extra: 1 }, 't', canvas(), web({})),
    /Unexpected argument/,
  );
  await assert.rejects(
    linkContent({ course_id: 1, source: 'files', url: DOC }, 't', canvas(), web({})),
    /Invalid source/,
  );
  await assert.rejects(
    linkContent(
      { course_id: 1, source: 'syllabus', url: 'file:///etc/passwd' },
      't',
      canvas(),
      web({}),
    ),
    /Invalid url/,
  );
  assert.deepEqual(linkContentTool.inputSchema.required, ['course_id', 'source', 'url']);
  assert.equal(linkContentTool.annotations.readOnlyHint, true);
});
