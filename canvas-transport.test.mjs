import { CANVAS_HOST as H } from './config.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createCanvasTransport, parseCanvasResponse } from './canvas-transport.mjs';
import { callCanvas } from './canvas.mjs';
const enc = new TextEncoder();
const NO_FETCH = () => {
  throw new Error('fetch must not be used in socket mode');
};
const SOCKET_ONLY = { mode: () => 'socket' };
const API = {
  method: 'GET',
  redirect: 'manual',
  headers: { Authorization: 'Bearer t', Accept: 'application/json', 'User-Agent': 'UA' },
};
const okSocket = () =>
  fixture(
    wire(
      'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 13',
      '{"via":"tls"}',
    ),
  );
const wire = (head, body = '') =>
  new Uint8Array(Buffer.concat([Buffer.from(head + '\r\n\r\n'), Buffer.from(body)]));
function fixture(bytes) {
  let request = '',
    closes = 0,
    connection;
  return {
    connect: (address, options) => {
      connection = { address, options };
      return {
        opened: Promise.resolve(),
        closed: Promise.resolve(),
        close: async () => {
          closes++;
        },
        writable: new WritableStream({
          write: x => {
            request += new TextDecoder().decode(x);
          },
        }),
        readable: new ReadableStream({
          start(c) {
            for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.subarray(i, i + 7));
            c.close();
          },
        }),
      };
    },
    get request() {
      return request;
    },
    get closes() {
      return closes;
    },
    get connection() {
      return connection;
    },
  };
}
test('TLS transport retains same Canvas authentication and GET routing', async () => {
  const f = fixture(
    wire(
      `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 2\r\nLink: <https://${H}/api/v1/courses?page=2>; rel="next"`,
      '[]',
    ),
  );
  const result = await callCanvas(
    'canvas_courses',
    {},
    'test-token',
    createCanvasTransport(f.connect, NO_FETCH, SOCKET_ONLY),
  );
  assert.deepEqual(result.data, []);
  assert.equal(result.next_page, 2);
  assert.deepEqual(f.connection, {
    address: { hostname: `${H}`, port: 443 },
    options: { secureTransport: 'on' },
  });
  assert.match(f.request, /^GET \/api\/v1\/courses\?/);
  assert.match(f.request, /authorization: Bearer test-token\r\n/);
  assert.doesNotMatch(f.request, /CF-Worker:/i);
  assert.equal(f.closes, 1);
});
test('chunked JSON is reconstructed across split socket reads and trailers', async () => {
  const f = fixture(
    wire(
      'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked',
      '3\r\n{"a\r\n4;test=value\r\n":1}\r\n0\r\nX-Trace: ignored\r\n\r\n',
    ),
  );
  const r = await createCanvasTransport(
    f.connect,
    NO_FETCH,
    SOCKET_ONLY,
  )(`https://${H}/api/v1/test`, {
    method: 'GET',
    redirect: 'manual',
  });
  assert.deepEqual(await r.json(), { a: 1 });
  assert.equal(r.headers.get('transfer-encoding'), null);
});
test('interim responses and gzip responses are decoded', async () => {
  const zipped = gzipSync('[1,2]');
  const r = await parseCanvasResponse(
    wire(
      `HTTP/1.1 103 Early Hints\r\n\r\nHTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\nContent-Length: ${zipped.length}`,
      zipped,
    ),
  );
  assert.deepEqual(await r.json(), [1, 2]);
  assert.equal(r.headers.get('content-encoding'), null);
});
test('truncated, ambiguous and oversized responses fail closed', async () => {
  for (const bytes of [
    wire('HTTP/1.1 200 OK\r\nContent-Length: 5', '[]'),
    wire('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 2', '[]'),
    wire('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked', '1000001\r\n'),
    wire('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked', '2\r\n[]\r\n'),
    wire('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked', '0\r\n\r\nextra'),
    enc.encode('HTTP/1.1 200 OK\r\nX: ' + 'x'.repeat(40000) + '\r\n\r\n'),
  ])
    await assert.rejects(parseCanvasResponse(bytes), /^Error: Canvas transport: /);
});
test('redirect responses never initiate another request or send credentials onward', async () => {
  const f = fixture(
    wire('HTTP/1.1 302 Found\r\nLocation: https://other.test\r\nContent-Length: 0'),
  );
  await assert.rejects(
    callCanvas(
      'canvas_profile',
      {},
      'private',
      createCanvasTransport(f.connect, NO_FETCH, SOCKET_ONLY),
    ),
    /HTTP 302/,
  );
  assert.equal(f.closes, 1);
});
test('credentials cannot leave the fixed API and writes or injected headers are rejected', async () => {
  // Each request must be refused by the transport's own checks, before anything is sent: the
  // stubs only count (a stub that throws would make a missing check look like a refusal).
  let sent = 0;
  const client = createCanvasTransport(
    () => {
      sent++;
      return { readable: new ReadableStream(), writable: new WritableStream(), close() {} };
    },
    async () => {
      sent++;
      return Response.json({});
    },
    { mode: () => 'auto' },
  );
  const refused = async (url, opt, pattern) => {
    await assert.rejects(client(url, opt), pattern, `${url} ${JSON.stringify(opt)}`);
    assert.equal(sent, 0, `nothing was sent for ${url} ${JSON.stringify(opt)}`);
  };
  const auth = { method: 'GET', redirect: 'manual', headers: { Authorization: 'Bearer private' } };
  for (const url of [
    'https://evil.test/api/v1/test',
    `http://${H}/api/v1/test`,
    `https://${H}/files/1`,
  ])
    await refused(url, auth, /credentials cannot leave the fixed API origin/);
  await refused(`https://user@${H}/api/v1/test`, auth, /only fixed read-only API requests/);
  await refused(`https://u:pw@${H}/api/v1/test`, auth, /only fixed read-only API requests/);
  for (const opt of [
    { method: 'POST', redirect: 'manual' },
    { method: 'GET', redirect: 'follow' },
    { method: 'GET', redirect: 'manual', body: 'x' },
  ])
    await refused(`https://${H}/api/v1/test`, opt, /only fixed read-only API requests/);
  for (const headers of [{ Host: 'evil.test' }, { Cookie: 'x=1' }])
    await refused(
      `https://${H}/api/v1/test`,
      { method: 'GET', redirect: 'manual', headers },
      /unexpected request header/,
    );
  // A header with CRLF never reaches the wire: Headers itself rejects it.
  await refused(
    `https://${H}/api/v1/test`,
    { method: 'GET', redirect: 'manual', headers: { Authorization: 'Bearer private\r\nX: evil' } },
    TypeError,
  );
  // And a valid request does go out (the counter works).
  await client(`https://${H}/api/v1/test`, auth);
  assert.equal(sent, 1);
});
test('file downloads use the existing fetch path without Authorization', async () => {
  let calls = 0;
  const client = createCanvasTransport(
    () => {
      throw new Error('unexpected TLS');
    },
    async (u, opt) => {
      calls++;
      assert.equal(new Headers(opt.headers).has('authorization'), false);
      return new Response('file');
    },
  );
  assert.equal(
    await (
      await client('https://files.inscloudgate.net/file', {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: '*/*' },
      })
    ).text(),
    'file',
  );
  assert.equal(calls, 1);
});
test('already aborted requests do not connect', async () => {
  let called = false;
  const client = createCanvasTransport(() => {
    called = true;
  });
  await assert.rejects(
    client(`https://${H}/api/v1/test`, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.abort(),
    }),
    { name: 'AbortError' },
  );
  assert.equal(called, false);
});

