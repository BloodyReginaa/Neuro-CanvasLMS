import test from 'node:test';
import assert from 'node:assert/strict';
import { CANVAS_HOST as H } from './config.mjs';
import {
  fileDownloadLink,
  issueDownload,
  redeemDownload,
  newDownloadId,
  linkExpiry,
  safeFileName,
  DOWNLOAD_TTL,
  DOWNLOAD_HEADER,
} from './download-link.mjs';

const NOW = Date.UTC(2026, 10, 6, 23, 0, 0);
const jwt = claims =>
  ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'c2ln'].join('.');
const meta = (extra = {}) => ({
  id: 5,
  display_name: 'hamspam-student.zip',
  size: 65822,
  'content-type': 'application/zip',
  url: `https://${H}/files/5/download?download_frd=1&verifier=PERMANENT`,
  ...extra,
});
const api = m => async u => {
  assert.match(String(u), /\/api\/v1\/files\/5/);
  return Response.json(m);
};
const STORAGE = `https://a1-5.cluster1.canvas-user-content.com/files/5/download?download_frd=1&sf_verifier=${jwt({ exp: NOW / 1000 + 300, jti: 'x' })}&verifier=PERMANENT`;
const WORKER = 'https://neuro-canvas-lms.you.workers.dev';
// A KV store with expiry, on a clock the tests move.
function memoryKV(clock) {
  const data = new Map();
  return {
    data,
    get: async k => {
      const e = data.get(k);
      return e && (!e.until || clock() < e.until) ? e.v : null;
    },
    put: async (k, v, o = {}) =>
      void data.set(k, { v, until: o.expirationTtl ? clock() + o.expirationTtl * 1000 : 0 }),
    delete: async k => void data.delete(k),
  };
}

test('the AI gets a Worker link; Canvas’s address (minus the permanent pass) stays on the server', async () => {
  const seen = [];
  const stored = [];
  const r = await fileDownloadLink({ file_id: 5 }, 'SECRET', api(meta()), {
    fetcher: async (u, init) => {
      seen.push({ u: String(u), auth: init.headers.Authorization });
      return new Response(null, { status: 302, headers: { location: STORAGE } });
    },
    issue: async target => (stored.push(target), `${WORKER}/dl/ID`),
  });
  assert.equal(seen.length, 1); // only Canvas's download address; the storage address is not used
  assert.match(seen[0].u, new RegExp(`^https://${H}/files/5/download`));
  assert.equal(seen[0].auth, undefined); // no Canvas token on downloads
  assert.ok(stored[0].includes('sf_verifier=') && !/[?&]verifier=/.test(stored[0]));
  assert.equal(r.download_url, `${WORKER}/dl/ID`);
  const out = JSON.stringify(r);
  for (const hidden of ['PERMANENT', 'canvas-user-content', 'sf_verifier'])
    assert.ok(!out.includes(hidden), hidden);
  assert.equal(r.expires_in_seconds, DOWNLOAD_TTL);
  assert.equal(
    r.command,
    `curl -L --fail -H "${DOWNLOAD_HEADER}: 1" -o "hamspam-student.zip" "${WORKER}/dl/ID"`,
  );
  assert.ok(r.command_windows.startsWith('curl.exe -L --fail -H '));
  assert.match(r.check, /65822 bytes.*unzip -t/);
});

test('follows redirects inside Canvas, but stops at the first storage address', async () => {
  let calls = 0;
  let target;
  await fileDownloadLink({ file_id: 5 }, 't', api(meta()), {
    fetcher: async u => {
      calls++;
      const location = String(u).includes('/courses/')
        ? STORAGE
        : `https://${H}/courses/1/files/5/download?verifier=PERMANENT`;
      return new Response(null, { status: 302, headers: { location } });
    },
    issue: async t => ((target = t), `${WORKER}/dl/ID`),
  });
  assert.equal(calls, 2);
  assert.match(target, /canvas-user-content\.com/);
});

