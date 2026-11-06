import test from 'node:test';
import assert from 'node:assert/strict';
import { CANVAS_HOST as H } from './config.mjs';
import { findFiles, scanHtml, MAX_REQUESTS } from './find-files.mjs';
import { callCanvas } from './canvas.mjs';

// A course shaped like the real case: Files list 403, page list 404, files only linked from the
// front page, a "Slides" page, modules, an assignment and an announcement.
const denied = {
  status: 401,
  json: { errors: [{ message: 'user not authorized to perform that action' }] },
};
const course = {
  '/api/v1/courses/7/front_page': {
    json: {
      url: 'front-page',
      title: 'Front Page',
      body: `<a class="instructure_file_link" title="Prelim_Calendar.pdf" href="https://${H}/courses/7/files/100?verifier=x&amp;wrap=1" data-api-endpoint="https://${H}/api/v1/courses/7/files/100" data-api-returntype="File">PDF class calendar</a>
        <a title="Lecture Slides" href="https://${H}/courses/7/pages/slides" data-api-returntype="Page">Slides/Code</a>
        <a href="https://${H}/courses/8/pages/other">another course</a>
        <a href="https://evil.example.com/courses/7/files/999">not Canvas</a>
        <a href="https://www.dropbox.com/scl/fi/abc/hw1.zip?dl=0">HW1 starter</a>
        <a href="https://piazza.com/class/x">Piazza</a>`,
    },
  },
  '/api/v1/courses/7': {
    json: { syllabus_body: '<p><a href="/courses/7/files/101/download">Syllabus.pdf</a></p>' },
  },
  '/api/v1/courses/7/modules': {
    json: [
      {
        id: 1,
        name: 'Week 1',
        items: [
          { id: 11, type: 'File', content_id: 102, title: 'Lecture 1 - Intro.pptx' },
          {
            id: 12,
            type: 'ExternalUrl',
            title: 'Reading',
            external_url: 'https://www.dropbox.com/s/x/reading.pdf',
          },
          { id: 13, type: 'Page', page_url: 'week-1' },
        ],
      },
      { id: 2, name: 'Week 2' },
    ],
  },
  '/api/v1/courses/7/modules/2/items': {
    json: [{ id: 21, type: 'File', content_id: 103, title: 'Lecture 2.pdf' }],
  },
  '/api/v1/courses/7/assignments': {
    json: [
      {
        id: 31,
        name: 'HW 3',
        description:
          '<a class="instructure_file_link" title="hw3.zip" href="/courses/7/files/104?wrap=1">starter code</a>',
      },
    ],
  },
  '/api/v1/courses/7/discussion_topics': {
    json: [
      {
        id: 41,
        title: 'Exam info',
        message: '<a href="/files/105">Practice exam &amp; solutions.pdf</a>',
      },
    ],
  },
  '/api/v1/courses/7/pages': { status: 404, json: { errors: [{ message: 'not found' }] } },
  '/api/v1/courses/7/files': { status: 403, json: { errors: [{ message: 'forbidden' }] } },
  '/api/v1/courses/7/pages/slides': {
    json: {
      url: 'slides',
      title: 'Lecture Slides',
      body: `<a title="trees3.zip" href="/courses/7/files/106?wrap=1">Code</a>
        <a href="/courses/7/files/102">Lecture 1 - Intro.pptx</a>
        <a href="/courses/7/pages/front-page">Home</a>`,
    },
  },
  '/api/v1/courses/7/pages/week-1': denied,
};
const fakeCanvas =
  (routes, seen = []) =>
  async (u, opt) => {
    assert.equal(opt.method, 'GET');
    assert.equal(opt.redirect, 'manual');
    assert.equal(u.hostname, H);
    assert.equal(new Headers(opt.headers).get('Authorization'), 'Bearer tok');
    seen.push(u);
    const r = routes[u.pathname] ?? { status: 404, json: { errors: [] } };
    return Response.json(r.json, { status: r.status ?? 200 });
  };
const byId = r => Object.fromEntries(r.files.map(f => [f.file_id, f]));