test('auto mode: a normal JSON answer from fetch is used and the socket is never opened', async () => {
  const logs = [];
  let seen;
  const client = createCanvasTransport(
    () => {
      throw new Error('socket must not open');
    },
    async (u, opt) => {
      seen = { u, opt };
      return Response.json({ via: 'fetch' });
    },
    { log: x => logs.push(x) },
  );
  const r = await client(`https://${H}/api/v1/users/self/profile?x=1`, API);
  assert.deepEqual(await r.json(), { via: 'fetch' });
  assert.equal(seen.u, `https://${H}/api/v1/users/self/profile?x=1`);
  assert.equal(seen.opt.method, 'GET');
  assert.equal(seen.opt.redirect, 'manual');
  assert.equal(new Headers(seen.opt.headers).get('authorization'), 'Bearer t');
  assert.deepEqual([...new Headers(seen.opt.headers).keys()].sort(), [
    'accept',
    'authorization',
    'user-agent',
  ]);
  assert.deepEqual(logs, [{ via: 'fetch', status: 200 }]);
});

test('auto mode falls back to the socket on 406, HTML error pages and network errors', async () => {
  for (const [label, fetcher] of [
    [
      '406',
      async () =>
        new Response('<h1>Not Acceptable</h1>', {
          status: 406,
          headers: { 'content-type': 'text/html' },
        }),
    ],
    [
      'html 500',
      async () =>
        new Response('<title>x</title>', { status: 500, headers: { 'content-type': 'text/html' } }),
    ],
    [
      'html 403',
      async () =>
        new Response('<title>Not Authorized</title>', {
          status: 403,
          headers: { 'content-type': 'text/html' },
        }),
    ],
    [
      'network',
      async () => {
        throw new TypeError('network down');
      },
    ],
  ]) {
    const f = okSocket();
    const logs = [];
    const r = await createCanvasTransport(f.connect, fetcher, { log: x => logs.push(x) })(
      `https://${H}/api/v1/x`,
      API,
    );
    assert.deepEqual(await r.json(), { via: 'tls' }, label);
    assert.equal(logs[0].via, 'socket', label);
    assert.match(logs[0].reason, /^fetch /, label);
    assert.match(f.request, /^GET \/api\/v1\/x HTTP\/1\.1\r\n/, label);
    assert.match(f.request, /authorization: Bearer t\r\n/, label);
  }
});