test('no link when the address is unsigned, unexpected, a login page or the file is locked', async () => {
  const run = (fetcher, m = meta()) =>
    fileDownloadLink({ file_id: 5 }, 't', api(m), { fetcher, issue: async () => 'x' });
  const to = location => async () => new Response(null, { status: 302, headers: { location } });
  await assert.rejects(
    run(async () => new Response('PK')),
    /canvas_file_original/,
  );
  await assert.rejects(
    run(to('https://a1-5.cluster1.canvas-user-content.com/files/5/download?verifier=PERMANENT')),
    /signed/,
  );
  await assert.rejects(run(to('https://evil.example.org/x')), /unsafe|unexpected/);
  await assert.rejects(run(to(`https://${H}/login/saml`)), /login page/);
  await assert.rejects(run(to('http://a1-5.cluster1.canvas-user-content.com/x')), /unsafe/);
  await assert.rejects(run(to(STORAGE), meta({ locked_for_user: true })), /locked/);
  await assert.rejects(run(to(STORAGE), meta({ url: null })), /did not provide/);
  await assert.rejects(
    fileDownloadLink({ file_id: 5, url: 'https://evil.example.org' }, 't', api(meta()), {
      issue: async () => 'x',
    }),
    /only a positive/,
  );
});

test('files shared "only with link" (hidden from the Files list) get a link too', async () => {
  const hidden = meta({ hidden: true, hidden_for_user: true, locked_for_user: false });
  const r = await fileDownloadLink({ file_id: 5 }, 't', api(hidden), {
    fetcher: async () => new Response(null, { status: 302, headers: { location: STORAGE } }),
    issue: async () => `${WORKER}/dl/ID`,
  });
  assert.equal(r.download_url, `${WORKER}/dl/ID`);
});

test('a /dl link works once, for 5 minutes, only with the header; a preview does not use it up', async () => {
  let t = NOW;
  const clock = () => t;
  const kv = memoryKV(clock);
  const link = await issueDownload(kv, WORKER, STORAGE, clock);
  const id = link.slice(`${WORKER}/dl/`.length);
  assert.match(id, /^[A-Za-z0-9_-]{43}$/);
  const get = (headers = { [DOWNLOAD_HEADER]: '1' }, method = 'GET') =>
    redeemDownload(new Request(link, { method, headers }), kv, id, clock);
  // a browser or link preview: refused, and the link still works afterwards
  assert.equal((await get({})).status, 403);
  assert.equal((await get({ 'User-Agent': 'Slackbot-LinkExpanding' })).status, 403);
  assert.equal((await get(undefined, 'HEAD')).status, 405);
  const ok = await get();
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.get('location'), STORAGE);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  assert.equal((await get()).status, 410); // once
  // expiry: refused after 5 minutes, even if the store still returned it
  const late = await issueDownload(kv, WORKER, STORAGE, clock);
  const lateId = late.slice(`${WORKER}/dl/`.length);
  t += DOWNLOAD_TTL * 1000 + 1;
  const stale = memoryKV(() => NOW); // a store whose own expiry lags
  stale.data.set('dl:' + lateId, kv.data.get('dl:' + lateId));
  assert.equal(
    (
      await redeemDownload(
        new Request(late, { headers: { [DOWNLOAD_HEADER]: '1' } }),
        stale,
        lateId,
        clock,
      )
    ).status,
    410,
  );
  assert.equal(stale.data.has('dl:' + lateId), false);
  // malformed or guessed ids
  for (const bad of ['', 'abc', '../../etc', 'x'.repeat(44)])
    assert.equal(
      (
        await redeemDownload(
          new Request(WORKER, { headers: { [DOWNLOAD_HEADER]: '1' } }),
          kv,
          bad,
          clock,
        )
      ).status,
      404,
    );
  assert.notEqual(newDownloadId(), newDownloadId());
});

test('signatures are recognised (JWT, S3, Expires); names are safe in a shell', () => {
  assert.equal(linkExpiry(new URL(`https://x.example.org/?token=${jwt({ exp: 123456 })}`)), 123456);
  assert.equal(
    linkExpiry(
      new URL('https://b.s3.amazonaws.com/f?X-Amz-Date=20261106T230000Z&X-Amz-Expires=300'),
    ),
    NOW / 1000 + 300,
  );
  assert.equal(linkExpiry(new URL('https://cdn.example.org/f?Expires=1800000000')), 1800000000);
  assert.equal(linkExpiry(new URL('https://cdn.example.org/f?verifier=abc')), null);
  assert.equal(safeFileName('hamspam-student.zip'), 'hamspam-student.zip');
  assert.equal(safeFileName('../../etc/passwd'), 'passwd');
  assert.equal(safeFileName('a"$(rm -rf ~)`.zip'), 'a__(rm -rf ~)_.zip');
  assert.equal(safeFileName('.bashrc'), 'bashrc');
  assert.equal(safeFileName(''), 'canvas-file');
});
