import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from './version.mjs';

const json = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));

test('version.mjs, package.json and the MCP Registry entry (server.json) carry one version', () => {
  assert.equal(json('./package.json').version, VERSION);
  assert.equal(json('./server.json').version, VERSION);
  // published with the package, so npx installs the dependency versions this release was tested with
  const lock = json('./npm-shrinkwrap.json');
  assert.equal(lock.version, VERSION);
  assert.equal(lock.packages[''].version, VERSION);
});

test('server.json fits the MCP Registry limits', () => {
  const s = json('./server.json');
  assert.match(s.name, /^io\.github\.BloodyReginaa\/[a-z0-9._-]+$/);
  assert.ok(s.description.length <= 100, `description is ${s.description.length} chars`);
  for (const r of s.remotes) {
    for (const v of r.url.match(/\{(\w+)\}/g) ?? []) assert.ok(r.variables?.[v.slice(1, -1)], v);
  }
});
