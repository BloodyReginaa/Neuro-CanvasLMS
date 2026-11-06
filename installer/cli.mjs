// Neuro-CanvasLMS installer. Deploys THIS copy of the code to your own Cloudflare account.
//   npx github:BloodyReginaa/Neuro-CanvasLMS             install, or update an existing install
//   npx github:BloodyReginaa/Neuro-CanvasLMS uninstall   remove it
//   (from a clone: npm run setup / npm run setup -- uninstall)
// Running it again updates the connector to the code you are running and keeps its storage, so
// existing Claude/ChatGPT connections keep working.
// Automation/tests: --name, --canvas-host, --school, --account-id, --yes; env NCLMS_HOME, NCLMS_LANG.
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
  parseArgs,
} from './lib.mjs';
import { msg } from './messages.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
// wrangler's package "exports" hide bin/; find the package root from its main entry instead.
const WRANGLER = (() => {
  let dir = path.dirname(createRequire(import.meta.url).resolve('wrangler'));
  while (path.basename(dir) !== 'wrangler' || !fs.existsSync(path.join(dir, 'package.json')))
    dir = path.dirname(dir);
  return path.join(dir, 'bin', 'wrangler.js');
})();
const HOME = process.env.NCLMS_HOME || path.join(os.homedir(), '.neuro-canvas-lms');
const args = parseArgs(process.argv.slice(2));
const lang = args.lang === 'zh' || args.lang === 'en' ? args.lang : detectLang();
const say = (key, vars) => console.log('  ' + msg(lang, key, vars));
const ok = (key, vars) => console.log('  ✓ ' + msg(lang, key, vars));
const fail = detail => {
  throw new Error(detail);
};

let accountEnv = {};
function wrangler(argv, { cwd, inherit } = {}) {
  const r = spawnSync(process.execPath, [WRANGLER, ...argv], {
    cwd,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', ...accountEnv },
  });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
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

async function ensureLogin() {
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
  const info = JSON.parse(who.out.slice(who.out.indexOf('{')));
  ok('logged_in', { email: info.email ?? '' });
  const accounts = info.accounts ?? [];
  if (args.accountId) return args.accountId;
  if (!accounts.length) fail('no Cloudflare account found');
  if (accounts.length === 1) return accounts[0].id;
  const i = await choose(
    msg(lang, 'pick_account'),
    accounts.map(a => `${a.name} (${a.id})`),
  );
  return accounts[i].id;
}

async function checkCanvas(host) {
  try {
    const r = await fetch(`https://${host}/api/v1/users/self`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Neuro-CanvasLMS-installer', Accept: 'application/json' },
    });
    const ct = (r.headers.get('content-type') ?? '').split(';')[0];
    if (r.status === 401 && ct.includes('json')) return { ok: true };
    return { ok: false, detail: `HTTP ${r.status}${ct ? ', ' + ct : ''}` };
  } catch (e) {
    return { ok: false, detail: e.cause?.code ?? e.message };
  }
}
async function askCanvasHost(previous) {
  for (let i = 0; i < 5; i++) {
    const input = args.canvasHost ?? (await ask(msg(lang, 'canvas_q'), previous ?? ''));
    const host = normalizeCanvasHost(input);
    const check = host ? await checkCanvas(host) : { ok: false, detail: input || '—' };
    if (check.ok) {
      ok('canvas_ok', { host });
      return host;
    }
    say('canvas_bad', { detail: check.detail });
    if (args.canvasHost || args.yes || !process.stdin.isTTY)
      fail(msg(lang, 'canvas_bad', { detail: check.detail }));
  }
  fail(msg(lang, 'cancelled'));
}

function listNamespaces() {
  const r = wrangler(['kv', 'namespace', 'list']);
  return r.ok ? JSON.parse(r.out.slice(r.out.indexOf('['))) : [];
}
function ensureKv(name, state) {
  const namespaces = listNamespaces();
  const existing =
    namespaces.find(n => n.id === state.kvId) ?? namespaces.find(n => n.title === `${name}-oauth`);
  if (existing) {
    ok('kv_reuse');
    return existing.id;
  }
  say('kv');
  const r = wrangler(['kv', 'namespace', 'create', `${name}-oauth`]);
  const id = r.out.match(/"id":\s*"([a-f0-9]{32})"/)?.[1];
  if (!id) fail('could not create storage: ' + lastLines(r.out));
  return id;
}

