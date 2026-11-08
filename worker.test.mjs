// worker.mjs end to end, offline: the authorization page (where the Canvas token enters), the
// owner binding, the MCP gate and what reaches the AI. Cloudflare-only modules are stubbed, KV is
// in memory, and Canvas is a fake answering on the example host; nothing else is reachable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import module from 'node:module';

const STUBS = {
  'cloudflare:sockets': 'export const connect = () => { throw new Error("no sockets in tests"); };',
  'cloudflare:workers':
    'export class WorkerEntrypoint { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }' +
    ' export const env = { CANVAS_TRANSPORT: "fetch", REGISTER_PER_MINUTE: "1000" };',
};
const stubURL = s => 'data:text/javascript,' + encodeURIComponent(STUBS[s]);
if (module.registerHooks)
  module.registerHooks({
    resolve: (s, context, next) =>
      s in STUBS ? { url: stubURL(s), shortCircuit: true } : next(s, context),
  });
// Node 22 before 22.15 has only the off-thread hooks.
else
  module.register(
    'data:text/javascript,' +
      encodeURIComponent(
        `const STUBS = ${JSON.stringify(Object.fromEntries(Object.keys(STUBS).map(s => [s, stubURL(s)])))};
         export async function resolve(s, c, next) {
           return s in STUBS ? { url: STUBS[s], shortCircuit: true } : next(s, c);
         }`,
      ),
  );

const H = 'canvas.example.edu';
const ORIGIN = 'https://w.example';
const TOKEN = 'T0KEN-'.repeat(6);
// worker.mjs captures fetch when it is imported: install the fake first.
let canvas = async () => Response.json({});
const calls = [];
globalThis.fetch = async (u, opt) => {
  const url = new URL(String(u));
  if (url.hostname !== H) throw new TypeError('network disabled in tests: ' + url.hostname);
  calls.push(url);
  return canvas(url, opt);
};
const logs = [];
const log = console.log;
console.log = (...a) => logs.push(a.join(' '));
test.after(() => (console.log = log));
const { default: worker } = await import('./worker.mjs');

const memoryKV = () => {
  const m = new Map();
  return {
    m,
    get: async (k, o) => {
      const v = m.get(k);
      return v == null ? null : o === 'json' || o?.type === 'json' ? JSON.parse(v) : v;
    },
    put: async (k, v) => void m.set(k, String(v)),
    delete: async k => void m.delete(k),
    list: async ({ prefix = '' } = {}) => ({
      keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })),
      list_complete: true,
    }),
  };
};
const setup = (vars = {}) => {
  const kv = memoryKV();
  const env = { CANVAS_HOST: H, SCHOOL_NAME: 'Example University', OAUTH_KV: kv, ...vars };
  const pending = [];
  const ctx = { waitUntil: p => pending.push(p), props: undefined };
  const send = (path, init = {}) => worker.fetch(new Request(ORIGIN + path, init), env, ctx);
  return { kv, env, send, settle: () => Promise.allSettled(pending) };
};
const profileIs = id => async url =>
  url.pathname === '/api/v1/users/self/profile'
    ? Response.json({ id, time_zone: 'America/New_York' })
    : Response.json([]);

const verifier = 'v'.repeat(50);
const challenge = createHash('sha256').update(verifier).digest('base64url');
async function client(w, redirect = 'http://localhost:9999/cb') {
  const r = await w.send('/oauth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: [redirect],
      client_name: 'test',
      token_endpoint_auth_method: 'none',
    }),
  });
  const { client_id } = await r.json();
  const q = new URLSearchParams({
    response_type: 'code',
    client_id,
    redirect_uri: redirect,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 's',
  });
  return { client_id, redirect, path: '/authorize?' + q };
}
const csrfOf = r => r.headers.get('set-cookie')?.match(/__Host-canvas_csrf=([^;]+)/)?.[1];
async function form(w, c, { token = TOKEN, consent = 'yes', origin = ORIGIN, cookie, csrf } = {}) {
  const fresh = csrfOf(await w.send(c.path));
  const body = new URLSearchParams({ csrf: csrf ?? fresh, token });
  if (consent) body.set('consent', consent);
  const headers = { cookie: `__Host-canvas_csrf=${cookie ?? fresh}` };
  if (origin) headers.origin = origin;
  return w.send(c.path, { method: 'POST', headers, body });
}
async function connectAs(w, id) {
  canvas = profileIs(id);
  const c = await client(w);
  const r = await form(w, c);
  assert.equal(r.status, 303);
  const code = new URL(r.headers.get('location')).searchParams.get('code');
  const t = await w.send('/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: c.redirect,
      client_id: c.client_id,
      code_verifier: verifier,
    }),
  });
  return (await t.json()).access_token;
}
let rpcId = 0;
const mcp = (w, accessToken, method, params) =>
  w.send('/mcp', {
    method: 'POST',
    headers: {
      ...(accessToken ? { authorization: 'Bearer ' + accessToken } : {}),
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, ...(params ? { params } : {}) }),
  });

