import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseJsonc } from './jsonc.mjs';

test('the manual wrangler.jsonc template parses and leaves the school unset until filled in', () => {
  const c = parseJsonc(fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(c.kv_namespaces[0].binding, 'OAUTH_KV');
  assert.equal(c.vars.CANVAS_HOST, 'REPLACE_WITH_YOUR_CANVAS_HOST');
  assert.equal(c.observability.logs.invocation_logs, false);
  assert.equal(c.services, undefined);
});
