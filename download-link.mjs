// canvas_file_download_link: put an original Canvas file on the user's own computer from a coding
// agent with a shell (Claude Code, Codex, Cursor). Those agents get MCP resources only as links they
// cannot save to disk; cloud chats (which can) don't need this.
// The Worker asks Canvas for the file's download address once and takes where Canvas redirects it
// (Canvas's file domain), minus the permanent `verifier` pass. It never downloads the bytes and never
// requests that address itself. Measured on UMass Amherst, 2026-11-06: curl follows that address
// (302 → 302 → 200) to the complete file once, a second use answers 401 — but its "5-minute"
// signature is NOT enforced: an unused address still worked after 60 minutes. So the address is
// never shown to the AI. The AI gets a link to this Worker instead (/dl/<random id>), which
//   - works for 5 minutes and once: the Canvas address waits in this deployment's own KV with a
//     5-minute expiry and is deleted on use;
//   - is only honoured with the X-Canvas-Download header from the command we return, so a browser
//     or a link preview that opens it gets a 403 and does not use it up;
//   - answers with a redirect: the file still comes straight from Canvas, with no size limit.
import { callCanvas } from './canvas.mjs';
import { CANVAS_HOST } from './config.mjs';
import { DOWNLOAD_UA, loginRedirect, allowedDownload } from './file-content.mjs';
import { safeURL } from './module-file.mjs';

export const fileDownloadLinkTool = {
  name: 'canvas_file_download_link',
  description:
    "Put an ORIGINAL Canvas file (e.g. an assignment's starter-code ZIP) on the user's computer from a coding agent with a shell, such as Claude Code, Codex or Cursor: returns the exact curl command (a link that works ONCE, for 5 minutes, and only with the header in that command) and the expected size; the file itself comes straight from Canvas. Run the command right away; if it fails or expires, call this again. Cloud chats cannot reach it: there, use canvas_file_original (the app attaches the file) or canvas_file_content. Takes a Canvas file_id only (from canvas_find_files, canvas_files or a /files/<id> link).",
  inputSchema: {
    type: 'object',
    properties: { file_id: { type: 'integer', minimum: 1 } },
    required: ['file_id'],
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};

const cloudFetch = (input, init) => fetch(input, init);
const REDIRECT = new Set([301, 302, 303, 307, 308]);
export const DOWNLOAD_TTL = 5 * 60; // seconds a /dl link works
export const DOWNLOAD_HEADER = 'X-Canvas-Download';
const ID = /^[A-Za-z0-9_-]{43}$/;
const onCanvas = u => u.hostname === CANVAS_HOST || u.hostname.endsWith('.instructure.com');

// When a signed storage link stops working (epoch seconds), or null if it carries no expiry we
// recognise. A link without one is never handed out: it could be permanent.
export function linkExpiry(u) {
  const q = u.searchParams;
  for (const [, v] of q) {
    if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(v)) continue;
    try {
      const exp = JSON.parse(atob(v.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp;
      if (Number.isFinite(exp)) return exp;
    } catch {}
  }
  const amzDate = q.get('X-Amz-Date');
  const amzExpires = Number(q.get('X-Amz-Expires'));
  if (amzDate && amzExpires > 0) {
    const m = amzDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (m) return Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6]) / 1000 + amzExpires;
  }
  const expires = Number(q.get('Expires'));
  return Number.isFinite(expires) && expires > 1e9 ? expires : null;
}

