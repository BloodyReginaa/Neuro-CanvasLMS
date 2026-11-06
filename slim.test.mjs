import test from 'node:test';
import assert from 'node:assert/strict';
import { CANVAS_HOST as H } from './config.mjs';
import { slim, PREVIEW_BUDGET } from './slim.mjs';
import { callCanvas, endpoint, tools, withoutVerifiers } from './canvas.mjs';
import { localTime, dayRange, isTimeZone } from './time.mjs';

const NY = 'America/New_York';
const DESC = `<p><span>This assignment is worth 100 points.</span></p>
<p>Please download the associated code for this programming assignment:</p>
<p>Starter Code: <a class="instructure_file_link inline_disabled" title="binary-trees-student.zip" href="https://${H}/courses/39037/files/19173789?wrap=1" target="_blank" data-api-endpoint="https://${H}/api/v1/courses/39037/files/19173789" data-api-returntype="File">binary-trees-student.zip</a></p>
<p>Note the due date! This course has a relatively generous late policy, but we follow it strictly – read the syllabus for details.</p>
<h2><span>Upload to Gradescope</span></h2>
<p>You must submit your solution to this programming assignment to Gradescope below. We&nbsp;<strong>do not</strong> accept programming assignments in any other fashion!</p>`;
// A real calendar entry for an assignment handed in on Gradescope (as /calendar_events returns it).
const assignment = (extra = {}) => ({
  id: 808948,
  position: 9,
  description: DESC,
  points_possible: 100,
  grading_type: 'points',
  created_at: '2026-06-05T17:44:35Z',
  updated_at: '2026-10-31T04:00:10Z',
  due_at: '2026-11-07T04:59:59Z',
  final_grader_id: null,
  grader_count: 0,
  graders_anonymous_to_graders: false,
  lock_at: null,
  unlock_at: '2026-10-31T03:59:59Z',
  peer_reviews: false,
  post_to_sis: false,
  allowed_attempts: -1,
  secure_params: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.FAKE-LTI-TOKEN.sig',
  lti_context_id: '72b84440-0eb5-429d-95ad-063589a8b6e0',
  course_id: 39037,
  name: 'PA9 Binary Trees',
  submission_types: ['external_tool'],
  has_submitted_submissions: false,
  external_tool_tag_attributes: {
    url: 'https://lti-gradescope.int.turnitin.com/launch/gs',
    new_tab: false,
    resource_link_id: '285f158092ca8c3480f3d3c0ef953291985d0bc2',
    custom_params: { tii_app_key: 'gs-proxy' },
  },
  muted: true,
  html_url: `https://${H}/courses/39037/assignments/808948`,
  url: null,
  published: true,
  submissions_download_url: `https://${H}/courses/39037/assignments/808948/submissions?zip=1`,
  ...extra,
});
const event = (extra = {}) => ({
  created_at: '2026-06-05T17:44:35Z',
  title: 'PA9 Binary Trees',
  all_day: true,
  all_day_date: '2026-11-06',
  workflow_state: 'published',
  submission_types: 'external_tool',
  description: DESC.replace('19173789', '18675848'),
  id: 'assignment_808948',
  type: 'assignment',
  assignment: assignment(),
  html_url: `https://${H}/courses/39037/assignments/808948`,
  context_code: 'course_39037',
  context_name: 'Data Structures CICS 210 (171644) FA26',
  context_color: null,
  end_at: '2026-11-07T04:59:59Z',
  start_at: '2026-11-07T04:59:59Z',
  url: `https://${H}/api/v1/calendar_events/assignment_808948`,
  important_dates: false,
  ...extra,
});
const page = data => ({ data, has_more: false, next_page: null, api_url: `https://${H}/api/v1/x` });
const now = new Date('2026-11-06T18:10:00Z');

test('times: local, with weekday and zone; whole local days for ranges', () => {
  assert.equal(localTime('2026-11-07T04:59:59Z', NY), 'Fri 2026-11-06 23:59 EST');
  assert.equal(localTime('2026-07-01T03:59:00Z', NY), 'Tue 2026-06-30 23:59 EDT');
  assert.equal(localTime('2026-11-07T04:59:59Z', 'Asia/Shanghai'), 'Sat 2026-11-07 12:59 GMT+8');
  assert.equal(isTimeZone('Mars/Olympus'), false);
  assert.equal(localTime('2026-11-07T04:59:59Z', 'Mars/Olympus'), '2026-11-07T04:59:59Z');
  // "today to today" is the whole day, so Friday's 23:59 deadline is in it
  assert.deepEqual(dayRange('2026-11-06', '2026-11-06', NY), {
    start_date: '2026-11-06T05:00:00Z',
    end_date: '2026-11-07T04:59:59Z',
  });
  // the day daylight saving time starts has 23 hours
  assert.deepEqual(dayRange('2026-03-08', '2026-03-08', NY), {
    start_date: '2026-03-08T05:00:00Z',
    end_date: '2026-03-09T03:59:59Z',
  });
  // zone unknown: the end moves a day on (Canvas reads plain dates in the user's zone)
  assert.deepEqual(dayRange('2026-11-06', '2026-11-06', undefined), {
    start_date: '2026-11-06',
    end_date: '2026-11-07',
  });
  assert.deepEqual(dayRange(undefined, undefined, NY), {});
  const u = endpoint(
    'canvas_planner',
    { start_date: '2026-11-06', end_date: '2026-11-06' },
    { timeZone: NY },
  );
  assert.equal(u.searchParams.get('start_date'), '2026-11-06T05:00:00Z');
  assert.equal(u.searchParams.get('end_date'), '2026-11-07T04:59:59Z');
  const notes = endpoint(
    'canvas_planner_notes',
    { start_date: '2026-11-06', end_date: '2026-11-06' },
    { timeZone: NY },
  );
  assert.equal(notes.searchParams.get('end_date'), '2026-11-07T04:59:59Z');
  // calendar_events already reads days inclusively in the user's zone: unchanged
  const cal = endpoint(
    'canvas_calendar_events',
    { start_date: '2026-11-06', end_date: '2026-11-06' },
    { timeZone: NY },
  );
  assert.equal(cal.searchParams.get('end_date'), '2026-11-06');
});

