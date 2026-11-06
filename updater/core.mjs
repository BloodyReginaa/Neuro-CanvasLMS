// Updater logic. No Cloudflare-only imports: every side effect (KV, release download, Cloudflare
// API, calls to the connector) is passed in, so each path is unit-tested.
//
// How an update is installed — in this order, stopping at the first problem:
//   1. Download release.json + release.json.sig and verify the Ed25519 signature with the
//      maintainer's public key. Unsigned or tampered releases are never installed.
//   2. Decide: newer than what runs now? same major version? not marked bad here? mode/channel
//      allow it (auto + soak time passed, early channel, or the owner asked)?
//   3. Check the connector's current bindings include everything the release needs.
//   4. Download each file and check its SHA-256 and size against the signed manifest.
//   5. Upload a new VERSION that inherits every existing binding (strict: the upload fails rather
//      than silently dropping one). Uploading does not change what is live.
//   6. Deploy it at 100%, then health-check the connector (/healthz reports the new version,
//      OAuth metadata answers, /mcp still demands auth).
//   7. If the health check fails: redeploy the previous version, mark this release bad so it is
//      not retried, and report it. Storage, secrets and settings are untouched either way.
import { UPDATE_KEYS as K } from '../update-keys.mjs';

export const UPDATER_VERSION = 1;
export const DEFAULT_RELEASE_URL =
  'https://github.com/BloodyReginaa/Neuro-CanvasLMS/releases/latest/download/';
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // look for releases every 6 hours
export const SOAK_MS = 24 * 60 * 60 * 1000; // stable channel waits 24 h after a release
const LOCK_TTL_S = 15 * 60;

export function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v ?? ''));
  return m ? m.slice(1).map(Number) : null;
}
export function compareVersions(a, b) {
  const x = parseVersion(a) ?? [0, 0, 0],
    y = parseVersion(b) ?? [0, 0, 0];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export async function sha256Hex(bytes) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...d].map(x => x.toString(16).padStart(2, '0')).join('');
}
export async function verifySignature(publicKeyB64, bytes, signatureB64) {
  const key = await crypto.subtle.importKey('raw', b64(publicKeyB64), { name: 'Ed25519' }, false, [
    'verify',
  ]);
  return crypto.subtle.verify({ name: 'Ed25519' }, key, b64(signatureB64.trim()), bytes);
}

export function validateManifest(m) {
  const ok =
    m &&
    m.schema === 1 &&
    m.name === 'neuro-canvas-lms' &&
    parseVersion(m.version) &&
    !Number.isNaN(Date.parse(m.published_at)) &&
    Number.isInteger(m.min_updater) &&
    /^\d{4}-\d{2}-\d{2}$/.test(m.compatibility_date) &&
    Array.isArray(m.compatibility_flags) &&
    typeof m.main_module === 'string' &&
    Array.isArray(m.required_bindings) &&
    Array.isArray(m.files) &&
    m.files.length > 0 &&
    m.files.every(
      f =>
        /^[\w.-]+$/.test(f.name) &&
        /^[a-f0-9]{64}$/.test(f.sha256) &&
        Number.isInteger(f.size) &&
        typeof f.type === 'string',
    ) &&
    m.files.some(f => f.name === m.main_module);
  if (!ok) throw new Error('release manifest is malformed');
  return m;
}

