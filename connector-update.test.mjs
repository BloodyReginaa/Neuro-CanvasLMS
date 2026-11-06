import test from 'node:test';
import assert from 'node:assert/strict';
import {
  connectorUpdateTool,
  handleConnectorUpdate,
  updateNotice,
  readUpdateStatus,
} from './connector-update.mjs';
import { homePage } from './pages.mjs';
import { UPDATE_KEYS as K } from './update-keys.mjs';

const textOf = r => r.content[0].text;
function updater() {
  const calls = [];
  return {
    calls,
    fetch: async (url, init = {}) => {
      const path = new URL(url).pathname;
      calls.push({ path, method: init.method ?? 'GET', body: init.body });
      if (path === '/mode') return Response.json({ mode: JSON.parse(init.body).mode });
      return Response.json({
        mode: 'notify',
        requested: path === '/request-update',
        last: { state: 'available', latest: '2.2.0' },
      });
    },
  };
}

test('the maintenance tool is clearly not a Canvas read and asks before changing anything', () => {
  assert.equal(connectorUpdateTool.annotations.readOnlyHint, false);
  assert.equal(connectorUpdateTool.annotations.destructiveHint, false);
  assert.match(connectorUpdateTool.description, /only when the user asks/);
});

test('without an updater the tool explains how to get updates instead of failing', async () => {
  const r = await handleConnectorUpdate({ action: 'update' }, {}, '2.1.0');
  assert.match(textOf(r), /not installed/);
  assert.equal(r.isError, undefined);
});

test('status, update and set_mode go to the updater through the service binding', async () => {
  const u = updater();
  const env = { UPDATER: u };
  assert.match(
    textOf(await handleConnectorUpdate({ action: 'status' }, env, '2.1.0')),
    /"installed_version":"2.1.0"/,
  );
  assert.match(
    textOf(await handleConnectorUpdate({ action: 'update' }, env, '2.1.0')),
    /within about 10 minutes/,
  );
  assert.match(
    textOf(await handleConnectorUpdate({ action: 'set_mode', mode: 'auto' }, env, '2.1.0')),
    /"auto"/,
  );
  assert.deepEqual(
    u.calls.map(c => `${c.method} ${c.path}`),
    ['GET /status', 'POST /request-update', 'POST /mode'],
  );
});

test('bad arguments are refused without calling the updater', async () => {
  const u = updater();
  for (const args of [
    {},
    { action: 'delete' },
    { action: 'set_mode', mode: 'yolo' },
    { action: 'status', extra: 1 },
  ])
    assert.equal(
      (await handleConnectorUpdate(args, { UPDATER: u }, '2.1.0')).isError,
      true,
      JSON.stringify(args),
    );
  assert.equal(u.calls.length, 0);
});

test('the AI is only told about updates when the owner should know', async () => {
  assert.equal(updateNotice(null, '2.1.0'), '');
  assert.equal(updateNotice({ state: 'up_to_date' }, '2.1.0'), '');
  assert.equal(updateNotice({ state: 'waiting', latest: '2.2.0' }, '2.1.0'), '');
  assert.match(
    updateNotice({ state: 'available', latest: '2.2.0' }, '2.1.0'),
    /2\.2\.0 is available .*connector_update/,
  );
  assert.match(updateNotice({ state: 'rolled_back' }, '2.1.0'), /rolled back/);
  const kv = {
    get: async k =>
      k === K.status ? JSON.stringify({ state: 'available', latest: '2.2.0' }) : null,
  };
  assert.equal((await readUpdateStatus({ OAUTH_KV: kv })).latest, '2.2.0');
  assert.equal(await readUpdateStatus({ OAUTH_KV: { get: async () => '{broken' } }), null);
});

test('the home page shows the version and an update banner in the reader language', () => {
  const url = 'https://x.example/';
  const zh = homePage('zh-CN', url, {
    bound: true,
    version: '2.1.0',
    update: { state: 'available', latest: '2.2.0' },
  });
  assert.match(zh, /2\.1\.0/);
  assert.match(zh, /新版本 2\.2\.0 已发布/);
  assert.match(
    homePage('en', url, {
      bound: true,
      version: '2.1.0',
      update: { state: 'waiting', latest: '2.2.0' },
    }),
    /24-hour observation period/,
  );
  assert.doesNotMatch(
    homePage('en', url, { bound: true, version: '2.1.0', update: { state: 'up_to_date' } }),
    /observation|is available/,
  );
});
