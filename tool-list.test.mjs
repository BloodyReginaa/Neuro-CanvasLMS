import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { allTools } from './tool-list.mjs';
import { listingServer, LISTING_ONLY_NOTICE } from './scripts/glama-stdio.mjs';

test('tool list: unique names, every tool and parameter described, read-only', () => {
  const names = allTools.map(t => t.name);
  assert.equal(new Set(names).size, names.length);
  for (const t of allTools) {
    assert.ok(
      t.description?.length >= 50,
      `${t.name}: describe what it returns and when to use it`,
    );
    assert.equal(t.inputSchema?.type, 'object', t.name);
    assert.equal(t.annotations?.readOnlyHint, true, t.name);
    for (const [k, p] of Object.entries(t.inputSchema.properties))
      assert.ok(p.description, `${t.name}.${k} has no description (add one to PARAM_DOCS)`);
  }
});

test('tool list: descriptions only name tools that exist', () => {
  const names = new Set(allTools.map(t => t.name));
  for (const ref of JSON.stringify(allTools).match(/canvas_[a-z_]+/g))
    assert.ok(names.has(ref), ref);
});

test('listing-only server: same tools as the connector, calls explain how to deploy', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([listingServer().connect(a), client.connect(b)]);
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map(t => t.name),
    allTools.map(t => t.name),
  );
  const result = await client.callTool({ name: 'canvas_courses', arguments: {} });
  assert.equal(result.isError, true);
  assert.equal(result.content[0].text, LISTING_ONLY_NOTICE);
  assert.match(LISTING_ONLY_NOTICE, /npx -y neuro-canvas-lms/);
  await client.close();
});
