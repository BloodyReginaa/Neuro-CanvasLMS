import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOwner, currentOwner, isAllowedRedirect, OWNER_KEY } from './owner.mjs';
const kv = () => {
  const m = new Map();
  return {
    get: async k => m.get(k) ?? null,
    put: async (k, v) => {
      m.set(k, v);
    },
    m,
  };
};

test('first authorizing Canvas account becomes the owner, others are refused', async () => {
  const env = { OAUTH_KV: kv() };
  assert.equal(await currentOwner(env), null);
  assert.equal(await resolveOwner(env, 111), '111');
  assert.equal(env.OAUTH_KV.m.get(OWNER_KEY), '111');
  assert.equal(await resolveOwner(env, '111'), '111');
  assert.equal(await resolveOwner(env, 222), null);
  assert.equal(await currentOwner(env), '111');
});
test('pinned OWNER_CANVAS_ID wins and is never overwritten', async () => {
  const env = { OAUTH_KV: kv(), OWNER_CANVAS_ID: '555' };
  assert.equal(await resolveOwner(env, 111), null);
  assert.equal(env.OAUTH_KV.m.size, 0);
  assert.equal(await resolveOwner(env, 555), '555');
});
test('non-numeric profile ids are rejected', async () => {
  const env = { OAUTH_KV: kv() };
  assert.equal(await resolveOwner(env, 'abc'), null);
  assert.equal(env.OAUTH_KV.m.size, 0);
});
test('only Claude, ChatGPT and loopback redirects are allowed', () => {
  for (const ok of [
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
    'https://chatgpt.com/connector_platform_oauth_redirect',
    'http://localhost:33418/callback',
    'http://127.0.0.1:5000/cb',
  ])
    assert.equal(isAllowedRedirect(new URL(ok)), true, ok);
  for (const bad of [
    'https://evil.example/cb',
    'https://claude.ai/other',
    'http://claude.ai/api/mcp/auth_callback',
    'https://claude.ai.evil.example/api/mcp/auth_callback',
    'http://user:pw@localhost/cb',
    'https://localhost/cb',
  ])
    assert.equal(isAllowedRedirect(new URL(bad)), false, bad);
});
