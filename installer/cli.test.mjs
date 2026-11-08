// The installer run end to end as a child process, with a stand-in for wrangler (NCLMS_WRANGLER)
// that answers from a script and records every call. Nothing reaches Cloudflare or Canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/neuro-canvas-lms.mjs', import.meta.url));

// argv starting with `match` gets the next of its answers (the last one repeats).
const FAKE = `
import fs from 'node:fs';
const dir = process.env.FAKE_DIR;
const script = JSON.parse(fs.readFileSync(dir + '/script.json', 'utf8'));
const argv = process.argv.slice(2).join(' ');
fs.appendFileSync(dir + '/calls.log', argv + '\\n');
const i = script.findIndex(s => argv.startsWith(s.match));
if (i < 0) { process.stderr.write('unexpected: ' + argv); process.exit(9); }
const countsFile = dir + '/counts.json';
const counts = fs.existsSync(countsFile) ? JSON.parse(fs.readFileSync(countsFile, 'utf8')) : {};
const n = counts[i] ?? 0;
counts[i] = n + 1;
fs.writeFileSync(countsFile, JSON.stringify(counts));
const a = script[i].answers[Math.min(n, script[i].answers.length - 1)];
process.stdout.write(a.stdout ?? '');
process.stderr.write(a.stderr ?? '');
process.exit(a.code ?? 0);
`;

function run(args, { script, state, stateText }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nclms-cli-'));
  const fake = path.join(root, 'fake');
  fs.mkdirSync(fake);
  fs.writeFileSync(path.join(fake, 'wrangler.mjs'), FAKE);
  fs.writeFileSync(path.join(fake, 'script.json'), JSON.stringify(script));
  const home = path.join(root, 'home');
  const dir = path.join(home, 'neuro-canvas-lms');
  fs.mkdirSync(dir, { recursive: true });
  if (state || stateText)
    fs.writeFileSync(path.join(dir, 'state.json'), stateText ?? JSON.stringify(state));
  const r = spawnSync(process.execPath, [CLI, ...args, '--lang', 'en'], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 60 * 1000,
    env: {
      ...process.env,
      NCLMS_HOME: home,
      NCLMS_WRANGLER: path.join(fake, 'wrangler.mjs'),
      FAKE_DIR: fake,
    },
  });
  const log = path.join(fake, 'calls.log');
  return {
    code: r.status,
    out: r.stdout + r.stderr,
    calls: fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : [],
    dir,
  };
}

const whoami = (...ids) => ({
  match: 'whoami',
  answers: [
    {
      // a warning that contains a brace, on stderr, before the JSON: must not break parsing
      stderr: '▲ [WARNING] config {old} is deprecated\n',
      stdout: JSON.stringify({
        email: 'me@example.edu',
        accounts: ids.map(id => ({ id, name: id })),
      }),
    },
  ],
});
const installed = { name: 'neuro-canvas-lms', accountId: 'acc1', kvId: 'k1', host: 'c.edu' };
const kvList = (...lists) => ({
  match: 'kv namespace list',
  answers: lists.map(l => ({ stdout: JSON.stringify(l) })),
});

test('uninstall: deletes the Worker, then the storage, checks it is gone, then the local record', () => {
  const r = run(['uninstall', '--yes'], {
    state: installed,
    script: [
      whoami('acc1'),
      { match: 'delete', answers: [{ stdout: 'Deleted' }] },
      kvList([{ id: 'k1', title: 'neuro-canvas-lms-oauth' }], []),
      { match: 'kv namespace delete', answers: [{ stdout: 'Deleted' }] },
    ],
  });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(
    r.calls.map(c => c.split(' ').slice(0, 3).join(' ')),
    [
      'whoami --json',
      'delete --name neuro-canvas-lms',
      'kv namespace list',
      'kv namespace delete',
      'kv namespace list',
    ],
  );
  assert.match(r.calls[3], /--namespace-id k1\b/);
  assert.equal(fs.existsSync(r.dir), false);
});

test('uninstall in another Cloudflare account deletes nothing', () => {
  const r = run(['uninstall', '--yes', '--account-id', 'acc2'], {
    state: installed,
    script: [whoami('acc1', 'acc2')],
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /installed in Cloudflare account acc1/);
  assert.deepEqual(r.calls, ['whoami --json']);
  assert.ok(fs.existsSync(path.join(r.dir, 'state.json')));
});

test('uninstall: storage still listed after deleting → fails and keeps the local record', () => {
  const r = run(['uninstall', '--yes'], {
    state: installed,
    script: [
      whoami('acc1'),
      { match: 'delete', answers: [{ stdout: 'Deleted' }] },
      kvList([{ id: 'k1', title: 'neuro-canvas-lms-oauth' }]),
      { match: 'kv namespace delete', answers: [{ stdout: 'Deleted' }] },
    ],
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /the storage "neuro-canvas-lms-oauth": Cloudflare still lists it/);
  assert.ok(fs.existsSync(path.join(r.dir, 'state.json')));
});

test("uninstall: the storage list can't be read → says why (wrangler's own error), deletes no storage", () => {
  const r = run(['uninstall', '--yes'], {
    state: installed,
    script: [
      whoami('acc1'),
      { match: 'delete', answers: [{ stdout: 'Deleted' }] },
      {
        match: 'kv namespace list',
        answers: [{ stderr: '✘ [ERROR] A request failed: 7003', code: 1 }],
      },
    ],
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /Could not read the list of your Cloudflare storage \(KV\).*7003/s);
  assert.ok(!r.calls.some(c => c.startsWith('kv namespace delete')));
  assert.ok(fs.existsSync(path.join(r.dir, 'state.json')));
});

test('a damaged state.json is moved aside and said so, not the same JSON error on every run', () => {
  const r = run(['--yes'], { stateText: '{"name": "neuro-can', script: [whoami('a1', 'a2')] });
  // two accounts and no terminal: it stops and lists them (no account is picked silently)
  assert.equal(r.code, 1);
  assert.match(r.out, /could not be read \(damaged\)/);
  assert.match(r.out, /--account-id a1/);
  assert.doesNotMatch(r.out, /JSON|Unexpected/);
  const files = fs.readdirSync(r.dir);
  assert.ok(!files.includes('state.json'), files.join());
  assert.ok(
    files.some(f => f.startsWith('state.json.damaged-')),
    files.join(),
  );
});

test('a login without any Cloudflare account gets a translated message', () => {
  const r = run(['--yes'], { script: [whoami()] });
  assert.equal(r.code, 1);
  assert.match(r.out, /me@example\.edu/);
  assert.match(r.out, /no account yet/);
});

test('check without an install says so (exit 1); an invalid --name is refused in plain words', () => {
  const none = run(['check'], { script: [] });
  assert.equal(none.code, 1);
  assert.deepEqual(none.calls, []);
  const bad = run(['check', '--name', 'Bad_Name'], { script: [] });
  assert.equal(bad.code, 1);
  assert.match(bad.out, /lowercase letters, digits and dashes/);
});