test('one calendar entry: text instead of HTML, one copy, no LTI internals, local times', () => {
  const raw = page([event()]);
  const before = JSON.stringify(raw).length;
  const r = slim('canvas_calendar_events', raw, { timeZone: NY, now });
  const out = JSON.stringify(r);
  const e = r.data[0];
  assert.ok(out.length < before * 0.6, `${out.length} vs ${before}`);
  for (const gone of [
    'secure_params',
    'FAKE-LTI-TOKEN',
    'lti_context_id',
    'external_tool_tag_attributes',
    '<p>',
    'submissions_download_url',
    'grader_count',
    '/api/v1/calendar_events',
  ])
    assert.ok(!out.includes(gone), gone);
  assert.match(e.description, /^This assignment is worth 100 points\./);
  assert.ok(
    e.description.includes(
      `[binary-trees-student.zip](https://${H}/courses/39037/files/18675848?wrap=1)`,
    ),
  );
  assert.ok(e.description.includes('## Upload to Gradescope'));
  assert.ok(e.description.includes('We **do not** accept'));
  assert.equal(e.assignment.description, undefined); // the event already has it
  assert.equal(e.end_at, 'Fri 2026-11-06 23:59 EST');
  assert.equal(e.assignment.due_at, 'Fri 2026-11-06 23:59 EST');
  assert.equal(e.all_day_date, '2026-11-06');
  assert.equal(e.all_day, true); // true is not the default: kept
  assert.equal(e.assignment.peer_reviews, undefined); // the default: left out
  assert.match(e.assignment.submission_note, /^Gradescope: handed in through this external tool/);
  assert.equal(e.assignment.lock_at, undefined);
  assert.equal(r.time_zone, NY);
  assert.equal(r.now, 'Fri 2026-11-06 13:10 EST');
  assert.equal(r.api_url, raw.api_url);
});

test('planner: relative links become absolute, submission state and empty due dates are kept', () => {
  const r = slim(
    'canvas_planner',
    page([
      {
        plannable_type: 'assignment',
        planner_override: null,
        new_activity: false,
        submissions: {
          submitted: false,
          excused: false,
          graded: false,
          late: false,
          missing: false,
          needs_grading: false,
          has_feedback: false,
          redo_request: false,
          posted_at: null,
        },
        plannable: { id: 1, title: 'Reading', due_at: null, points_possible: 0 },
        plannable_date: '2026-11-07T04:59:59Z',
        html_url: '/courses/39037/assignments/1',
        context_image: null,
      },
    ]),
    { timeZone: NY, now },
  );
  const item = r.data[0];
  assert.equal(item.html_url, `https://${H}/courses/39037/assignments/1`);
  assert.deepEqual(item.submissions, {
    submitted: false,
    graded: false,
    late: false,
    missing: false,
    needs_grading: false,
    has_feedback: false,
  });
  assert.equal(item.plannable.due_at, null);
  assert.equal(item.plannable.points_possible, 0);
  assert.equal('planner_override' in item, false);
});

test('lists shorten long descriptions under a budget and say where the full text is', () => {
  const long = '<p>' + 'Implement the binary tree iterator carefully. '.repeat(400) + '</p>';
  const items = Array.from({ length: 12 }, (_, i) =>
    assignment({ id: i + 1, description: long.replace('Implement', `Implement ${i}`) }),
  );
  const r = slim('canvas_assignments', page(items), { timeZone: NY, now });
  const total = r.data.reduce((n, a) => n + a.description.length, 0);
  assert.ok(total < PREVIEW_BUDGET * 1.2, String(total));
  assert.match(
    r.data[0].description,
    /… \[shortened, \d+ more characters; full text: canvas_assignment\]$/,
  );
  // a short list comes back whole; one huge description alone is cut to the budget
  const medium = '<p>' + 'Read chapter four before lab. '.repeat(70) + '</p>';
  const three = slim(
    'canvas_assignments',
    page(
      [1, 2, 3].map(id => assignment({ id, description: medium.replace('Read', 'Read ' + id) })),
    ),
    { timeZone: NY },
  );
  assert.ok(three.data.every(a => !a.description.includes('[shortened')));
  const one = slim('canvas_assignments', page([assignment({ description: long })]), {
    timeZone: NY,
  });
  assert.ok(one.data[0].description.length < PREVIEW_BUDGET + 200);
  // the single-item tool has the full text
  const full = slim(
    'canvas_assignment',
    { ...page(null), data: assignment({ description: long }) },
    { timeZone: NY },
  );
  assert.ok(full.data.description.length > 15000);
});

