// Neuro-CanvasLMS installer. Deploys THIS copy of the code to your own Cloudflare account.
//   npx -y neuro-canvas-lms             install, or update an existing install
//   npx -y neuro-canvas-lms uninstall   remove it
//   npx -y neuro-canvas-lms check       only check an installed connector (deploys nothing)
//   (from a clone: npm run setup / npm run setup -- uninstall)
// Running it again updates the connector to the code you are running and keeps its storage, so
// existing Claude/ChatGPT connections keep working.
// Language: your system language if supported (en, zh, es, ja, hi), else English; --lang to choose.
// Automation/tests: --name, --canvas-host, --school, --account-id, --yes; env NCLMS_HOME, NCLMS_LANG
// (tests only: NCLMS_WRANGLER, a stand-in for wrangler's bin script).
// Exit codes: 0 done, 1 failed, 2 deployed but not confirmed online yet (run `check` later).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseJsonc } from '../scripts/jsonc.mjs';
import { VERSION } from '../version.mjs';
import {
  DEFAULT_NAME,
  normalizeCanvasHost,
  validWorkerName,
  connectorConfig,
  parseWorkerUrl,
  detectLang,
  parseAppleLanguages,
  CLI_LANGS,
  parseArgs,
  updateChoices,
  updateQuestion,
  isYes,
  needsSubdomain,
  subdomainLink,
  needsEmailVerification,
} from './lib.mjs';
import { msg } from './messages.mjs';
import { verifyDeployment } from './verify.mjs';
import { ensureSubdomain } from './subdomain.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
// wrangler's package "exports" hide bin/; find the package root from its main entry instead.
const WRANGLER =
  process.env.NCLMS_WRANGLER ||
  (() => {
    let dir = path.dirname(createRequire(import.meta.url).resolve('wrangler'));
    while (path.basename(dir) !== 'wrangler' || !fs.existsSync(path.join(dir, 'package.json'))) {
      if (path.dirname(dir) === dir) throw new Error('wrangler is not installed');
      dir = path.dirname(dir);
    }
    return path.join(dir, 'bin', 'wrangler.js');
  })();
const HOME = process.env.NCLMS_HOME || path.join(os.homedir(), '.neuro-canvas-lms');
const args = parseArgs(process.argv.slice(2));
function systemLanguages() {
  const out = [];
  if (process.platform === 'darwin') {
    const r = spawnSync('defaults', ['read', '-g', 'AppleLanguages'], { encoding: 'utf8' });
    if (r.status === 0) out.push(...parseAppleLanguages(r.stdout));
  }
  try {
    out.push(Intl.DateTimeFormat().resolvedOptions().locale); // Windows / Linux system locale
  } catch {}
  return out;
}
const lang = CLI_LANGS.includes(args.lang) ? args.lang : detectLang(process.env, systemLanguages());
const say = (key, vars) => console.log('  ' + msg(lang, key, vars));
const ok = (key, vars) => console.log('  ✓ ' + msg(lang, key, vars));
const fail = detail => {
  throw new Error(detail);
};

let accountEnv = {};
// Every wrangler step has a time limit (a hung network must not hang the installer); only the
// interactive login waits as long as the user needs.
function wrangler(argv, { cwd, inherit, timeout = inherit ? undefined : 2 * 60 * 1000 } = {}) {
  const r = spawnSync(process.execPath, [WRANGLER, ...argv], {
    cwd,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    timeout,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', ...accountEnv },
  });
  let out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.error?.code === 'ETIMEDOUT') out += '\n' + msg(lang, 'timed_out', { s: timeout / 1000 });
  return { ok: r.status === 0, out, stdout: r.stdout ?? '' };
}
// JSON that wrangler printed on stdout (warnings and banners go to stderr, or come before it).
function stdoutJson(r, open) {
  try {
    return JSON.parse(r.stdout.slice(r.stdout.indexOf(open)));
  } catch {
    return null;
  }
}

