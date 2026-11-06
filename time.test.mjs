import test from 'node:test';
import assert from 'node:assert/strict';
import { timeZoneCache } from './time.mjs';

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

test('a failed read is not kept; an unknown zone means "no zone"', async () => {
  const zoneOf = timeZoneCache();
  assert.equal(
    await zoneOf('a', async () => {
      throw new Error('Canvas authorization expired; reconnect.');
    }),
    null,
  );
  // the next call tries again
  assert.equal(await zoneOf('a', async () => 'America/Chicago'), 'America/Chicago');
  const other = timeZoneCache();
  for (const bad of [undefined, null, '', 'Mars/Olympus', 42, 'x'.repeat(100)])
    assert.equal(await timeZoneCache()('a', async () => bad), null, String(bad));
  assert.equal(await other('a', async () => 'UTC'), 'UTC');
});
