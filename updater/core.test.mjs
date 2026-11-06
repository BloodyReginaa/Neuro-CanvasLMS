import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { run, compareVersions, validateManifest, SOAK_MS, CHECK_INTERVAL_MS } from './core.mjs';
import { UPDATE_KEYS as K } from '../update-keys.mjs';
import { RELEASE_PUBLIC_KEY } from './release-public-key.mjs';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const RELEASE = 'https://releases.example/';
const keys = generateKeyPairSync('ed25519');
const PUB = Buffer.from(keys.publicKey.export({ format: 'jwk' }).x, 'base64url').toString('base64');

function kv(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    m,
    get: async k => m.get(k) ?? null,
    put: async (k, v) => void m.set(k, v),
    delete: async k => void m.delete(k),
  };
}
function release({
  version = '2.2.0',
  publishedAgo = 2 * SOAK_MS,
  bundle = 'export default {}',
  tamper,
  ...over
} = {}) {
  const bytes = Buffer.from(bundle);
  const manifest = {
    schema: 1,
    name: 'neuro-canvas-lms',
    version,
    published_at: new Date(NOW - publishedAgo).toISOString(),
    min_updater: 1,
    compatibility_date: '2026-09-23',
    compatibility_flags: ['nodejs_compat'],
    main_module: 'worker.js',
    required_bindings: ['OAUTH_KV'],
    files: [
      {
        name: 'worker.js',
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        type: 'application/javascript+module',
      },
    ],
    ...over,
  };
  const mBytes = Buffer.from(JSON.stringify(manifest));
  const sig = sign(null, mBytes, keys.privateKey).toString('base64');
  const files = {
    'release.json':
      tamper === 'manifest'
        ? Buffer.from(JSON.stringify({ ...manifest, version: '9.9.9' }))
        : mBytes,
    'release.json.sig': Buffer.from(sig),
    'worker.js': tamper === 'bundle' ? Buffer.from(bundle + '//evil') : bytes,
  };
  return async url => {
    const name = url.slice(RELEASE.length);
    return files[name] ? new Response(files[name]) : new Response('nope', { status: 404 });
  };
}
// The connector, reached through the service binding. It serves `version` until a deployment of
// the uploaded version happens, then serves `nextVersion` (or breaks, when healthy is false).
function connector({ version = '2.1.0', healthy = true } = {}) {
  const c = { serving: version, uploaded: null };
  c.fetch = async url => {
    const p = new URL(url).pathname;
    if (c.serving === 'broken') return new Response('boom', { status: 500 });
    if (p === '/healthz') return Response.json({ ok: true, version: c.serving });
    if (p === '/.well-known/oauth-authorization-server') return Response.json({ issuer: 'x' });
    if (p === '/mcp') return new Response('unauthorized', { status: 401 });
    return new Response('?', { status: 404 });
  };
  c.deployed = (id, nextVersion) => {
    c.serving = id === 'old-version' ? version : healthy ? nextVersion : 'broken';
  };
  return c;
}
function cloudflare(
  main,
  { bindings = ['OAUTH_KV', 'UPDATER'], split = false, nextVersion = '2.2.0' } = {},
) {
  const calls = [];
  const cf = async (method, path, body) => {
    calls.push({ method, path, body });
    if (method === 'GET' && path === '/settings')
      return { bindings: bindings.map(name => ({ name, type: 'x' })) };
    if (method === 'GET' && path === '/deployments')
      return {
        deployments: [
          {
            versions: split
              ? [
                  { version_id: 'old-version', percentage: 50 },
                  { version_id: 'b', percentage: 50 },
                ]
              : [{ version_id: 'old-version', percentage: 100 }],
          },
        ],
      };
    if (method === 'POST' && path.startsWith('/versions')) return { id: 'new-version' };
    if (method === 'POST' && path.startsWith('/deployments')) {
      main.deployed(body.versions[0].version_id, nextVersion);
      return { id: 'dep' };
    }
    throw new Error('unexpected ' + method + ' ' + path);
  };
  cf.calls = calls;
  return cf;
}
async function pass({
  env: envOver = {},
  store = {},
  rel = {},
  main = connector(),
  cfOpts = {},
} = {}) {
  const env = {
    STATE: kv(store),
    MAIN: main,
    RELEASE_URL: RELEASE,
    RELEASE_PUBLIC_KEY: PUB,
    UPDATE_MODE: 'auto',
    ...envOver,
  };
  const cf = cloudflare(main, cfOpts);
  const status = await run({ env, fetchImpl: release(rel), cf, now: NOW, sleep: async () => {} });
  return { status, env, cf, main };
}
const uploads = cf => cf.calls.filter(c => c.method === 'POST' && c.path.startsWith('/versions'));
const deploys = cf =>
  cf.calls.filter(c => c.method === 'POST' && c.path.startsWith('/deployments'));