// The local install record. A damaged file is moved aside (and said so) instead of failing every
// run with the same JSON error; it is written to a temporary file first, then renamed, so an
// interrupted write cannot damage it.
function readState(statePath) {
  if (!fs.existsSync(statePath)) return {};
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (state && typeof state === 'object' && !Array.isArray(state)) return state;
  } catch {}
  const moved = `${statePath}.damaged-${Date.now()}`;
  fs.renameSync(statePath, moved);
  say('state_broken', { moved });
  return {};
}
function writeState(statePath, state) {
  const tmp = `${statePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, statePath);
}
// A failed wrangler step: an unverified Cloudflare email gets its own clear message.
const failStep = (what, out) =>
  fail(needsEmailVerification(out) ? msg(lang, 'email_verify') : `${what}: ${lastLines(out)}`);
const lastLines = out =>
  out
    .split('\n')
    .map(l => l.replace(/\x1b\[[0-9;]*m/g, '').trim())
    .filter(l => l && !/^(🪵|⛅️|─)/.test(l))
    .slice(-3)
    .join(' | ');

async function ask(question, fallback = '') {
  if (args.yes || !process.stdin.isTTY) return fallback;
  const r = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(res => r.question(`  ${question}\n  › `, res));
  r.close();
  return answer.trim() || fallback;
}
// y/n question: only y goes ahead. Without a terminal (or with --yes) the run was started on
// purpose, e.g. by an agent, so it goes ahead.
async function confirm(question) {
  if (args.yes || !process.stdin.isTTY) return true;
  return isYes(await ask(question, ''));
}
async function choose(question, options) {
  if (args.yes || !process.stdin.isTTY) return 0;
  console.log(`  ${question}`);
  options.forEach((o, i) => console.log(`    ${i + 1}) ${o}`));
  for (;;) {
    const n = Number(await ask('', '1')) - 1;
    if (Number.isInteger(n) && n >= 0 && n < options.length) return n;
  }
}
function openUrl(url) {
  const [cmd, ...a] =
    process.platform === 'darwin'
      ? ['open', url]
      : process.platform === 'win32'
        ? ['cmd', '/c', 'start', '', url]
        : ['xdg-open', url];
  spawnSync(cmd, a, { stdio: 'ignore' });
}
function copy(text) {
  const [cmd, ...a] =
    process.platform === 'darwin'
      ? ['pbcopy']
      : process.platform === 'win32'
        ? ['clip']
        : ['xclip', '-selection', 'clipboard'];
  spawnSync(cmd, a, { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
}

async function ensureLogin(saved) {
  let who = wrangler(['whoami', '--json']);
  if (!who.ok) {
    say('login_needed');
    for (let attempt = 0; attempt < 2 && !who.ok; attempt++) {
      if (attempt) say('login_retry');
      wrangler(['login'], { inherit: true });
      who = wrangler(['whoami', '--json']);
    }
    if (!who.ok) fail(msg(lang, 'login_failed'));
  }
  const info = stdoutJson(who, '{');
  if (!info) failStep('wrangler whoami', who.out);
  ok('logged_in', { email: info.email ?? '' });
  const accounts = info.accounts ?? [];
  if (args.accountId) return args.accountId;
  if (saved && accounts.some(a => a.id === saved)) return saved;
  if (!accounts.length) fail(msg(lang, 'no_account'));
  if (accounts.length === 1) return accounts[0].id;
  // Run by an agent (no terminal) or with --yes: never pick an account silently.
  if (args.yes || !process.stdin.isTTY)
    fail(
      msg(lang, 'pick_account_flag', {
        list: accounts.map(a => `    --account-id ${a.id}   ${a.name}`).join('\n'),
      }),
    );
  const i = await choose(
    msg(lang, 'pick_account'),
    accounts.map(a => `${a.name} (${a.id})`),
  );
  return accounts[i].id;
}

// A new Cloudflare account gets its workers.dev subdomain here (subdomain.mjs), right after sign-in,
// so the new address's certificate is being issued while the rest runs.
async function setUpSubdomain(accountId) {
  const token = wrangler(['auth', 'token', '--json'], { timeout: 30 * 1000 });
  const result = await ensureSubdomain(accountId, { authOutput: token.ok ? token.stdout : '' });
  if (result.emailUnverified) fail(msg(lang, 'email_verify'));
  if (result.created) ok('subdomain_ok', { address: `${result.created}.workers.dev` });
}

async function checkCanvas(host) {
  try {
    const r = await fetch(`https://${host}/api/v1/users/self`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20 * 1000),
      headers: { 'User-Agent': 'Neuro-CanvasLMS-installer', Accept: 'application/json' },
    });
    const ct = (r.headers.get('content-type') ?? '').split(';')[0];
    if (r.status === 401 && ct.includes('json')) return { ok: true };
    return { ok: false, detail: `HTTP ${r.status}${ct ? ', ' + ct : ''}` };
  } catch (e) {
    return {
      ok: false,
      detail: e.name === 'TimeoutError' ? 'timeout' : (e.cause?.code ?? e.message),
    };
  }
}
async function askCanvasHost(previous, { quiet = false } = {}) {
  // Run by an agent (no terminal) or with --yes on a first install: the address must be a flag.
  if (!args.canvasHost && !previous && (args.yes || !process.stdin.isTTY))
    fail(msg(lang, 'canvas_flag'));
  for (let i = 0; i < 5; i++) {
    const input =
      args.canvasHost ??
      (quiet && i === 0 ? previous : await ask(msg(lang, 'canvas_q'), previous ?? ''));
    const host = normalizeCanvasHost(input);
    const check = host ? await checkCanvas(host) : { ok: false, detail: input || '—' };
    if (check.ok) {
      ok('canvas_ok', { host });
      return host;
    }
    say('canvas_bad', { detail: check.detail });
    if (quiet && i === 0 && !args.canvasHost) continue; // the saved address stopped working: ask
    if (args.canvasHost || args.yes || !process.stdin.isTTY)
      fail(msg(lang, 'canvas_bad', { detail: check.detail }));
  }
  fail(msg(lang, 'cancelled'));
}

