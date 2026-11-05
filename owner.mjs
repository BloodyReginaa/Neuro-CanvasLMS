// Owner binding and OAuth redirect policy (no Cloudflare-only imports, so it is unit-testable).
export const OWNER_KEY = 'owner:canvas_user_id';

// Optional pin: set OWNER_CANVAS_ID in wrangler.jsonc "vars". Otherwise the first Canvas
// account that successfully authorizes is stored in KV and becomes the only allowed owner
// ("trust on first use"). Reset with: npx wrangler kv key delete --binding OAUTH_KV --remote owner:canvas_user_id
export async function currentOwner(env) {
  return env.OWNER_CANVAS_ID ? String(env.OWNER_CANVAS_ID) : await env.OAUTH_KV.get(OWNER_KEY);
}
export async function resolveOwner(env, canvasUserId) {
  const id = String(canvasUserId);
  if (!/^\d+$/.test(id)) return null;
  const owner = await currentOwner(env);
  if (owner) return owner === id ? id : null;
  await env.OAUTH_KV.put(OWNER_KEY, id);
  return id;
}

// Claude (web/desktop/mobile), ChatGPT, and local loopback clients such as Claude Code.
export function isAllowedRedirect(redirect) {
  if (redirect.username || redirect.password) return false;
  if (redirect.protocol === 'https:') {
    if (['chatgpt.com', 'chat.openai.com'].includes(redirect.hostname)) return true;
    return (
      ['claude.ai', 'claude.com'].includes(redirect.hostname) &&
      redirect.pathname === '/api/mcp/auth_callback'
    );
  }
  return redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname);
}