test('a repeated long text is written once; New Quizzes and paper assignments get the right note', () => {
  const text = '<p>' + 'Discuss the reading in at least 300 words. '.repeat(20) + '</p>';
  const r = slim(
    'canvas_upcoming_events',
    page([
      event({
        description: text,
        assignment: assignment({
          description: text,
          discussion_topic: { message: text, title: 'Week 9' },
        }),
      }),
      { id: 2, title: 'Office hours', description: text },
    ]),
    { timeZone: NY },
  );
  const out = JSON.stringify(r);
  assert.equal(out.split('Discuss the reading').length - 1, 20); // one copy (20 sentences)
  assert.equal(r.data[1].description, '[same text as data[0].description]');
  const quiz = slim('canvas_assignment', {
    ...page(null),
    data: assignment({
      external_tool_tag_attributes: {
        url: `https://school.quiz-lti-iad-prod.instructure.com/lti/launch`,
      },
    }),
  });
  assert.equal(quiz.data.submission_note, undefined);
  const paper = slim('canvas_assignment', {
    ...page(null),
    data: assignment({ submission_types: ['on_paper'] }),
  });
  assert.match(paper.data.submission_note, /on paper/);
  const online = slim('canvas_assignment', {
    ...page(null),
    data: assignment({ submission_types: ['online_upload'] }),
  });
  assert.equal(online.data.submission_note, undefined);
});

test('raw: true returns Canvas JSON unchanged; it is accepted by every tool but file_content', async () => {
  const body = [event()];
  const fetcher = async () => Response.json(body);
  const args = {
    start_date: '2026-11-06',
    end_date: '2026-11-06',
    type: 'assignment',
    context_codes: ['course_39037'],
  };
  const raw = await callCanvas('canvas_calendar_events', { ...args, raw: true }, 't', fetcher, {
    timeZone: NY,
  });
  assert.deepEqual(raw.data, body);
  const compact = await callCanvas('canvas_calendar_events', args, 't', fetcher, { timeZone: NY });
  assert.equal(compact.data[0].end_at, 'Fri 2026-11-06 23:59 EST');
  for (const t of tools)
    assert.equal(Boolean(t.inputSchema.properties.raw), t.name !== 'canvas_file_content', t.name);
  assert.throws(() => endpoint('canvas_todo', { raw: 'yes' }), /Invalid raw/);
  // raw never reaches Canvas
  assert.equal(endpoint('canvas_todo', { raw: true }).searchParams.has('raw'), false);
});

test('an empty calendar answer says why and points to the planner', async () => {
  const empty = async () => Response.json([]);
  const r = await callCanvas(
    'canvas_calendar_events',
    { start_date: '2026-11-06', end_date: '2026-11-06' },
    't',
    empty,
    { timeZone: NY },
  );
  assert.match(r.note, /personal calendar/);
  assert.match(r.note, /context_codes/);
  assert.match(r.note, /type "assignment"/);
  assert.match(r.note, /canvas_planner/);
  const courses = await callCanvas(
    'canvas_calendar_events',
    {
      start_date: '2026-11-06',
      end_date: '2026-11-06',
      type: 'assignment',
      context_codes: ['course_1'],
    },
    't',
    empty,
  );
  assert.ok(!/context_codes|type "assignment"/.test(courses.note));
});

test('Inbox messages stay plain text; private feed links and verifier passes never reach the AI', () => {
  const msg = slim('canvas_conversation', {
    ...page(null),
    data: { messages: [{ body: 'Use <p> tags in HW 2' }] },
  });
  assert.equal(msg.data.messages[0].body, 'Use <p> tags in HW 2');
  const profile = slim('canvas_profile', {
    ...page(null),
    data: {
      id: 7,
      name: 'A',
      calendar: { ics: `https://${H}/feeds/calendars/user_SECRET.ics` },
      time_zone: NY,
    },
  });
  assert.ok(!JSON.stringify(profile).includes('SECRET'));
  assert.equal(profile.data.id, 7);
  const rawProfile = withoutVerifiers({
    calendar: { ics: `https://${H}/feeds/calendars/user_SECRET.ics` },
  });
  assert.ok(!JSON.stringify(rawProfile).includes('SECRET'));
  // a verifier inside a markdown link (text made from HTML) is removed without eating the ")"
  assert.equal(
    withoutVerifiers(`[a.pdf](https://${H}/courses/1/files/5?verifier=abc) next`),
    `[a.pdf](https://${H}/courses/1/files/5) next`,
  );
});