// A file name that is safe inside quotes on macOS, Linux and Windows and stays in the folder.
export function safeFileName(name) {
  const base = String(name ?? '')
    .split(/[\\/]/)
    .pop()
    .replace(/[\x00-\x1f"*:<>?|$`]/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return base.slice(0, 180) || 'canvas-file';
}

export async function fileDownloadLink(
  args,
  token,
  apiFetch,
  { fetcher = cloudFetch, issue } = {},
) {
  if (typeof issue !== 'function')
    throw new Error('Canvas file: download links are not available.');
  if (
    Object.keys(args).some(k => k !== 'file_id') ||
    !Number.isSafeInteger(args.file_id) ||
    args.file_id < 1
  )
    throw new Error('Canvas file: only a positive Canvas file_id is accepted.');
  const meta = (await callCanvas('canvas_file', { file_id: args.file_id }, token, apiFetch)).data;
  // `hidden` files are only hidden from the Files list ("only available with link"), which is how
  // many courses share files; students may open them. Only a lock stops a download.
  if (meta.locked_for_user) throw new Error('Canvas file: file is locked.');
  if (!meta.url)
    throw new Error('Canvas file: Canvas did not provide a download link for this file.');
  let url = safeURL(meta.url);
  if (!onCanvas(url)) throw new Error('Canvas file: unexpected download address.');
  for (let hop = 0; hop < 4; hop++) {
    // Canvas credentials are never attached: the download address carries its own authorization.
    const r = await fetcher(url.href, {
      method: 'GET',
      redirect: 'manual',
      headers: { Accept: '*/*', 'User-Agent': DOWNLOAD_UA },
      signal: AbortSignal.timeout(15000),
    });
    await r.body?.cancel();
    if (!REDIRECT.has(r.status)) {
      if (r.ok)
        throw new Error(
          'Canvas file: this Canvas sends the file without a short-lived link, so no one-time link can be made. Use canvas_file_original, or give the user the html_url to download it in their browser.',
        );
      throw new Error(`Canvas file: the download address answered HTTP ${r.status}.`);
    }
    const location = r.headers.get('location');
    if (!location) throw new Error('Canvas file: download redirect without a destination.');
    const next = safeURL(new URL(location, url).href);
    if (loginRedirect(next.href))
      throw new Error('Canvas file: download was redirected to the Canvas login page.');
    if (onCanvas(next)) {
      url = next; // a redirect inside Canvas: not the storage link yet
      continue;
    }
    if (!allowedDownload(next.href))
      throw new Error('Canvas file: download redirected to an unexpected host.');
    next.searchParams.delete('verifier'); // the permanent pass; the signed one stays
    // Without a signature of its own, the address would not work once the pass is removed.
    if (!linkExpiry(next))
      throw new Error(
        'Canvas file: this Canvas did not give a signed download address. Use canvas_file_original, or give the user the html_url to download it in their browser.',
      );
    const name = safeFileName(meta.display_name ?? meta.filename);
    const link = await issue(next.href);
    const header = `-H "${DOWNLOAD_HEADER}: 1"`;
    return {
      file_id: args.file_id,
      name,
      size: meta.size,
      content_type: meta['content-type'],
      html_url: `https://${CANVAS_HOST}/files/${args.file_id}`,
      download_url: link,
      expires_in_seconds: DOWNLOAD_TTL,
      single_use: true,
      command: `curl -L --fail ${header} -o "${name}" "${link}"`,
      command_windows: `curl.exe -L --fail ${header} -o "${name}" "${link}"`,
      check: `The file must be ${meta.size} bytes${/\.zip$/i.test(name) ? '; then test the archive with `unzip -t`' : ''}.`,
      note: 'Run the command exactly as given, right away: the link works once, for 5 minutes, and only with that header. If it fails, call canvas_file_download_link again.',
    };
  }
  throw new Error('Canvas file: too many redirects inside Canvas.');
}

// --- the /dl/<id> links ------------------------------------------------------------------------

export function newDownloadId() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Cloudflare KV failed (briefly unavailable, or the free plan's 1000 writes a day are used up).
export const STORAGE_DOWN =
  "Connector storage (Cloudflare KV) is unavailable right now, so no download link could be made. It is often the free plan's daily KV limit, which resets at 00:00 UTC. Meanwhile use canvas_file_original or canvas_file_content; the Canvas connection itself is fine.";

// Store the Canvas address for 5 minutes and return the Worker link that leads to it.
export async function issueDownload(kv, origin, target, now = Date.now) {
  const id = newDownloadId();
  try {
    await kv.put('dl:' + id, JSON.stringify({ target, exp: now() + DOWNLOAD_TTL * 1000 }), {
      expirationTtl: DOWNLOAD_TTL,
    });
  } catch {
    throw new Error(STORAGE_DOWN);
  }
  return `${origin}/dl/${id}`;
}

const plain = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Type': 'text/plain; charset=utf-8',
};
// GET /dl/<id> with the header: redirect to the Canvas address once, within 5 minutes.
export async function redeemDownload(request, kv, id, now = Date.now) {
  if (!ID.test(id)) return new Response('Not found.\n', { status: 404, headers: plain });
  if (request.method !== 'GET')
    return new Response('Method not allowed.\n', { status: 405, headers: plain });
  if (request.headers.get(DOWNLOAD_HEADER) !== '1')
    return new Response(
      'This one-time link only works with the curl command the connector gave (it sends the ' +
        DOWNLOAD_HEADER +
        ' header). Opening it anywhere else does not use it up.\n',
      { status: 403, headers: plain },
    );
  const key = 'dl:' + id;
  let stored;
  try {
    stored = await kv.get(key);
  } catch {
    // not "expired": the link may be fine, the storage is not
    return new Response(
      "The connector's storage (Cloudflare KV) is unavailable right now. Try again in a minute; if it keeps failing, the free plan's daily limit may be used up (it resets at 00:00 UTC).\n",
      { status: 503, headers: plain },
    );
  }
  let entry = null;
  try {
    entry = JSON.parse(stored ?? 'null');
  } catch {}
  // Used up before it is used: a failed delete does not stop this download (it still expires).
  if (entry) await kv.delete(key).catch(() => {});
  // KV expiry can lag a little: the stored deadline is checked too.
  if (!entry?.target || !(now() < entry.exp))
    return new Response(
      'This download link has expired or was already used. Ask the AI for a new one.\n',
      { status: 410, headers: plain },
    );
  return new Response(null, { status: 302, headers: { ...plain, Location: entry.target } });
}
