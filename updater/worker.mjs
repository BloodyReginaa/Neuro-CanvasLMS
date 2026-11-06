// The updater: a tiny separate Worker that keeps the connector up to date. It has no public URL
// (workers_dev: false, no routes); it is reached only by its cron trigger and by the connector
// through a service binding. It is deliberately small and rarely changes, so a bad connector
// release can never break the thing that rolls it back.
import { run, cloudflareApi, UPDATER_VERSION } from './core.mjs';
import { UPDATE_KEYS as K, UPDATE_MODES } from '../update-keys.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
function deps(env) {
  return {
    env,
    sleep,
    cf: cloudflareApi({
      token: env.CF_API_TOKEN,
      accountId: env.ACCOUNT_ID,
      script: env.TARGET_SCRIPT,
      fetchImpl: fetch,
    }),
  };
}

export default {
  // Runs every 10 minutes; it only contacts GitHub/Cloudflare every 6 hours unless an update was
  // requested, so most runs are a single KV read.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      run({ ...deps(env), trigger: 'cron' }).then(s => {
        if (!s.skipped)
          console.log(
            JSON.stringify({ updater: { state: s.state, current: s.current, latest: s.latest } }),
          );
      }),
    );
  },

  // Service-binding API used by the connector's `connector_update` tool.
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const json = (body, status = 200) => Response.json(body, { status });
    const status = async () => ({
      updater_version: UPDATER_VERSION,
      mode: (await env.STATE.get(K.mode)) ?? (env.UPDATE_MODE === 'auto' ? 'auto' : 'notify'),
      requested: Boolean(await env.STATE.get(K.request)),
      last: JSON.parse((await env.STATE.get(K.status)) ?? 'null'),
    });
    if (path === '/status') return json(await status());
    if (path === '/request-update' && request.method === 'POST') {
      await env.STATE.put(K.request, new Date().toISOString(), { expirationTtl: 24 * 3600 });
      return json({ ...(await status()), queued: true });
    }
    if (path === '/mode' && request.method === 'POST') {
      const { mode } = await request.json().catch(() => ({}));
      if (!UPDATE_MODES.includes(mode)) return json({ error: 'mode must be auto or notify' }, 400);
      await env.STATE.put(K.mode, mode);
      return json(await status());
    }
    return json({ error: 'not found' }, 404);
  },
};
