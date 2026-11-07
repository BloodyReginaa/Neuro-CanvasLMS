// A brand-new Cloudflare account has no workers.dev subdomain, and the connector's address needs
// one. The installer registers a random one through Cloudflare's API with the login wrangler
// already has (`wrangler auth token --json`; the credentials stay in memory, never shown or saved),
// so nobody has to pick a name in the dashboard. Anything unexpected only skips this: the deploy
// then still finds no subdomain and sends the user to the dashboard as before. The network can be
// replaced, so every case is tested (subdomain.test.mjs).
import { apiAuth, subdomainApi, subdomainAnswer, subdomainCandidate } from './lib.mjs';
import { errorDetail } from './verify.mjs';

// Result: { exists: name } · { created: name } · { emailUnverified: true } · { skipped: reason }
export async function ensureSubdomain(
  accountId,
  {
    authOutput,
    fetcher = fetch,
    candidate = subdomainCandidate,
    attempts = 3,
    requestTimeout = 15 * 1000,
  } = {},
) {
  const auth = apiAuth(authOutput);
  if (!auth) return { skipped: 'no usable Cloudflare credentials' };
  const call = async (method, body) => {
    try {
      const r = await fetcher(subdomainApi(accountId), {
        method,
        headers: {
          ...auth,
          'Content-Type': 'application/json',
          'User-Agent': 'Neuro-CanvasLMS-installer',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(requestTimeout),
      });
      let json = null;
      try {
        json = await r.json();
      } catch {}
      const answer = subdomainAnswer(json);
      return answer.error ? { error: `HTTP ${r.status}: ${answer.error}` } : answer;
    } catch (e) {
      return { error: errorDetail(e) };
    }
  };

  const current = await call('GET');
  if (current.subdomain) return { exists: current.subdomain };
  if (current.emailUnverified) return { emailUnverified: true };
  if (!current.missing) return { skipped: current.error ?? 'unexpected answer' };
  let last = {};
  for (let i = 0; i < attempts; i++) {
    last = await call('PUT', { subdomain: candidate() });
    if (last.subdomain) return { created: last.subdomain };
    if (last.emailUnverified) return { emailUnverified: true };
    if (!last.taken) break;
  }
  return { skipped: last.error ?? 'every name tried was taken' };
}
