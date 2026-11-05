// Canvas API transport over a raw TLS socket (cloudflare:sockets) instead of fetch().
//
// History: in 2026-09, fetch() from the Worker to the Canvas API got an HTML "406 Not Acceptable"
// (even without credentials) while the same request over a TLS socket got normal JSON, so this
// transport was written. Re-tested 2026-11-05: fetch() and the socket now behave identically for
// the API (both 401 JSON for an invalid token; both 403 from CloudFront when there is no
// User-Agent). The 406 is no longer reproducible and its cause is unknown (most likely a WAF rule
// in front of Canvas that has since changed). The socket path is kept because it is proven in
// production — as a FALLBACK: API calls try fetch() first and switch to the socket when the answer
// is a 406 or an HTML error page (Canvas's API always answers JSON) or fetch() itself fails.
// Both paths only talk to the configured Canvas host on 443, only send GET /api/v1/... with an
// allowlisted set of headers, never follow redirects, and bound size and time.
// Anything else (file downloads) goes through fetch() WITHOUT credentials.
import { CANVAS_HOST } from './config.mjs';
const HOST = CANVAS_HOST;
const MAX_BODY = 16 * 1024 * 1024;
const MAX_WIRE = MAX_BODY + 1024 * 1024;
const MAX_HEADERS = 32768;
const decoder = new TextDecoder();
const encoder = new TextEncoder();
const concat = (chunks, size) => {
  const out = new Uint8Array(size);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
};
function delimiter(bytes, start, end, pattern) {
  for (let i = start; i <= Math.min(end, bytes.length) - pattern.length; i++) {
    let ok = true;
    for (let j = 0; j < pattern.length; j++)
      if (bytes[i + j] !== pattern[j]) {
        ok = false;
        break;
      }
    if (ok) return i;
  }
  return -1;
}
function unchunk(bytes) {
  let p = 0,
    total = 0;
  const parts = [];
  while (p < bytes.length) {
    const end = delimiter(bytes, p, p + 8192, [13, 10]);
    if (end < 0) throw new Error('Canvas transport: invalid chunk header.');
    const line = decoder.decode(bytes.subarray(p, end));
    if (!/^[0-9a-f]+(?:;[^\r\n]*)?$/i.test(line))
      throw new Error('Canvas transport: invalid chunk size.');
    const size = Number.parseInt(line.split(';')[0], 16);
    p = end + 2;
    if (!Number.isSafeInteger(size) || size > MAX_BODY - total)
      throw new Error('Canvas transport: response is too large.');
    if (size === 0) {
      if (bytes[p] === 13 && bytes[p + 1] === 10) {
        if (p + 2 !== bytes.length) throw new Error('Canvas transport: unexpected trailing bytes.');
        return concat(parts, total);
      }
      const trailerEnd = delimiter(bytes, p, p + MAX_HEADERS, [13, 10, 13, 10]);
      if (trailerEnd < 0 || trailerEnd + 4 !== bytes.length)
        throw new Error('Canvas transport: invalid trailers.');
      return concat(parts, total);
    }
    if (p + size + 2 > bytes.length || bytes[p + size] !== 13 || bytes[p + size + 1] !== 10)
      throw new Error('Canvas transport: truncated chunk.');
    parts.push(bytes.subarray(p, p + size));
    total += size;
    p += size + 2;
  }
  throw new Error('Canvas transport: missing final chunk.');
}
export async function parseCanvasResponse(bytes) {
  let pos = 0,
    status,
    headers;
  for (;;) {
    const end = delimiter(bytes, pos, pos + MAX_HEADERS, [13, 10, 13, 10]);
    if (end < 0) throw new Error('Canvas transport: incomplete or oversized response headers.');
    const lines = decoder.decode(bytes.subarray(pos, end)).split('\r\n');
    const match = lines.shift().match(/^HTTP\/1\.[01] ([1-5]\d\d)(?: [^\r\n]*)?$/);
    if (!match) throw new Error('Canvas transport: invalid HTTP status.');
    status = Number(match[1]);
    headers = new Headers();
    for (const line of lines) {
      const colon = line.indexOf(':');
      if (colon < 1 || /^[ \t]/.test(line))
        throw new Error('Canvas transport: invalid HTTP header.');
      headers.append(line.slice(0, colon), line.slice(colon + 1).trim());
    }
    pos = end + 4;
    if (status >= 200) break;
    if (status === 101 || pos > MAX_HEADERS)
      throw new Error('Canvas transport: unsupported interim response.');
  }
  let body = bytes.subarray(pos);
  const transfer = headers.get('transfer-encoding');
  const length = headers.get('content-length');
  if (transfer) {
    if (transfer.toLowerCase() !== 'chunked' || length !== null)
      throw new Error('Canvas transport: ambiguous response framing.');
    body = unchunk(body);
    headers.delete('transfer-encoding');
  } else if (length !== null) {
    if (!/^\d+$/.test(length) || Number(length) !== body.length)
      throw new Error('Canvas transport: incomplete response body.');
  }
  if (body.length > MAX_BODY) throw new Error('Canvas transport: response is too large.');
  const encoding = headers.get('content-encoding')?.toLowerCase();
  if (encoding && encoding !== 'identity') {
    if (!['gzip', 'deflate'].includes(encoding))
      throw new Error('Canvas transport: unsupported content encoding.');
    const reader = new Response(body).body
      .pipeThrough(new DecompressionStream(encoding))
      .getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BODY)
          throw new Error('Canvas transport: decompressed response is too large.');
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    body = concat(chunks, size);
    headers.delete('content-encoding');
  }
  headers.delete('content-length');
  return new Response([204, 205, 304].includes(status) ? null : body, { status, headers });
}
// A JSON answer is Canvas itself speaking; HTML (or a 406) means something in front of Canvas
// rejected the request, which is when the socket path is worth trying.
export function shouldFallBack(response) {
  if (response.status === 406) return true;
  if (response.status < 400) return false;
  return !(response.headers.get('content-type') ?? '').toLowerCase().includes('json');
}