test('version comparison', () => {
  assert.equal(compareVersions('2.10.0', '2.9.9'), 1);
  assert.equal(compareVersions('2.1.0', '2.1.0'), 0);
  assert.equal(compareVersions('0.0.0', '2.1.0'), -1);
});

test('the shipped public key is a real 32-byte Ed25519 key', () => {
  assert.equal(Buffer.from(RELEASE_PUBLIC_KEY, 'base64').length, 32);
});

test('up to date: nothing is uploaded', async () => {
  const { status, cf } = await pass({ rel: { version: '2.1.0' } });
  assert.equal(status.state, 'up_to_date');
  assert.equal(cf.calls.length, 0);
});

test('notify mode only reports a newer release', async () => {
  const { status, cf, env } = await pass({ env: { UPDATE_MODE: 'notify' } });
  assert.equal(status.state, 'available');
  assert.equal(status.latest, '2.2.0');
  assert.equal(cf.calls.length, 0);
  assert.equal(JSON.parse(env.STATE.m.get(K.status)).state, 'available');
});

test('auto mode on the stable channel waits out the 24-hour observation period', async () => {
  const { status, cf } = await pass({ rel: { publishedAgo: 2 * 3600 * 1000 } });
  assert.equal(status.state, 'waiting');
  assert.equal(cf.calls.length, 0);
});

test('auto mode installs: strict inherit of every binding, deploy at 100%, health-checked', async () => {
  const { status, cf, env } = await pass();
  assert.equal(status.state, 'updated');
  assert.equal(status.current, '2.2.0');
  const [up] = uploads(cf);
  assert.equal(up.path, '/versions?bindings_inherit=strict');
  const meta = JSON.parse(await up.body.get('metadata').text());
  assert.deepEqual(meta.bindings, [
    { type: 'inherit', name: 'OAUTH_KV' },
    { type: 'inherit', name: 'UPDATER' },
  ]);
  assert.equal(meta.main_module, 'worker.js');
  assert.equal(meta.annotations['workers/tag'], 'v2.2.0');
  assert.equal(await up.body.get('worker.js').text(), 'export default {}');
  const [d] = deploys(cf);
  assert.deepEqual(d.body.versions, [{ version_id: 'new-version', percentage: 100 }]);
  assert.equal(env.STATE.m.has(K.lock), false, 'lock released');
});

test('the early channel (maintainer canary) installs at once', async () => {
  const { status } = await pass({ env: { CHANNEL: 'early' }, rel: { publishedAgo: 60 * 1000 } });
  assert.equal(status.state, 'updated');
});

test('an owner request installs even in notify mode and is then cleared', async () => {
  const { status, env } = await pass({
    env: { UPDATE_MODE: 'notify' },
    store: { [K.request]: 'yes' },
    rel: { publishedAgo: 1000 },
  });
  assert.equal(status.state, 'updated');
  assert.equal(env.STATE.m.has(K.request), false);
});