async function healthCheck(url) {
  let detail = 'no answer';
  for (let i = 0; i < 20; i++) {
    if (i) await new Promise(r => setTimeout(r, 3000));
    try {
      const h = await fetch(`${url}/healthz`, { headers: { 'Cache-Control': 'no-cache' } });
      const j = h.ok ? await h.json() : null;
      if (!j?.ok) detail = `/healthz HTTP ${h.status}`;
      else if (j.version !== VERSION) detail = `still ${j.version}`;
      else {
        const mcp = await fetch(`${url}/mcp`, { method: 'POST', body: '{}' });
        if (mcp.status === 401) return { ok: true };
        detail = `/mcp HTTP ${mcp.status}`;
      }
    } catch (e) {
      detail = e.message;
    }
  }
  return { ok: false, detail };
}

async function install() {
  console.log(`\n  ${msg(lang, 'title')}\n`);
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 20) fail(msg(lang, 'node_old', { need: 20, have: process.versions.node }));
  const name = args.name ?? DEFAULT_NAME;
  if (!validWorkerName(name)) fail('invalid --name');
  const dir = path.join(HOME, name);
  fs.mkdirSync(dir, { recursive: true });
  const statePath = path.join(dir, 'state.json');
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
  if (state.url) say('rerun', { name });

  const accountId = await ensureLogin();
  accountEnv = { CLOUDFLARE_ACCOUNT_ID: accountId };
  const host = await askCanvasHost(state.host);
  const school = (args.school ?? (await ask(msg(lang, 'school_q'), state.school ?? ''))).slice(
    0,
    80,
  );
  const kvId = ensureKv(name, state);
  const save = extra =>
    fs.writeFileSync(
      statePath,
      JSON.stringify({ ...state, name, accountId, kvId, host, school, ...extra }, null, 2),
    );
  save({});

  say('deploy', { version: VERSION });
  const template = parseJsonc(fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8'));
  const main = path.relative(dir, path.join(ROOT, 'worker.mjs'));
  const config = connectorConfig({ name, accountId, kvId, main, template, host, school });
  fs.writeFileSync(path.join(dir, 'wrangler.jsonc'), JSON.stringify(config, null, 2));
  const r = wrangler(['deploy', '-c', 'wrangler.jsonc'], { cwd: dir });
  if (!r.ok) fail('deploy failed: ' + lastLines(r.out));
  const url = parseWorkerUrl(r.out) ?? state.url;
  if (!url) fail('could not read the connector URL: ' + lastLines(r.out));
  ok('deploy_ok', { url });
  save({ url, version: VERSION });

  say('check');
  const check = await healthCheck(url);
  if (!check.ok) fail(msg(lang, 'check_bad', { detail: check.detail }));
  ok('check_ok', { version: VERSION });

  copy(`${url}/mcp`);
  console.log(`\n  ${msg(lang, 'done')}`);
  say('done_1', { canvas: `https://${host}` });
  say('done_2');
  console.log(`\n      ${url}/mcp\n`);
  say('done_3');
  say('done_gpt');
  console.log('');
  say('done_update');
  console.log('');
  if (!args.yes) openUrl(`https://${host}/profile/settings`);
}

async function uninstall() {
  const name = args.name ?? DEFAULT_NAME;
  const dir = path.join(HOME, name);
  const statePath = path.join(dir, 'state.json');
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
  accountEnv = { CLOUDFLARE_ACCOUNT_ID: await ensureLogin() };
  if (!args.yes && (await ask(msg(lang, 'un_confirm', { name }))) !== name) return say('cancelled');
  wrangler(['delete', '--name', name, '--force']);
  const namespaces = listNamespaces();
  const kv =
    namespaces.find(n => n.id === state.kvId) ?? namespaces.find(n => n.title === `${name}-oauth`);
  if (kv) wrangler(['kv', 'namespace', 'delete', '--namespace-id', kv.id, '--skip-confirmation']);
  fs.rmSync(dir, { recursive: true, force: true });
  ok('un_done');
}

const help = async () =>
  console.log(
    fs
      .readFileSync(fileURLToPath(import.meta.url), 'utf8')
      .split('\n')
      .slice(0, 7)
      .join('\n'),
  );
({ install, uninstall, help })[args.command]().then(
  () => process.exit(0),
  e => {
    console.error('\n  ✗ ' + msg(lang, 'failed', { detail: e?.message ?? e }) + '\n');
    process.exit(1);
  },
);
