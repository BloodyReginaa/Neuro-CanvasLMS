// Tool catalogue and the Canvas API client.
// Every tool maps to ONE fixed read-only GET route on the configured Canvas host. Arguments are
// validated against each tool's JSON schema before a URL is built, so the AI can never choose the
// host, the path or extra query parameters. Extra tools are declared in read-tools.mjs.
import { extraSpecs } from './read-tools.mjs';
import { readFileContent } from './file-content.mjs';
import { CANVAS_HOST } from './config.mjs';
import { slim } from './slim.mjs';
import { dayRange } from './time.mjs';
export const origin = () => 'https://' + CANVAS_HOST;
const id = { type: 'integer', minimum: 1 };
// Canvas pages are numbers on most endpoints but opaque bookmarks on others (e.g. planner).
const page = {
  type: 'string',
  pattern: '^(?:[1-9][0-9]{0,3}|bookmark:[A-Za-z0-9_=-]{1,1000})$',
  maxLength: 1010,
  description: 'Page to fetch: a number, or the next_page value returned by the previous call.',
};
// Results are compacted for the AI (slim.mjs); raw: true returns Canvas's JSON as Canvas sent it.
const raw = { type: 'boolean', description: "true: Canvas's unmodified JSON (UTC times, HTML)." };
const def = (name, description, properties = {}, required = []) => ({
  name,
  description,
  inputSchema: {
    type: 'object',
    properties: name === 'canvas_file_content' ? properties : { ...properties, raw },
    required,
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
});
export const tools = [
  def(
    'canvas_profile',
    "Read the connected Canvas profile (your Canvas account). For this connector's own version use canvas_connector_version.",
  ),
  def(
    'canvas_courses',
    'List enrolled courses; use returned course IDs. Current courses by default; enrollment_state "completed" lists past (concluded) courses, "invited_or_pending" lists course invitations.',
    {
      enrollment_state: {
        type: 'string',
        enum: ['active', 'completed', 'invited_or_pending'],
        description:
          'Which courses: active (default, current), completed (past) or invited_or_pending.',
      },
      page,
    },
  ),
  def(
    'canvas_assignments',
    'List course assignments with dates and your submission status. Long descriptions are shortened in this list; canvas_assignment has the full text. Results are paginated.',
    { course_id: id, page },
    ['course_id'],
  ),
  def(
    'canvas_assignment',
    'Read one assignment in full: description, rubric, dates and your submission status.',
    { course_id: id, assignment_id: id },
    ['course_id', 'assignment_id'],
  ),
  def(
    'canvas_announcements',
    'List course announcements. Long messages are shortened in this list; canvas_discussion reads one in full.',
    { course_id: id, page },
    ['course_id'],
  ),
  def('canvas_modules', 'List course modules.', { course_id: id, page }, ['course_id']),
  def(
    'canvas_module_items',
    'List the contents of a course module.',
    { course_id: id, module_id: id, page },
    ['course_id', 'module_id'],
  ),
  def(
    'canvas_page',
    'Read a course page by page_url from a module item.',
    { course_id: id, page_url: { type: 'string', minLength: 1, maxLength: 250 } },
    ['course_id', 'page_url'],
  ),
  def(
    'canvas_planner',
    'Everything due across all your courses in a date range: assignments, quizzes, graded discussions and to-do notes, each with its submission state (submitted, late, missing, graded, feedback). The best tool for "what is due today / this week". start_date and end_date are days (YYYY-MM-DD) in your Canvas time zone, both included: for one day pass the same date twice.',
    {
      start_date: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'First day, included.',
      },
      end_date: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Last day, included.',
      },
      page,
    },
    ['start_date', 'end_date'],
  ),
];
for (const s of extraSpecs)
  tools.push(def(s.name, s.description, { ...s.properties, page }, s.required));