async function boundedFetchResponse(response) {
  const length = response.headers.get('content-length');
  if (length && Number(length) > MAX_BODY) {
    await response.body?.cancel();
    throw new Error('Canvas transport: response is too large.');
  }
  const reader = response.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BODY) throw new Error('Canvas transport: response is too large.');
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response([204, 205, 304].includes(response.status) ? null : concat(chunks, size), {
    status: response.status,
    headers,
  });
}

// mode: 'auto' (default: fetch first, socket on rejection), 'fetch' or 'socket'.
// log: receives { via, status, reason } — never URLs, headers or tokens.
export function createCanvasTransport(
  connect,
  fetcher = fetch,
  { mode = () => 'auto', log = () => {} } = {},
) {
  async function viaSocket(url, headers, signal) {
    signal?.throwIfAborted();
    const socket = connect({ hostname: HOST, port: 443 }, { secureTransport: 'on' });
    socket.closed.catch(() => {});
    const close = () => socket.close().catch(() => {});
    const timer = setTimeout(close, 20000);
    signal?.addEventListener('abort', close, { once: true });
    try {
      await socket.opened;
      const lines = [`GET ${url.pathname}${url.search} HTTP/1.1`, `Host: ${HOST}`];
      for (const [key, value] of headers) lines.push(`${key}: ${value}`);
      lines.push('Accept-Encoding: identity', 'Connection: close', '', '');
      const writer = socket.writable.getWriter();
      await writer.write(encoder.encode(lines.join('\r\n')));
      writer.releaseLock();
      const reader = socket.readable.getReader();
      const chunks = [];
      let size = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_WIRE) throw new Error('Canvas transport: response is too large.');
        chunks.push(value);
      }
      signal?.throwIfAborted();
      return await parseCanvasResponse(concat(chunks, size));
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', close);
      await close();
    }
  }

  return async function canvasTransport(input, options = {}) {
    const url = new URL(input);
    // File downloads and other hosts: plain fetch, and credentials may never go there.
    if (url.origin !== `https://${HOST}` || !url.pathname.startsWith('/api/v1/')) {
      if (new Headers(options.headers).has('authorization'))
        throw new Error('Canvas transport: credentials cannot leave the fixed API origin.');
      return fetcher(input, options);
    }
    if (
      url.username ||
      url.password ||
      options.method !== 'GET' ||
      options.redirect !== 'manual' ||
      options.body
    )
      throw new Error('Canvas transport: only fixed read-only API requests are supported.');
    const headers = new Headers(options.headers);
    for (const key of headers.keys())
      if (!['authorization', 'accept', 'user-agent'].includes(key))
        throw new Error('Canvas transport: unexpected request header.');

    const chosen = mode();
    if (chosen !== 'socket') {
      let reason;
      try {
        const response = await fetcher(url.href, {
          method: 'GET',
          redirect: 'manual',
          headers,
          signal: options.signal,
        });
        if (chosen === 'fetch' || !shouldFallBack(response)) {
          log({ via: 'fetch', status: response.status });
          return await boundedFetchResponse(response);
        }
        reason = `fetch HTTP ${response.status} ${(response.headers.get('content-type') ?? '').split(';')[0] || 'no content-type'}`;
        await response.body?.cancel().catch(() => {});
      } catch (e) {
        if (options.signal?.aborted || chosen === 'fetch' || /too large/.test(e.message ?? ''))
          throw e;
        reason = `fetch error ${e.name}`;
      }
      const response = await viaSocket(url, headers, options.signal);
      log({ via: 'socket', status: response.status, reason });
      return response;
    }
    const response = await viaSocket(url, headers, options.signal);
    log({ via: 'socket', status: response.status, reason: 'forced' });
    return response;
  };
}
