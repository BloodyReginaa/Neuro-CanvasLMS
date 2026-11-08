import test from 'node:test';
import assert from 'node:assert/strict';
import { timeZoneCache, dayRange } from './time.mjs';

test('the time zone is read once per user and kept for a while', async () => {
  let clock = 0;
  let reads = 0;
  const zoneOf = timeZoneCache({ ttl: 1000, now: () => clock });
  const read = zone => async () => (reads++, zone);
  assert.equal(await zoneOf('a', read('America/New_York')), 'America/New_York');
  assert.equal(await zoneOf('a', read('Europe/Paris')), 'America/New_York'); // cached
  assert.equal(reads, 1);
  clock = 1001; // expired: read again (the user may have changed it)
  assert.equal(await zoneOf('a', read('Europe/Paris')), 'Europe/Paris');
  assert.equal(await zoneOf('b', read('Asia/Tokyo')), 'Asia/Tokyo'); // another user
  assert.equal(reads, 3);
});

test('a failed read is kept only briefly; an unknown zone means "no zone"', async () => {
  let t = 0;
  const zoneOf = timeZoneCache({ now: () => t });
  assert.equal(
    await zoneOf('a', async () => {
      throw new Error('Canvas authorization expired; reconnect.');
    }),
    null,
  );
  // within a minute the failure is remembered (Canvas is not asked again before every call)
  let asked = false;
  t = 30 * 1000;
  assert.equal(
    await zoneOf('a', async () => {
      asked = true;
      return 'UTC';
    }),
    null,
  );
  assert.equal(asked, false);
  // after that the next call tries again
  t = 61 * 1000;
  assert.equal(await zoneOf('a', async () => 'America/Chicago'), 'America/Chicago');
  // a slow lookup gives up after `timeout`, without failing the tool call
  const slow = timeZoneCache({ timeout: 20 });
  assert.equal(await slow('a', () => new Promise(r => setTimeout(() => r('UTC'), 500))), null);
  const other = timeZoneCache();
  for (const bad of [undefined, null, '', 'Mars/Olympus', 42, 'x'.repeat(100)])
    assert.equal(await timeZoneCache()('a', async () => bad), null, String(bad));
  assert.equal(await other('a', async () => 'UTC'), 'UTC');
});

test('dayRange: impossible days and reversed ranges are errors, not an empty planner', () => {
  assert.throws(
    () => dayRange('2026-02-30', '2026-03-01', 'UTC'),
    /^Error: Invalid date: 2026-02-30/,
  );
  assert.throws(
    () => dayRange('2026-01-01', '2026-13-01', 'UTC'),
    /^Error: Invalid date: 2026-13-01/,
  );
  assert.throws(() => dayRange('2026-03-05', '2026-03-01'), /^Error: Invalid date range/);
  assert.doesNotThrow(() => dayRange('2028-02-29', '2028-02-29', 'UTC')); // leap day
  assert.doesNotThrow(() => dayRange('2026-03-01', '2026-03-01'));
});