function validate(p, v, k) {
  if (
    p.type === 'integer' &&
    (!Number.isSafeInteger(v) || v < p.minimum || v > (p.maximum ?? Number.MAX_SAFE_INTEGER))
  )
    throw new Error('Invalid ' + k);
  if (
    p.type === 'string' &&
    (typeof v !== 'string' ||
      v.length > (p.maxLength ?? 100) ||
      v.length < (p.minLength ?? 0) ||
      (p.pattern && !new RegExp(p.pattern).test(v)) ||
      (p.enum && !p.enum.includes(v)))
  )
    throw new Error('Invalid ' + k);
  if (p.type === 'boolean' && typeof v !== 'boolean') throw new Error('Invalid ' + k);
  if (p.type === 'array') {
    if (!Array.isArray(v) || v.length < p.minItems || v.length > p.maxItems)
      throw new Error('Invalid ' + k);
    for (const x of v) validate(p.items, x, k);
  }
}
// opts.timeZone: the user's Canvas time zone, so day ranges cover whole local days.
export function endpoint(name, args = {}, opts = {}) {
  const tool = tools.find(t => t.name === name);
  if (!tool) throw new Error('Unknown tool');
  const schema = tool.inputSchema;
  for (const k of Object.keys(args))
    if (!schema.properties[k])
      throw new Error(
        'Unexpected argument: ' +
          String(k)
            .slice(0, 40)
            .replace(/[^\w-]/g, '?'),
      );
  for (const k of schema.required)
    if (args[k] === undefined) throw new Error('Missing argument: ' + k);
  for (const [k, v] of Object.entries(args))
    validate(schema.properties[k], k === 'page' && Number.isSafeInteger(v) ? String(v) : v, k);
  const extra = extraSpecs.find(s => s.name === name);
  if (extra) {
    if (
      ['canvas_files', 'canvas_folders'].includes(name) &&
      args.context_type !== 'user' &&
      !args.context_id
    )
      throw new Error('Missing context_id');
    const path = typeof extra.route === 'function' ? extra.route(args) : extra.route;
    const u = new URL('/api/v1' + path, origin());
    const query = typeof extra.query === 'function' ? extra.query(args, opts) : extra.query;
    for (const [key, value] of Object.entries(query))
      if (value !== undefined)
        for (const x of Array.isArray(value) ? value : [value])
          u.searchParams.append(key, String(x));
    u.searchParams.set('per_page', '50');
    u.searchParams.set('page', String(args.page ?? 1));
    return u;
  }
  const c = args.course_id,
    a = args.assignment_id,
    m = args.module_id;
  const routes = {
    canvas_profile: '/users/self/profile',
    canvas_courses: '/courses',
    canvas_assignments: `/courses/${c}/assignments`,
    canvas_assignment: `/courses/${c}/assignments/${a}`,
    canvas_announcements: `/courses/${c}/discussion_topics`,
    canvas_modules: `/courses/${c}/modules`,
    canvas_module_items: `/courses/${c}/modules/${m}/items`,
    canvas_page: `/courses/${c}/pages/${encodeURIComponent(args.page_url ?? '')}`,
    canvas_planner: '/planner/items',
  };
  const u = new URL('/api/v1' + routes[name], origin());
  u.searchParams.set('per_page', '50');
  u.searchParams.set('page', String(args.page ?? 1));
  if (name === 'canvas_courses') {
    u.searchParams.set('enrollment_state', args.enrollment_state ?? 'active');
    u.searchParams.append('include[]', 'total_scores');
    if (args.enrollment_state === 'completed') u.searchParams.append('include[]', 'term');
  }
  if (name === 'canvas_assignments' || name === 'canvas_assignment')
    u.searchParams.append('include[]', 'submission');
  if (name === 'canvas_announcements') u.searchParams.set('only_announcements', 'true');
  if (name === 'canvas_planner')
    for (const [k, v] of Object.entries(dayRange(args.start_date, args.end_date, opts.timeZone)))
      u.searchParams.set(k, v);
  return u;
}
// When Canvas refuses a listing, the content is usually still reachable another way. These hints
// go into the error so the AI tries that way instead of telling the user the file is unreadable.
const FIND_FILES_HINT =
  ' This course probably hides that list from students; the files are usually still linked from the front page, modules, pages, the syllabus or assignments. Call canvas_find_files with the course_id (and the file name or topic as query) to find them, then read the returned file_id with canvas_file_content.';
const HINTS = {
  canvas_files: FIND_FILES_HINT,
  canvas_folders: FIND_FILES_HINT,
  canvas_folder: FIND_FILES_HINT,
  canvas_pages:
    ' This course probably hides its page list; single pages are still readable by page_url. Get page links from canvas_front_page or canvas_modules, or call canvas_find_files to search every linked page for files.',
  canvas_file:
    ' The file may be locked, unpublished or hidden for students. canvas_find_files lists the files this course links to that you can open.',
  canvas_file_content:
    ' The file may be locked, unpublished or hidden for students. canvas_find_files lists the files this course links to that you can open.',
};
// opts.timeZone: the user's Canvas time zone (results show local times; day ranges are local days).
export async function callCanvas(name, args, token, fetcher = fetch, opts = {}) {
  const u = endpoint(name, args, opts);
  let r;
  try {
    r = await canvasGet(u, token, fetcher);
  } catch (e) {
    if (HINTS[name] && [401, 403, 404].includes(e.status)) e.message += HINTS[name];
    throw e;
  }
  if (name === 'canvas_file_content') return readFileContent(r.data, args, fetcher);
  if (args.raw) return r;
  const out = slim(name, r, { timeZone: opts.timeZone });
  if (name === 'canvas_calendar_events' && Array.isArray(out.data) && out.data.length === 0) {
    const where = args.context_codes ? 'these calendars' : 'your personal calendar';
    const what =
      args.type === 'assignment' ? 'assignment deadlines' : 'calendar events (type "event")';
    out.note = `No ${what} in ${where} for these days.${args.context_codes ? '' : ' Course entries need context_codes (course_<id>).'}${args.type === 'assignment' ? '' : ' Assignment deadlines need type "assignment".'} canvas_planner lists everything due in all courses at once.`;
  }
  return out;
}

