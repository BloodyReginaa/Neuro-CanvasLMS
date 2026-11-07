import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSubdomain } from './subdomain.mjs';

const TOKEN = '{\n  "type": "oauth",\n  "token": "T"\n}\n'; // wrangler prints it over several lines
const ok = subdomain => ({ success: true, errors: [], result: { subdomain } });
const err = (code, message) => ({ success: false, errors: [{ code, message }], result: null });
const MISSING = err(10007, 'workers.api.error.subdomain_not_found');
const TAKEN = err(10031, 'workers.api.error.subdomain_unavailable');
const UNVERIFIED = err(10034, 'workers.api.error.email_verification_required');

// A fake Cloudflare API: answers in order and records every request.
function api(...answers) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body });
    const a = answers.shift();
    if (a instanceof Error) throw a;
    if (typeof a === 'string') return { status: 502, json: async () => JSON.parse(a) };
    return { status: a.success ? 200 : 400, json: async () => a };
  };
  return { fetcher, calls };
}
const names = () => {
  let n = 0;
  return () => `neuro-name${++n}`;
};

test('an account that already has a subdomain is only asked, never changed', async () => {
  const { fetcher, calls } = api(ok('alice42'));
  assert.deepEqual(await ensureSubdomain('acc1', { authOutput: TOKEN, fetcher }), {
    exists: 'alice42',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.equal(
    calls[0].url,
    'https://api.cloudflare.com/client/v4/accounts/acc1/workers/subdomain',
  );
  assert.equal(calls[0].headers.Authorization, 'Bearer T');
  assert.equal(calls[0].body, undefined);
});

test('a new account gets a random subdomain registered', async () => {
  const { fetcher, calls } = api(MISSING, ok('neuro-name1'));
  assert.deepEqual(
    await ensureSubdomain('acc1', { authOutput: TOKEN, fetcher, candidate: names() }),
    { created: 'neuro-name1' },
  );
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[1].body), { subdomain: 'neuro-name1' });
});

test('a taken name is retried with a new one, a few times at most', async () => {
  const twice = api(MISSING, TAKEN, TAKEN, ok('neuro-name3'));
  assert.deepEqual(
    await ensureSubdomain('acc1', {
      authOutput: TOKEN,
      fetcher: twice.fetcher,
      candidate: names(),
    }),
    { created: 'neuro-name3' },
  );
  assert.deepEqual(
    twice.calls.slice(1).map(c => JSON.parse(c.body).subdomain),
    ['neuro-name1', 'neuro-name2', 'neuro-name3'],
  );
  const always = api(MISSING, TAKEN, TAKEN, TAKEN, ok('never asked'));
  assert.deepEqual(
    await ensureSubdomain('acc1', {
      authOutput: TOKEN,
      fetcher: always.fetcher,
      candidate: names(),
    }),
    { skipped: 'every name tried was taken' },
  );
  assert.equal(always.calls.length, 4); // GET + 3 PUTs
});

test('an unverified email is reported, whether the question or the registration hits it', async () => {
  for (const answers of [[UNVERIFIED], [MISSING, UNVERIFIED]]) {
    const { fetcher } = api(...answers);
    assert.deepEqual(
      await ensureSubdomain('acc1', { authOutput: TOKEN, fetcher, candidate: names() }),
      { emailUnverified: true },
    );
  }
});

test('anything unexpected skips it (the deploy then falls back to the dashboard)', async () => {
  const cases = [
    [[err(10000, 'Authentication error')], /HTTP 400: 10000 Authentication error/],
    [[new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } })], /ENOTFOUND/],
    [['<html>bad gateway</html>'], /HTTP 502: no answer/],
    [[MISSING, err(10000, 'Authentication error')], /10000/],
    [[MISSING, new Error('socket hang up')], /socket hang up/],
  ];
  for (const [answers, reason] of cases) {
    const { fetcher, calls } = api(...answers);
    const r = await ensureSubdomain('acc1', { authOutput: TOKEN, fetcher, candidate: names() });
    assert.match(r.skipped ?? '', reason, JSON.stringify(r));
    assert.equal(calls.length, answers.length); // no further requests after the failure
  }
});

test('credentials are read from wrangler output however it is wrapped, and never guessed', async () => {
  for (const out of [
    TOKEN,
    `▲ [WARNING] A newer version of wrangler is available\n${TOKEN}`,
    `${TOKEN}\n▲ [WARNING] something {odd} happened }\n`,
    `▲ [WARNING] {"not": "it"} and { broken\n${TOKEN}`,
    '{"type":"api_token","token":"T"}',
  ]) {
    const { fetcher, calls } = api(ok('alice42'));
    assert.deepEqual(await ensureSubdomain('acc1', { authOutput: out, fetcher }), {
      exists: 'alice42',
    });
    assert.equal(calls[0].headers.Authorization, 'Bearer T', out);
  }
  const key = api(ok('alice42'));
  await ensureSubdomain('acc1', {
    authOutput: '{"type":"api_key","key":"K","email":"e@x.edu"}',
    fetcher: key.fetcher,
  });
  assert.equal(key.calls[0].headers['X-Auth-Key'], 'K');
  assert.equal(key.calls[0].headers['X-Auth-Email'], 'e@x.edu');
  assert.equal(key.calls[0].headers.Authorization, undefined);
  // not signed in, or wrangler too old for `auth token`: no request at all
  for (const out of ['', 'Not logged in. Please run `wrangler login`.', undefined]) {
    const { fetcher, calls } = api(ok('x'));
    assert.deepEqual(await ensureSubdomain('acc1', { authOutput: out, fetcher }), {
      skipped: 'no usable Cloudflare credentials',
    });
    assert.equal(calls.length, 0);
  }
});
