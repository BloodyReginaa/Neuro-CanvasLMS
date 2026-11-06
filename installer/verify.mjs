// Is a freshly deployed connector online and running the expected version?
// Ready means: /healthz answers ok with that version AND /mcp refuses an unauthenticated request
// with 401 (the OAuth layer is in front). Each request has its own timeout and the whole check a
// deadline, so it always ends. A new workers.dev address can take minutes for its DNS and HTTPS
// certificate: for those "not ready yet" errors the deadline is longer. Everything that touches
// the network or the clock can be replaced, so the behaviour is tested (verify.test.mjs).
import { isWarmingUp, CHECK_WAIT, WARMUP_WAIT } from './lib.mjs';

// fetch reports only "fetch failed"; the cause names the real problem (a TLS alert, DNS, …).
export function errorDetail(e) {
  if (e?.name === 'TimeoutError' || e?.cause?.name === 'TimeoutError') return 'no answer (timeout)';
  return String(e?.cause?.code ?? e?.cause?.message ?? e?.message ?? e);
}

export async function verifyDeployment(
  url,
  version,
  {
    fetcher = fetch,
    sleep = ms => new Promise(r => setTimeout(r, ms)),
    now = Date.now,
    requestTimeout = 10 * 1000,
    interval = 3 * 1000,
    normalWait = CHECK_WAIT,
    warmupWait = WARMUP_WAIT,
    onWarmup = () => {},
  } = {},
) {
  let detail = 'no answer';
  let told = false;
  const start = now();
  for (let i = 0; now() - start < (isWarmingUp(detail) ? warmupWait : normalWait); i++) {
    if (i) await sleep(interval);
    try {
      const h = await fetcher(`${url}/healthz`, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(requestTimeout),
      });
      const j = h.ok ? await h.json() : null;
      if (!j?.ok) detail = `/healthz HTTP ${h.status}`;
      else if (version && j.version !== version) detail = `still version ${j.version}`;
      else {
        const mcp = await fetcher(`${url}/mcp`, {
          method: 'POST',
          body: '{}',
          signal: AbortSignal.timeout(requestTimeout),
        });
        if (mcp.status === 401)
          return { ok: true, version: j.version, connected: j.connected === true };
        detail = `/mcp HTTP ${mcp.status} (expected 401)`;
      }
    } catch (e) {
      detail = errorDetail(e);
      if (isWarmingUp(detail) && !told) {
        told = true;
        onWarmup(detail);
      }
    }
  }
  return { ok: false, detail };
}