// One GET to the Canvas API: fixed headers, no redirects, Canvas errors turned into safe messages
// (never the upstream body). `e.status` is set when Canvas refused this item (not a token problem).
export async function canvasGet(u, token, fetcher = fetch) {
  const r = await fetcher(u, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'Neuro-CanvasLMS/2.0 (read-only personal integration)',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
  });
  if (
    r.status === 406 ||
    (r.status >= 500 && !(r.headers.get('content-type') ?? '').includes('json'))
  ) {
    // Canvas answers its API with JSON. An HTML error page means a firewall in front of Canvas
    // rejected the request, or Canvas failed on a malformed token (it returns an HTML 500 for that).
    throw new Error(
      `Canvas returned an HTML error page (HTTP ${r.status}) instead of JSON: a firewall in front of Canvas rejected the request, or the token is malformed. If it persists, reconnect with a freshly created token.`,
    );
  }
  if (r.status === 401) {
    // Canvas uses 401 both for a bad/expired token and for "not allowed to see this".
    let msg = '';
    try {
      msg = JSON.stringify((await r.clone().json()).errors ?? '');
    } catch {}
    const tokenProblem =
      /invalid access token|expired/i.test(msg) ||
      /invalid_token/i.test(r.headers.get('www-authenticate') ?? '');
    if (tokenProblem) throw new Error('Canvas authorization expired; reconnect.');
    throw Object.assign(
      new Error(
        'Canvas denied access to this resource (HTTP 401: not authorized for this item). The connection itself is fine.',
      ),
      { status: 401 },
    );
  }
  if (!r.ok)
    throw Object.assign(
      new Error(
        `Canvas returned HTTP ${r.status} (${(r.headers.get('content-type') ?? 'unknown').split(';')[0]}; ${r.headers.get('server') ?? 'unknown'})`,
      ),
      { status: r.status },
    );
  const data = await r.json();
  const next = nextPage(r.headers.get('link'));
  // api_url is the API request itself (it shows JSON); links for the user are the html_url fields.
  return { data, has_more: next !== null, next_page: next, api_url: u.href };
}

// Canvas puts `verifier=` on file links (download URLs, links inside pages). It works like a pass:
// anyone holding the link can download the file without logging in. The connector needs it for
// its own downloads, but it must not end up in conversations, so it is stripped from everything
// returned to the AI. The links keep working for the user, who is logged in to Canvas.
// Private calendar/announcement feed links (/feeds/…) work the same way and are removed whole.
const VERIFIER = /(&amp;|[?&])verifier=[^&#"'\s<>()]*(&amp;|&)?/gi;
const FEED = /https?:\/\/[^\s"'<>()]*\/feeds\/[^\s"'<>()]+/gi;
export function withoutVerifiers(value) {
  if (typeof value === 'string') {
    let v = value;
    if (v.includes('verifier='))
      v = v.replace(VERIFIER, (m, before, after) => (after ? before : ''));
    if (v.includes('/feeds/')) v = v.replace(FEED, '[private feed link removed]');
    return v;
  }
  if (Array.isArray(value)) return value.map(withoutVerifiers);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withoutVerifiers(v)]));
  return value;
}

// Read the next page exactly as Canvas gives it (number or bookmark) from the Link header.
export function nextPage(link) {
  const part = (link ?? '').split(',').find(x => /;\s*rel="next"/.test(x));
  const url = part?.match(/<([^>]+)>/)?.[1];
  if (!url) return null;
  let p;
  try {
    p = new URL(url).searchParams.get('page');
  } catch {
    return null;
  }
  if (!p) return null;
  return /^[1-9][0-9]{0,3}$/.test(p)
    ? Number(p)
    : /^bookmark:[A-Za-z0-9_=-]{1,1000}$/.test(p)
      ? p
      : null;
}