test('the authorization page: a 30-minute CSRF cookie, and a CSP that allows only its own script', async () => {
  const w = setup();
  const c = await client(w);
  const r = await w.send(c.path);
  assert.equal(r.status, 200);
  assert.match(
    r.headers.get('set-cookie'),
    /^__Host-canvas_csrf=[0-9a-f-]{36}; Secure; HttpOnly; Path=\/; SameSite=Lax; Max-Age=1800$/,
  );
  assert.ok((await r.text()).includes(csrfOf(r)), 'the form carries the same CSRF value');
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'sha256-[A-Za-z0-9+/]+=*'$/);
  assert.ok(!/script-src[^;]*unsafe-inline/.test(csp));
  // An app this connector does not serve gets no form and no cookie.
  const evil = await client(w, 'https://evil.example.org/cb');
  const refused = await w.send(evil.path);
  assert.equal(refused.status, 403);
  assert.equal(refused.headers.get('set-cookie'), null);
});

test('a submitted form is checked before Canvas is ever asked', async () => {
  const w = setup();
  const c = await client(w);
  calls.length = 0;
  canvas = profileIs(111);
  let r = await form(w, c, { origin: null });
  assert.equal(r.status, 403);
  assert.equal(await r.text(), 'Invalid origin');
  r = await form(w, c, { origin: 'https://evil.example' });
  assert.equal(r.status, 403);
  // A stale page (cookie gone or replaced by another tab): a page in the user's language.
  r = await form(w, c, { cookie: 'a-different-value' });
  assert.equal(r.status, 403);
  let html = await r.text();
  assert.match(html, /This page has expired/);
  assert.ok(
    html.includes(`href="${c.path.replaceAll('&', '&amp;')}"`),
    'links back to a fresh form',
  );
  r = await w.send(c.path, {
    method: 'POST',
    headers: { origin: ORIGIN, 'accept-language': 'zh-CN,zh;q=0.9' },
    body: new URLSearchParams({ csrf: 'x', consent: 'yes', token: TOKEN }),
  });
  assert.equal(r.status, 403);
  assert.match(await r.text(), /页面已过期/);
  // No consent: back to the form.
  r = await form(w, c, { consent: null });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), c.path);
  for (const token of ['x'.repeat(19), 'x'.repeat(513)]) {
    r = await form(w, c, { token });
    assert.equal(r.status, 400);
  }
  assert.equal(calls.length, 0, 'Canvas was never asked');
  assert.equal(w.kv.m.get('owner:canvas_user_id'), undefined);
});

test('Canvas being down is not blamed on the token; a refused token is', async () => {
  const w = setup();
  const c = await client(w);
  const cases = [
    [
      async () => {
        throw new DOMException('timeout', 'TimeoutError');
      },
      502,
      /Canvas is not answering right now/,
    ],
    [
      async () =>
        new Response('<h1>Maintenance</h1>', {
          status: 503,
          headers: { 'content-type': 'text/html' },
        }),
      502,
      /Canvas is not answering right now/,
    ],
    [
      async () =>
        Response.json({ errors: [{ message: 'Invalid access token.' }] }, { status: 401 }),
      400,
      /Canvas refused this token/,
    ],
    [
      async () =>
        new Response('<h1>500</h1>', { status: 500, headers: { 'content-type': 'text/html' } }),
      400,
      /not pasted completely/,
    ],
  ];
  for (const [answer, status, text] of cases) {
    canvas = answer;
    const r = await form(w, c);
    assert.equal(r.status, status, String(text));
    const html = await r.text();
    assert.match(html, text);
    assert.ok(!html.includes(TOKEN), 'the token is never shown');
  }
  assert.equal(w.kv.m.get('owner:canvas_user_id'), undefined);
});