test('a failed health check rolls back (forced) and the release is never retried', async () => {
  const main = connector({ healthy: false });
  const first = await pass({ main });
  assert.equal(first.status.state, 'rolled_back');
  const ds = deploys(first.cf);
  assert.equal(ds.length, 2);
  assert.equal(ds[1].path, '/deployments?force=true');
  assert.deepEqual(ds[1].body.versions, [{ version_id: 'old-version', percentage: 100 }]);
  assert.equal(main.serving, '2.1.0', 'old version is live again');
  assert.ok(first.env.STATE.m.has(K.bad('2.2.0')));

  const again = await pass({
    main,
    store: { ...Object.fromEntries(first.env.STATE.m), [K.lastCheck]: '0' },
    env: {},
  });
  assert.equal(again.status.state, 'rolled_back');
  assert.equal(uploads(again.cf).length, 0, 'bad release not retried');
});

test('a manifest not signed by the maintainer is rejected before anything else', async () => {
  const { status, cf } = await pass({ rel: { tamper: 'manifest' } });
  assert.equal(status.state, 'error');
  assert.match(status.message, /signature/);
  assert.equal(cf.calls.length, 0);
});

test('a bundle that does not match the signed hash is never uploaded', async () => {
  const { status, cf } = await pass({ rel: { tamper: 'bundle' } });
  assert.equal(status.state, 'error');
  assert.match(status.message, /does not match the signed manifest/);
  assert.equal(uploads(cf).length, 0);
});

test('releases that need new settings, a new major version or a newer updater are not auto-installed', async () => {
  const a = await pass({ rel: { required_bindings: ['OAUTH_KV', 'NEW_BUCKET'] } });
  assert.equal(a.status.state, 'manual_required');
  assert.match(a.status.message, /NEW_BUCKET/);
  assert.equal(uploads(a.cf).length, 0);
  const b = await pass({ rel: { version: '3.0.0' } });
  assert.equal(b.status.state, 'manual_required');
  assert.equal(b.cf.calls.length, 0);
  const c = await pass({ rel: { min_updater: 99 } });
  assert.equal(c.status.state, 'manual_required');
  assert.equal(c.cf.calls.length, 0);
});

test('a gradual (split) deployment in progress is left alone', async () => {
  const { status, cf } = await pass({ cfOpts: { split: true } });
  assert.equal(status.state, 'manual_required');
  assert.equal(uploads(cf).length, 0);
});

test('runs are spaced out and never overlap', async () => {
  const recent = await pass({ store: { [K.lastCheck]: String(NOW - 60_000) } });
  assert.deepEqual(recent.status, { skipped: 'interval' });
  const old = await pass({
    store: { [K.lastCheck]: String(NOW - CHECK_INTERVAL_MS - 1), [K.lock]: '1' },
  });
  assert.deepEqual(old.status, { skipped: 'locked' });
});

test('manifest validation rejects path tricks and missing fields', () => {
  const good = {
    schema: 1,
    name: 'neuro-canvas-lms',
    version: '2.2.0',
    published_at: new Date().toISOString(),
    min_updater: 1,
    compatibility_date: '2026-09-23',
    compatibility_flags: [],
    main_module: 'worker.js',
    required_bindings: [],
    files: [{ name: 'worker.js', size: 1, sha256: 'a'.repeat(64), type: 'x' }],
  };
  assert.ok(validateManifest(good));
  for (const bad of [
    { ...good, files: [{ ...good.files[0], name: '../worker.js' }] },
    { ...good, main_module: 'other.js' },
    { ...good, version: 'latest' },
    { ...good, name: 'something-else' },
  ])
    assert.throws(() => validateManifest(bad));
});

test('worst case stays inside the Free plan budget of 50 subrequests per run', async () => {
  let fetches = 0;
  const main = connector({ healthy: false });
  const counted = {
    ...main,
    fetch: (...a) => (fetches++, main.fetch(...a)),
    deployed: main.deployed,
  };
  const env = {
    STATE: kv(),
    MAIN: counted,
    RELEASE_URL: RELEASE,
    RELEASE_PUBLIC_KEY: PUB,
    UPDATE_MODE: 'auto',
  };
  const cf = cloudflare(main);
  const rel = release();
  const status = await run({
    env,
    fetchImpl: (...a) => (fetches++, rel(...a)),
    cf,
    now: NOW,
    sleep: async () => {},
  });
  assert.equal(status.state, 'rolled_back');
  const total = fetches + cf.calls.length;
  assert.ok(total <= 50, `used ${total} subrequests`);
});
