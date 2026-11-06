import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDeployment, errorDetail } from './verify.mjs';
import { CHECK_WAIT, WARMUP_WAIT } from './lib.mjs';

const URL = 'https://neuro-canvas-lms.example.workers.dev';
// A fake clock: waiting between attempts moves it forward, so minutes pass instantly.
function clock() {
  let t = 0;
  return { now: () => t, sleep: async ms => void (t += ms) };
}
const tlsError = () =>
  new TypeError('fetch failed', { cause: { code: 'ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE' } });
const healthy =
  (version = '2.11.0', connected = false) =>
  (url, init) =>
    url.endsWith('/healthz')
      ? Response.json({ ok: true, version, connected })
      : new Response('Unauthorized', { status: 401 });

test('a new address that fails TLS for minutes is waited for, then reported ready', async () => {
  const c = clock();
  let calls = 0;
  let warned = 0;
  const failFor = CHECK_WAIT * 2; // longer than the normal minute
  const r = await verifyDeployment(URL, '2.11.0', {
    ...c,
    fetcher: async (url, init) => {
      calls++;
      if (c.now() < failFor) throw tlsError();
      return healthy()(url, init);
    },
    onWarmup: () => warned++,
  });
  assert.deepEqual(r, { ok: true, version: '2.11.0', connected: false });
  assert.equal(warned, 1); // told once, not on every attempt
  assert.ok(c.now() >= failFor && c.now() < WARMUP_WAIT);
});

test('TLS that never comes up stops at the longer deadline and keeps the real error', async () => {
  const c = clock();
  const r = await verifyDeployment(URL, '2.11.0', {
    ...c,
    fetcher: async () => {
      throw tlsError();
    },
  });
  assert.equal(r.ok, false);
  assert.equal(r.detail, 'ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE');
  assert.ok(c.now() >= WARMUP_WAIT && c.now() < WARMUP_WAIT + 10000);
});

test('a request that never answers is cut off, and the check still ends', async () => {
  const c = clock();
  let calls = 0;
  const started = Date.now();
  const r = await verifyDeployment(URL, '2.11.0', {
    ...c,
    requestTimeout: 15,
    fetcher: (url, init) =>
      new Promise((_, reject) => {
        calls++;
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
      }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.detail, 'no answer (timeout)');
  assert.equal(calls, CHECK_WAIT / 3000 + 1); // at 0 s, then every 3 s up to the minute
  assert.ok(Date.now() - started < 5000);
});

test('a real failure is reported after the normal minute, not five', async () => {
  for (const [fetcher, detail] of [
    [async () => new Response('oops', { status: 500 }), '/healthz HTTP 500'],
    [async () => Response.json({ ok: true, version: '2.10.1' }), 'still version 2.10.1'],
    // no OAuth in front of /mcp: not the connector we deployed
    [
      async url =>
        url.endsWith('/healthz')
          ? Response.json({ ok: true, version: '2.11.0' })
          : new Response('{}'),
      '/mcp HTTP 200 (expected 401)',
    ],
  ]) {
    const c = clock();
    const r = await verifyDeployment(URL, '2.11.0', { ...c, fetcher });
    assert.deepEqual(r, { ok: false, detail });
    assert.ok(c.now() >= CHECK_WAIT && c.now() < CHECK_WAIT + 10000, detail);
  }
});

test('the version must match, and connected is passed on; without a version any is accepted', async () => {
  let version = '2.10.1';
  const c = clock();
  const r = await verifyDeployment(URL, '2.11.0', {
    ...c,
    fetcher: async (url, init) => {
      if (c.now() > 6000) version = '2.11.0'; // the new version takes over after a few seconds
      return healthy(version, true)(url, init);
    },
  });
  assert.deepEqual(r, { ok: true, version: '2.11.0', connected: true });
  const any = await verifyDeployment(URL, undefined, { ...clock(), fetcher: healthy('2.9.4') });
  assert.equal(any.ok, true);
});

test('error details name the cause, not just "fetch failed"', () => {
  assert.equal(errorDetail(tlsError()), 'ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE');
  assert.equal(
    errorDetail(new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } })),
    'ENOTFOUND',
  );
  assert.equal(errorDetail(new DOMException('timed out', 'TimeoutError')), 'no answer (timeout)');
  assert.equal(errorDetail(new Error('boom')), 'boom');
});