test('the first account to authorize becomes the owner; any other account is refused', async () => {
  const w = setup();
  canvas = profileIs(111);
  let c = await client(w);
  let r = await form(w, c);
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), /^http:\/\/localhost:9999\/cb\?code=/);
  assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(w.kv.m.get('owner:canvas_user_id'), '111');
  canvas = profileIs(222);
  c = await client(w);
  r = await form(w, c);
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('location'), null);
  assert.match(await r.text(), /belongs to someone else/);
  assert.equal(w.kv.m.get('owner:canvas_user_id'), '111');
  // A profile without a numeric id never becomes the owner.
  const fresh = setup();
  canvas = profileIs('abc');
  r = await form(fresh, await client(fresh));
  assert.equal(r.status, 403);
  assert.equal(fresh.kv.m.get('owner:canvas_user_id'), undefined);
  // OWNER_CANVAS_ID pins the owner: nothing is written, other accounts are refused.
  const pinned = setup({ OWNER_CANVAS_ID: '555' });
  canvas = profileIs(111);
  r = await form(pinned, await client(pinned));
  assert.equal(r.status, 403);
  assert.equal(pinned.kv.m.get('owner:canvas_user_id'), undefined);
});

// Clients store per-tool approvals by name: tools may be added, never renamed or removed.
const FROZEN_TOOLS = [
  'canvas_profile',
  'canvas_courses',
  'canvas_assignments',
  'canvas_assignment',
  'canvas_announcements',
  'canvas_modules',
  'canvas_module_items',
  'canvas_page',
  'canvas_planner',
  'canvas_course',
  'canvas_pages',
  'canvas_context_page',
  'canvas_front_page',
  'canvas_assignment_groups',
  'canvas_submission',
  'canvas_course_submissions',
  'canvas_enrollments',
  'canvas_missing_submissions',
  'canvas_rubrics',
  'canvas_rubric',
  'canvas_peer_reviews',
  'canvas_discussions',
  'canvas_discussion',
  'canvas_discussion_entries',
  'canvas_discussion_replies',
  'canvas_conversations',
  'canvas_conversation',
  'canvas_unread_count',
  'canvas_activity_stream',
  'canvas_calendar_events',
  'canvas_calendar_event',
  'canvas_appointment_groups',
  'canvas_appointment_group',
  'canvas_planner_notes',
  'canvas_planner_overrides',
  'canvas_todo',
  'canvas_upcoming_events',
  'canvas_files',
  'canvas_file',
  'canvas_folders',
  'canvas_folder',
  'canvas_file_content',
  'canvas_groups',
  'canvas_group',
  'canvas_group_members',
  'canvas_module',
  'canvas_module_item',
  'canvas_quizzes',
  'canvas_quiz',
  'canvas_quiz_submission',
  'canvas_quiz_submission_questions',
  'canvas_settings',
  'canvas_user',
  'canvas_communication_channels',
  'canvas_notification_preferences',
  'canvas_favorites',
  'canvas_favorite_groups',
  'canvas_course_nicknames',
  'canvas_module_file',
  'canvas_file_original',
  'canvas_find_files',
  'canvas_module_file_content',
  'canvas_connector_version',
  'canvas_file_download_link',
];