test('auto mode does NOT fall back on genuine Canvas JSON answers (401/403/404) or redirects', async () => {
  for (const response of [
    () => Response.json({ errors: [{ message: 'Invalid access token.' }] }, { status: 401 }),
    () => Response.json({ status: 'unauthorized' }, { status: 403 }),
    () => Response.json({ errors: [] }, { status: 404 }),
    () => new Response(null, { status: 302, headers: { location: 'https://evil.test/' } }),
  ]) {
    const r = await createCanvasTransport(
      () => {
        throw new Error('socket must not open');
      },
      async () => response(),
    )(`https://${H}/api/v1/x`, API);
    assert.ok([401, 403, 404, 302].includes(r.status));
  }
  await assert.rejects(
    callCanvas(
      'canvas_profile',
      {},
      't',
      createCanvasTransport(
        () => {
          throw new Error('socket must not open');
        },
        async () =>
          new Response(null, { status: 302, headers: { location: 'https://evil.test/' } }),
      ),
    ),
    /HTTP 302/,
  );
});

test('fetch path is size-bounded and an oversize answer is not retried over the socket', async () => {
  const client = createCanvasTransport(
    () => {
      throw new Error('socket must not open');
    },
    async () =>
      new Response('x', {
        headers: { 'content-type': 'application/json', 'content-length': String(17 * 1024 * 1024) },
      }),
  );
  await assert.rejects(client(`https://${H}/api/v1/x`, API), /too large/);
});

test('forced fetch mode never uses the socket, even on a 406', async () => {
  const r = await createCanvasTransport(
    () => {
      throw new Error('socket must not open');
    },
    async () => new Response('nope', { status: 406, headers: { 'content-type': 'text/html' } }),
    { mode: () => 'fetch' },
  )(`https://${H}/api/v1/x`, API);
  assert.equal(r.status, 406);
});