// { list } or, when the list could not be read, { detail } (never treat that as "no storage").
function listNamespaces() {
  const r = wrangler(['kv', 'namespace', 'list']);
  const list = r.ok ? stdoutJson(r, '[') : null;
  return Array.isArray(list) ? { list } : { detail: lastLines(r.out) || 'no answer' };
}
function ensureKv(name, state) {
  const { list: namespaces, detail } = listNamespaces();
  if (!namespaces) failStep(msg(lang, 'step_kv_list'), detail);
  const existing =
    namespaces.find(n => n.id === state.kvId) ?? namespaces.find(n => n.title === `${name}-oauth`);
  if (existing) {
    ok('kv_reuse');
    return existing.id;
  }
  say('kv');
  const r = wrangler(['kv', 'namespace', 'create', `${name}-oauth`]);
  const id = r.out.match(/"id":\s*"([a-f0-9]{32})"/)?.[1];
  if (!id) failStep(msg(lang, 'step_kv_create'), r.out);
  return id;
}

// The version an installed connector runs now, from its health check (null if it does not answer).
async function runningVersion(url) {
  try {
    const r = await fetch(`${url}/healthz`, {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    return typeof j?.version === 'string' ? j.version : null;
  } catch {
    return null;
  }
}

async function install() {
  console.log(`\n  ${msg(lang, 'title')}\n`);
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 22) fail(msg(lang, 'node_old', { need: 22, have: process.versions.node }));
  const name = args.name ?? DEFAULT_NAME;
  if (!validWorkerName(name)) fail(msg(lang, 'invalid_name'));
  const dir = path.join(HOME, name);
  fs.mkdirSync(dir, { recursive: true });
  const statePath = path.join(dir, 'state.json');
  const state = readState(statePath);
  const plan = updateChoices(state, args);
  if (plan.updating) {
    const from = await runningVersion(state.url);
    const question = updateQuestion(from, VERSION);
    if (!(await confirm(msg(lang, question, { name, from: from ?? '', to: VERSION }))))
      return say('update_cancelled');
  }

  const accountId = await ensureLogin(plan.accountId);
  accountEnv = { CLOUDFLARE_ACCOUNT_ID: accountId };
  if (!plan.updating) await setUpSubdomain(accountId);
  const host = await askCanvasHost(state.host, { quiet: !plan.askHost });
  const school = plan.school;
  const kvId = ensureKv(name, state);
  const save = extra =>
    writeState(statePath, { ...state, name, accountId, kvId, host, school, ...extra });
  save({});

  say('deploy', { version: VERSION });
  const template = parseJsonc(fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8'));
  const main = path.relative(dir, path.join(ROOT, 'worker.mjs'));
  const config = connectorConfig({ name, accountId, kvId, main, template, host, school });
  fs.writeFileSync(path.join(dir, 'wrangler.jsonc'), JSON.stringify(config, null, 2));
  const deploy = () =>
    wrangler(['deploy', '-c', 'wrangler.jsonc'], { cwd: dir, timeout: 5 * 60 * 1000 });
  let r = deploy();
  // New Cloudflare account: the user picks a workers.dev subdomain in the dashboard, then we retry.
  for (let i = 0; !r.ok && needsSubdomain(r.out) && i < 3; i++) {
    const link = subdomainLink(accountId);
    if (args.yes || !process.stdin.isTTY) fail(msg(lang, 'subdomain_needed', { link }));
    say('subdomain_needed', { link });
    openUrl(link);
    await ask(msg(lang, 'subdomain_wait'));
    r = deploy();
  }
  if (!r.ok) failStep(msg(lang, 'step_deploy'), r.out);
  const url = parseWorkerUrl(r.out) ?? state.url;
  if (!url) fail(`${msg(lang, 'step_url')}: ${lastLines(r.out)}`);
  ok('deploy_ok', { url });
  save({ url, version: VERSION });

  say('check');
  // A new address can need minutes for its certificate. On a first install, use that time: the
  // user makes the Canvas token they need next.
  let tokenAsked = false;
  const check = await verifyDeployment(url, VERSION, {
    onWarmup: () => {
      say('cert_wait');
      if (plan.updating) return;
      tokenAsked = true;
      say('cert_wait_token', { canvas: `https://${host}/profile/settings` });
      if (!args.yes) openUrl(`https://${host}/profile/settings`);
    },
  });
  if (!check.ok) return notConfirmed(name, url, check.detail);
  ok('check_ok', { version: VERSION });

  // Already connected: an update needs nothing from the user, so don't send them to make a token,
  // don't overwrite their clipboard and don't open Canvas.
  if (check.connected) {
    console.log('');
    ok('updated', { version: VERSION });
    say('updated_refresh');
    say('updated_expired');
    console.log('');
    return;
  }
  nextSteps(url, host, { tokenAsked });
}

// The deploy worked but the address did not answer correctly in time (usually a brand-new
// workers.dev address still getting its certificate). Not a failure: say where it is and how to
// check again without deploying. Exit code 2 tells scripts and agents exactly that.
function notConfirmed(name, url, detail) {
  const cmd = 'npx -y neuro-canvas-lms check' + (name === DEFAULT_NAME ? '' : ` --name ${name}`);
  console.log('');
  say('check_pending', { url, detail, cmd });
  console.log('');
  process.exitCode = 2;
}

// What the user does next, once the connector is online and not yet connected to an AI app.
function nextSteps(url, host, { tokenAsked = false } = {}) {
  copy(`${url}/mcp`);
  console.log(`\n  ${msg(lang, 'done')}`);
  say(tokenAsked ? 'done_1_ready' : 'done_1', { canvas: `https://${host}` });
  say('done_2');
  console.log(`\n      ${url}/mcp\n`);
  say('done_3');
  say('done_gpt');
  say('done_now');
  console.log('');
  say('done_update');
  console.log('');
  if (!args.yes && !tokenAsked) openUrl(`https://${host}/profile/settings`);
}

// Only check an installed connector (after "not confirmed online yet"): nothing is deployed.
async function check() {
  console.log(`\n  ${msg(lang, 'title')}\n`);
  const name = args.name ?? DEFAULT_NAME;
  if (!validWorkerName(name)) fail(msg(lang, 'invalid_name'));
  const statePath = path.join(HOME, name, 'state.json');
  const state = readState(statePath);
  if (!state.url) {
    console.error('  ✗ ' + msg(lang, 'check_none', { name }));
    process.exitCode = 1;
    return;
  }
  say('check_only', { url: state.url });
  const result = await verifyDeployment(state.url, state.version, {
    onWarmup: () => say('cert_wait'),
  });
  if (!result.ok) return notConfirmed(name, state.url, result.detail);
  ok('check_ok', { version: result.version });
  if (result.connected) return ok('check_connected');
  nextSteps(state.url, state.host);
}

async function uninstall() {
  const name = args.name ?? DEFAULT_NAME;
  const dir = path.join(HOME, name);
  const statePath = path.join(dir, 'state.json');
  const state = readState(statePath);
  // The account the connector was installed in. In any other account "Worker does not exist"
  // would look like success while the Worker and its storage (with the token grants) stay online.
  const accountId = await ensureLogin(state.accountId);
  if (state.accountId && accountId !== state.accountId)
    fail(msg(lang, 'un_wrong_account', { id: state.accountId }));
  accountEnv = { CLOUDFLARE_ACCOUNT_ID: accountId };
  if (!args.yes && (await ask(msg(lang, 'un_confirm', { name }))) !== name) return say('cancelled');
  // Every step must succeed (or find the thing already gone) before the local record is removed,
  // so a failed uninstall can simply be run again.
  const worker = wrangler(['delete', '--name', name, '--force']);
  if (!worker.ok && !/\b10090\b|does not exist/i.test(worker.out))
    fail(msg(lang, 'un_failed', { what: `Worker "${name}"`, detail: lastLines(worker.out) }));
  const before = listNamespaces();
  if (!before.list)
    fail(
      msg(lang, 'un_failed', {
        what: msg(lang, 'step_kv_list'),
        detail: before.detail,
      }),
    );
  const kv =
    before.list.find(n => n.id === state.kvId) ?? before.find(n => n.title === `${name}-oauth`);
  if (kv) {
    const r = wrangler([
      'kv',
      'namespace',
      'delete',
      '--namespace-id',
      kv.id,
      '--skip-confirmation',
    ]);
    const what = msg(lang, 'storage_label', { title: kv.title });
    if (!r.ok && !/\b10013\b|not found/i.test(r.out))
      fail(msg(lang, 'un_failed', { what, detail: lastLines(r.out) }));
    const after = listNamespaces();
    if (!after.list || after.list.some(n => n.id === kv.id))
      fail(msg(lang, 'un_failed', { what, detail: after.detail ?? msg(lang, 'still_listed') }));
  }
  fs.rmSync(dir, { recursive: true, force: true });
  ok('un_done');
}

const help = async () =>
  console.log(
    fs
      .readFileSync(fileURLToPath(import.meta.url), 'utf8')
      .split('\n')
      .slice(0, 10)
      .join('\n'),
  );
({ install, uninstall, help, check })[args.command]().then(
  () => process.exit(process.exitCode ?? 0),
  e => {
    console.error('\n  ✗ ' + msg(lang, 'failed', { detail: e?.message ?? e }) + '\n');
    process.exit(1);
  },
);