test('finds files through every entry point when the course hides Files and Pages', async () => {
  const seen = [];
  const r = await findFiles({ course_id: 7 }, 'tok', fakeCanvas(course, seen));
  const f = byId(r);
  assert.deepEqual(Object.keys(f).map(Number).sort(), [100, 101, 102, 103, 104, 105, 106]);
  assert.equal(f[100].name, 'Prelim_Calendar.pdf'); // the title attribute holds the file name
  assert.equal(f[100].link_text, 'PDF class calendar');
  assert.equal(f[101].name, 'Syllabus.pdf');
  assert.equal(f[105].name, 'Practice exam & solutions.pdf');
  assert.equal(f[106].name, 'trees3.zip');
  assert.deepEqual(f[106].found_in, [
    { type: 'page', title: 'Lecture Slides', page_url: 'slides' },
  ]);
  assert.deepEqual(f[104].found_in, [{ type: 'assignment', title: 'HW 3', assignment_id: 31 }]);
  assert.deepEqual(f[103].found_in, [
    { type: 'module', module: 'Week 2', module_id: 2, item_id: 21 },
  ]);
  assert.equal(f[102].found_in.length, 2); // module item and the slides page
  // Never another course, never another host, never the front page twice.
  const paths = seen.map(u => u.pathname);
  assert.ok(!paths.some(p => p.includes('/courses/8/')));
  assert.ok(!paths.includes('/api/v1/courses/7/pages/front-page'));
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.length <= MAX_REQUESTS);
  // External links are listed, never fetched; module ones say how to read them.
  const reading = r.external_links.find(x => x.url.includes('reading.pdf'));
  assert.deepEqual(reading.read_with, {
    tool: 'canvas_module_file_content',
    course_id: 7,
    module_id: 1,
    item_id: 12,
  });
  assert.ok(r.external_links.some(x => x.url.includes('hw1.zip') && !x.read_with));
  assert.ok(!r.external_links.some(x => x.url.includes('piazza')));
  assert.match(r.searched.course_files, /HTTP 403/);
  assert.match(r.searched.page_list, /HTTP 404/);
  assert.equal(r.searched.linked_pages, '1 read, 1 not available');
  assert.equal(r.complete, true);
  assert.match(r.how_to_read, /canvas_file_content/);
});

test('query matches file names first, then where the file is linked', async () => {
  const find = async query => findFiles({ course_id: 7, query }, 'tok', fakeCanvas(course));
  assert.deepEqual(
    (await find('trees3')).files.map(f => f.file_id),
    [106],
  );
  assert.deepEqual(
    (await find('trees3.zip')).files.map(f => f.file_id),
    [106],
  );
  assert.deepEqual(
    (await find('Lecture 2')).files.map(f => f.file_id),
    [103],
  );
  assert.deepEqual(
    (await find('lecture2')).files.map(f => f.file_id),
    [103],
  );
  assert.deepEqual(
    (await find('calendar')).files.map(f => f.file_id),
    [100],
  );
  const slides = await find('slides');
  assert.equal(slides.matched_on, 'where the file is linked');
  assert.deepEqual(slides.files.map(f => f.file_id).sort(), [102, 106]);
  assert.deepEqual((await find('nothing like this')).files, []);
  assert.deepEqual(
    (await find('reading')).external_links.map(x => x.title),
    ['Reading'],
  );
});

test('a visible Files list is searched with the longest query word', async () => {
  const seen = [];
  const routes = {
    ...course,
    '/api/v1/courses/7/files': {
      json: [{ id: 200, display_name: 'Lecture 12 - Graphs.pdf', folder_id: 5 }],
    },
  };
  const r = await findFiles({ course_id: 7, query: 'lecture 12' }, 'tok', fakeCanvas(routes, seen));
  assert.equal(
    seen.find(u => u.pathname === '/api/v1/courses/7/files').searchParams.get('search_term'),
    'lecture',
  );
  assert.deepEqual(
    r.files.map(f => f.file_id),
    [200],
  );
  assert.deepEqual(r.files[0].found_in, [{ type: 'course_files', folder_id: 5 }]);
});

test('an expired token stops the search with the reconnect message', async () => {
  const expired = { status: 401, json: { errors: [{ message: 'Invalid access token.' }] } };
  await assert.rejects(
    findFiles({ course_id: 7 }, 'tok', fakeCanvas({ ...course, '/api/v1/courses/7': expired })),
    /authorization expired/,
  );
});

test('the search stops at the request budget and says so', async () => {
  const chain = {
    '/api/v1/courses/7/front_page': {
      json: { url: 'p0', body: '<a href="/courses/7/pages/p1">next</a>' },
    },
  };
  for (let i = 1; i < 100; i++)
    chain[`/api/v1/courses/7/pages/p${i}`] = {
      json: {
        url: `p${i}`,
        body: `<a href="/courses/7/files/${1000 + i}">f${i}.pdf</a><a href="/courses/7/pages/p${i + 1}">next</a>`,
      },
    };
  const seen = [];
  const r = await findFiles({ course_id: 7 }, 'tok', fakeCanvas(chain, seen));
  assert.equal(seen.length, MAX_REQUESTS);
  assert.equal(r.complete, false);
  assert.match(r.note, /not searched/);
});