async function getBytes(fetchImpl, url, limit) {
  const r = await fetchImpl(url, { headers: { 'User-Agent': 'Neuro-CanvasLMS-updater' } });
  if (!r.ok) throw new Error(`download failed (HTTP ${r.status}) for ${url.split('/').pop()}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length > limit) throw new Error(`download too large: ${url.split('/').pop()}`);
  return bytes;
}

export async function fetchSignedManifest({ releaseUrl, publicKey, fetchImpl }) {
  const manifestBytes = await getBytes(fetchImpl, releaseUrl + 'release.json', 64 * 1024);
  const sig = new TextDecoder().decode(
    await getBytes(fetchImpl, releaseUrl + 'release.json.sig', 1024),
  );
  if (!(await verifySignature(publicKey, manifestBytes, sig)))
    throw new Error('release signature does not match the maintainer key');
  return validateManifest(JSON.parse(new TextDecoder().decode(manifestBytes)));
}

// Talks to the connector through the service binding.
async function connectorVersion(main) {
  try {
    const r = await main.fetch('https://connector/healthz');
    if (!r.ok) return '0.0.0';
    const j = await r.json();
    return parseVersion(j.version) ? j.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}
// Subrequest budget (Free plan: 50 per invocation). Worst case for an update that is rolled back:
// 8 setup/upload calls + (15 + 2) health calls + 1 rollback + (15 + 2) health calls = 43.
export const HEALTH_ATTEMPTS = 15;
export async function healthCheck(main, expectVersion, sleep, attempts = HEALTH_ATTEMPTS) {
  let reason = 'no answer';
  let ready = false;
  for (let i = 0; i < attempts && !ready; i++) {
    if (i) await sleep(3000);
    try {
      const h = await main.fetch('https://connector/healthz');
      const j = h.ok ? await h.json().catch(() => null) : null;
      if (!j?.ok) reason = `/healthz answered HTTP ${h.status}`;
      else if (expectVersion && j.version !== expectVersion) reason = `still serving ${j.version}`;
      else ready = true;
    } catch (e) {
      reason = `error ${e?.name ?? 'Error'}`;
    }
  }
  if (!ready) return { ok: false, reason };
  try {
    const meta = await main.fetch('https://connector/.well-known/oauth-authorization-server');
    if (!meta.ok || !(await meta.json().catch(() => ({}))).issuer)
      return { ok: false, reason: 'OAuth metadata missing' };
    const mcp = await main.fetch('https://connector/mcp', { method: 'POST', body: '{}' });
    if (mcp.status !== 401)
      return { ok: false, reason: `/mcp without auth answered HTTP ${mcp.status} instead of 401` };
  } catch (e) {
    return { ok: false, reason: `error ${e?.name ?? 'Error'}` };
  }
  return { ok: true };
}

// Minimal Cloudflare API client for one script.
export function cloudflareApi({ token, accountId, script, fetchImpl }) {
  return async (method, path, body) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (body && !(body instanceof FormData)) headers['content-type'] = 'application/json';
    const r = await fetchImpl(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${script}${path}`,
      { method, headers, body: body && !(body instanceof FormData) ? JSON.stringify(body) : body },
    );
    let j;
    try {
      j = await r.json();
    } catch {
      throw new Error(`Cloudflare API ${method} ${path.split('?')[0]} answered HTTP ${r.status}`);
    }
    if (!j.success)
      throw new Error(
        `Cloudflare API ${method} ${path.split('?')[0]}: ${(j.errors ?? [])
          .map(e => `${e.code} ${e.message}`)
          .join('; ')
          .slice(0, 300)}`,
      );
    return j.result;
  };
}

async function install({ manifest, current, cf, main, fetchImpl, releaseUrl, sleep }) {
  const latest = manifest.version;
  const settings = await cf('GET', '/settings');
  const names = (settings.bindings ?? []).map(b => b.name);
  const missing = manifest.required_bindings.filter(n => !names.includes(n));
  if (missing.length)
    return {
      state: 'manual_required',
      message: `Release ${latest} needs new settings (${missing.join(', ')}); update manually once.`,
    };

  const files = [];
  for (const f of manifest.files) {
    const bytes = await getBytes(fetchImpl, releaseUrl + f.name, 20 * 1024 * 1024);
    if (bytes.length !== f.size || (await sha256Hex(bytes)) !== f.sha256)
      throw new Error(`file ${f.name} does not match the signed manifest`);
    files.push({ ...f, bytes });
  }

  const deployments = await cf('GET', '/deployments');
  const live = (deployments.deployments ?? deployments)[0];
  if (!live || live.versions.length !== 1 || live.versions[0].percentage !== 100)
    return {
      state: 'manual_required',
      message: 'A split (gradual) deployment is in progress; not updating automatically.',
    };
  const previous = live.versions[0].version_id;

  const form = new FormData();
  form.append(
    'metadata',
    new Blob(
      [
        JSON.stringify({
          main_module: manifest.main_module,
          compatibility_date: manifest.compatibility_date,
          compatibility_flags: manifest.compatibility_flags,
          bindings: names.map(name => ({ type: 'inherit', name })),
          annotations: {
            'workers/message': `Neuro-CanvasLMS ${latest} (updater)`,
            'workers/tag': `v${latest}`,
          },
        }),
      ],
      { type: 'application/json' },
    ),
  );
  for (const f of files) form.append(f.name, new Blob([f.bytes], { type: f.type }), f.name);
  const version = await cf('POST', '/versions?bindings_inherit=strict', form);

  const deploy = (id, force) =>
    cf('POST', `/deployments${force ? '?force=true' : ''}`, {
      strategy: 'percentage',
      versions: [{ version_id: id, percentage: 100 }],
      annotations: { 'workers/message': `Neuro-CanvasLMS updater: ${force ? 'rollback' : latest}` },
    });
  await deploy(version.id, false);
  const health = await healthCheck(main, latest, sleep);
  if (health.ok) return { state: 'updated', current: latest, previous_version: current };

  await deploy(previous, true);
  const back = await healthCheck(main, current === '0.0.0' ? null : current, sleep);
  return {
    state: 'rolled_back',
    bad_release: latest,
    message: `Release ${latest} failed its health check (${health.reason}) and was rolled back to ${current}${back.ok ? '' : ' — the rolled-back version did not pass its own check either; please look at the connector'}.`,
  };
}