test('MCP: only the owner gets in, tools keep their names, results reach the AI filtered', async () => {
  const w = setup();
  logs.length = 0;
  const access = await connectAs(w, 111);
  assert.ok(access);
  assert.equal((await mcp(w, null, 'tools/list')).status, 401);

  const list = await (await mcp(w, access, 'tools/list')).json();
  const names = list.result.tools.map(t => t.name);
  for (const name of FROZEN_TOOLS) assert.ok(names.includes(name), `tool ${name} still exists`);
  for (const t of list.result.tools) {
    assert.equal(t.annotations?.readOnlyHint, true, t.name);
    assert.equal(t.annotations?.destructiveHint, false, t.name);
  }
  // /healthz checks the same tools and says no more than ok, version, connected.
  const health = await w.send('/healthz');
  assert.equal(health.status, 200);
  const h = await health.json();
  assert.deepEqual(Object.keys(h).sort(), ['connected', 'ok', 'version']);
  assert.equal(h.connected, true);

  // Passes in raw results never reach the AI.
  canvas = async url =>
    url.pathname === '/api/v1/users/self/profile'
      ? Response.json({ id: 111, time_zone: 'America/New_York' })
      : Response.json({
          id: 1,
          uuid: 'UUIDPASS',
          syllabus_body: `<a href="https://${H}/courses/1/files/5?verifier=SECRETPASS&amp;wrap=1">x</a>`,
        });
  let r = await (
    await mcp(w, access, 'tools/call', {
      name: 'canvas_course',
      arguments: { course_id: 1, raw: true },
    })
  ).json();
  assert.ok(!r.result.isError, r.result.content[0].text);
  assert.ok(!/SECRETPASS|UUIDPASS/.test(r.result.content[0].text));

  // Canvas timing out: the AI hears that, not "check the arguments".
  canvas = async () => {
    throw new DOMException('timeout', 'TimeoutError');
  };
  r = await (await mcp(w, access, 'tools/call', { name: 'canvas_courses', arguments: {} })).json();
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /did not answer within 20 seconds/);
  // An argument problem is still named as such.
  r = await (
    await mcp(w, access, 'tools/call', { name: 'canvas_course', arguments: { course_id: 'x' } })
  ).json();
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /^Invalid course_id$/);

  // The owner changes (reset, another account bound): existing grants stop working.
  w.kv.m.set('owner:canvas_user_id', '222');
  assert.equal((await mcp(w, access, 'tools/list')).status, 403);
  await w.settle();
  const all = logs.join('\n');
  assert.ok(
    !all.includes(TOKEN) && !all.includes(access) && !/Bearer/i.test(all),
    'logs stay clean',
  );
});

test('the home page and unknown paths', async () => {
  const w = setup();
  const home = await w.send('/');
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('vary'), 'Accept-Language');
  assert.match(home.headers.get('content-security-policy'), /script-src 'sha256-/);
  assert.equal((await w.send('/nope')).status, 404);
  const health = await (await w.send('/healthz')).json();
  assert.equal(health.connected, false);
});

test('a tool call that takes too long is stopped with a message, before the client gives up', async () => {
  const { env: vars } = await import('cloudflare:workers');
  const w = setup();
  const access = await connectAs(w, 111);
  canvas = () => new Promise(() => {}); // Canvas never answers
  vars.TOOL_DEADLINE_MS = '150';
  try {
    const r = await (
      await mcp(w, access, 'tools/call', { name: 'canvas_courses', arguments: {} })
    ).json();
    assert.equal(r.result.isError, true);
    assert.match(r.result.content[0].text, /^Canvas took longer than 0 seconds/);
    assert.match(r.result.content[0].text, /connection are fine/);
  } finally {
    delete vars.TOOL_DEADLINE_MS;
  }
});

test('client registration is capped per day; a full day gets 429, existing data is untouched', async () => {
  const w = setup();
  const { env: vars } = await import('cloudflare:workers');
  vars.REGISTER_PER_DAY = '2';
  try {
    const register = () =>
      w.send('/oauth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['http://localhost:9999/cb'],
          token_endpoint_auth_method: 'none',
        }),
      });
    assert.equal((await register()).status, 201);
    await w.settle();
    assert.equal((await register()).status, 201);
    await w.settle();
    const writes = w.kv.m.size;
    const r = await register();
    assert.equal(r.status, 429);
    assert.equal((await r.json()).error, 'temporarily_unavailable');
    assert.equal(w.kv.m.size, writes, 'a refused registration writes nothing');
  } finally {
    delete vars.REGISTER_PER_DAY;
  }
});

test('storage (KV) failing: a page in the user language, an OAuth error, a 503 for /dl', async () => {
  const w = setup();
  const broken = async () => {
    throw new Error('KV GET failed: 429 Too Many Requests');
  };
  w.kv.get = broken;
  w.kv.put = broken;
  const home = await w.send('/', { headers: { 'accept-language': 'zh-CN' } });
  assert.equal(home.status, 503);
  assert.match(await home.text(), /你的连接器出了点问题/);
  const token = await w.send('/oauth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ redirect_uris: ['http://localhost:9999/cb'] }),
  });
  assert.equal(token.status, 503);
  assert.equal((await token.json()).error, 'temporarily_unavailable');
  const dl = await w.send('/dl/' + 'a'.repeat(43), { headers: { 'x-canvas-download': '1' } });
  assert.equal(dl.status, 503);
  assert.doesNotMatch(await dl.text(), /expired/);
});