test('only a course_id and a short query are accepted', async () => {
  const f = fakeCanvas(course);
  await assert.rejects(
    findFiles({ course_id: 7, url: 'https://evil.test' }, 'tok', f),
    /Unexpected argument/,
  );
  await assert.rejects(findFiles({ course_id: '../7' }, 'tok', f), /Invalid course_id/);
  await assert.rejects(
    findFiles({ course_id: 7, query: 'x'.repeat(101) }, 'tok', f),
    /Invalid query/,
  );
  await assert.rejects(findFiles({ course_id: 7, query: '   ' }, 'tok', f), /Invalid query/);
});

test('HTML scanning: entities, relative links, API endpoints, other hosts', () => {
  const r = scanHtml(
    `<a href='/courses/7/files/5/download?wrap=1'>A &amp; B.pdf</a>
     <a data-api-endpoint="https://${H}/api/v1/courses/7/files/6" href="#">six</a>
     <a href="/users/1/files/7">seven.txt</a>
     <a href="http://${H}/courses/7/files/8">plain http is not Canvas</a>
     <a href="/courses/7/pages/a%20b">page</a>
     <a href="https://drive.google.com/file/d/x/view">notes</a>`,
    7,
  );
  assert.deepEqual(
    r.files.map(f => [f.file_id, f.name]),
    [
      [5, 'A & B.pdf'],
      [6, 'six'],
      [7, 'seven.txt'],
    ],
  );
  assert.deepEqual(r.pages, ['a b']);
  assert.deepEqual(
    r.external.map(x => x.title),
    ['notes'],
  );
});

test('denied listings tell the AI to try canvas_find_files instead of giving up', async () => {
  const deny = status => async () => Response.json({ errors: [] }, { status });
  for (const status of [401, 403, 404])
    await assert.rejects(
      callCanvas('canvas_files', { context_type: 'course', context_id: 7 }, 't', deny(status)),
      e => e.message.includes(`HTTP ${status}`) && e.message.includes('canvas_find_files'),
    );
  await assert.rejects(
    callCanvas('canvas_pages', { context_type: 'course', context_id: 7 }, 't', deny(404)),
    e => e.message.includes('page_url') && e.message.includes('canvas_find_files'),
  );
  await assert.rejects(
    callCanvas('canvas_profile', {}, 't', deny(403)),
    e => !e.message.includes('canvas_find_files'),
  );
  const expired = async () =>
    Response.json({ errors: [{ message: 'Invalid access token.' }] }, { status: 401 });
  await assert.rejects(
    callCanvas('canvas_files', { context_type: 'course', context_id: 7 }, 't', expired),
    e => e.message === 'Canvas authorization expired; reconnect.',
  );
});

test('numbers match whole numbers only; school.instructure.com links count as this Canvas', async () => {
  const routes = {
    '/api/v1/courses/7/front_page': {
      json: {
        url: 'front-page',
        body: `<a href="/courses/7/files/1">Lecture 5.pdf</a>
          <a href="/courses/7/files/2">Lecture 15.pdf</a>
          <a href="/courses/7/files/3">2025 schedule.pdf</a>
          <a href="/courses/7/files/4">hw5.zip</a>
          <a href="https://school.instructure.com/courses/7/files/5">Lecture 5 notes.pdf</a>
          <a href="https://school.instructure.com/courses/7/pages/extra">Extra</a>`,
      },
    },
    '/api/v1/courses/7/pages/extra': {
      json: { url: 'extra', body: '<a href="/courses/7/files/6">Lecture 5 code.zip</a>' },
    },
  };
  const ids = async query =>
    (await findFiles({ course_id: 7, query }, 'tok', fakeCanvas(routes))).files
      .map(f => f.file_id)
      .sort();
  assert.deepEqual(await ids('lecture 5'), [1, 5, 6]);
  assert.deepEqual(await ids('lecture5'), [1, 5, 6]);
  assert.deepEqual(await ids('5'), [1, 4, 5, 6]);
  assert.deepEqual(await ids('15'), [2]);
  assert.deepEqual(await ids('2025'), [3]);
});