/**
 * One updater pass. trigger: 'cron' (scheduled) or 'request' (the owner asked to update now).
 * deps: { env, fetchImpl, cf, now, sleep } — env.STATE (KV), env.MAIN (service binding).
 */
export async function run({
  env,
  fetchImpl = fetch,
  cf,
  now = Date.now(),
  sleep,
  trigger = 'cron',
}) {
  const kv = env.STATE;
  const requested = Boolean(await kv.get(K.request));
  const lastCheck = Number((await kv.get(K.lastCheck)) ?? 0);
  if (!requested && trigger === 'cron' && now - lastCheck < CHECK_INTERVAL_MS)
    return { skipped: 'interval' };
  if (await kv.get(K.lock)) return { skipped: 'locked' };
  await kv.put(K.lock, String(now), { expirationTtl: LOCK_TTL_S });

  const mode = (await kv.get(K.mode)) ?? (env.UPDATE_MODE === 'auto' ? 'auto' : 'notify');
  const channel = env.CHANNEL === 'early' ? 'early' : 'stable';
  const releaseUrl = env.RELEASE_URL || DEFAULT_RELEASE_URL;
  const base = { mode, channel, checked_at: new Date(now).toISOString() };
  let status;
  const current = await connectorVersion(env.MAIN);
  try {
    const manifest = await fetchSignedManifest({
      releaseUrl,
      publicKey:
        env.RELEASE_PUBLIC_KEY || (await import('./release-public-key.mjs')).RELEASE_PUBLIC_KEY,
      fetchImpl,
    });
    const latest = manifest.version;
    const install_ = requested || trigger === 'request';
    if (compareVersions(latest, current) <= 0) status = { state: 'up_to_date', current, latest };
    else if (await kv.get(K.bad(latest)))
      status = {
        state: 'rolled_back',
        current,
        latest,
        message: `${latest} failed its health check here before; waiting for a newer release.`,
      };
    else if (current !== '0.0.0' && parseVersion(latest)[0] !== parseVersion(current)[0])
      status = {
        state: 'manual_required',
        current,
        latest,
        message: `${latest} is a new major version; update manually once (see README).`,
      };
    else if (manifest.min_updater > UPDATER_VERSION)
      status = {
        state: 'manual_required',
        current,
        latest,
        message: `${latest} needs a newer updater; update the updater manually once.`,
      };
    else if (
      install_ ||
      (mode === 'auto' &&
        (channel === 'early' || now - Date.parse(manifest.published_at) >= SOAK_MS))
    ) {
      const r = await install({
        manifest,
        current,
        cf,
        main: env.MAIN,
        fetchImpl,
        releaseUrl,
        sleep,
      });
      if (r.bad_release) await kv.put(K.bad(r.bad_release), base.checked_at);
      status = {
        current,
        latest,
        ...r,
        ...(r.state === 'updated' ? { updated_at: base.checked_at } : {}),
      };
    } else
      status = {
        state: mode === 'auto' ? 'waiting' : 'available',
        current,
        latest,
        message:
          mode === 'auto'
            ? `${latest} will be installed automatically after its 24-hour observation period.`
            : `${latest} is available. Ask your AI to "update the Canvas connector" to install it.`,
      };
  } catch (e) {
    status = { state: 'error', current, message: String(e?.message ?? e).slice(0, 300) };
  }
  status = { ...base, ...status };
  await kv.put(K.status, JSON.stringify(status));
  await kv.put(K.lastCheck, String(now));
  if (requested) await kv.delete(K.request);
  await kv.delete(K.lock);
  return status;
}
