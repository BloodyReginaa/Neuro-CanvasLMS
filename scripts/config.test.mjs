import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseJsonc } from './jsonc.mjs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('wrangler.jsonc stays valid with the optional UPDATER service binding commented or not', () => {
  const t = read('wrangler.jsonc');
  assert.ok(parseJsonc(t).kv_namespaces);
  const on = parseJsonc(t.replace('// "services"', '"services"'));
  assert.deepEqual(on.services, [{ binding: 'UPDATER', service: 'neuro-canvas-lms-updater' }]);
});

test('the updater template has no public URL, a 10-minute timer and the same KV binding role', () => {
  const u = parseJsonc(read('updater/wrangler.jsonc'));
  assert.equal(u.workers_dev, false);
  assert.equal(u.preview_urls, false);
  assert.deepEqual(u.triggers.crons, ['*/10 * * * *']);
  assert.equal(u.kv_namespaces[0].binding, 'STATE');
  assert.equal(u.services[0].binding, 'MAIN');
  assert.ok(['auto', 'notify'].includes(u.vars.UPDATE_MODE));
  assert.equal(u.vars.CHANNEL, 'stable');
  assert.equal(u.vars.RELEASE_PUBLIC_KEY, undefined, 'production updaters use the shipped key');
});
