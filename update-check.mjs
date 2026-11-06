// Tells the user when a newer version of the connector is out. Every deployment keeps running the
// code it was installed with and nobody announces updates, so once a day the connector reads the
// version number in this project's package.json on GitHub. Only that number is used: nothing
// about the user is sent, and no text from GitHub reaches the AI (the notice is written here).
// The check runs in the background after a request; a failed check just shows no notice.
export const UPDATE_SOURCE =
  'https://raw.githubusercontent.com/BloodyReginaa/Neuro-CanvasLMS/main/package.json';
export const UPDATE_COMMAND = 'npx -y github:BloodyReginaa/Neuro-CanvasLMS';
export const UPDATE_KEY = 'update:latest'; // in OAUTH_KV: { version, checked }
const DAY = 24 * 3600 * 1000;
const REREAD = 3600 * 1000; // re-read the stored result at most hourly per Worker instance
const VERSION = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/;

// Is version a newer than version b? Anything that is not plain x.y.z is never newer.
export function newer(a, b) {
  const x = VERSION.exec(a ?? '');
  const y = VERSION.exec(b ?? '');
  if (!x || !y) return false;
  for (let i = 1; i <= 3; i++)
    if (Number(x[i]) !== Number(y[i])) return Number(x[i]) > Number(y[i]);
  return false;
}

// The version field of a package.json, or null.
export function versionFrom(text) {
  try {
    const v = JSON.parse(text)?.version;
    return typeof v === 'string' && VERSION.test(v) ? v : null;
  } catch {
    return null;
  }
}

// latest(kv, waitUntil) → the newest version known so far (null until the first check is done).
// When the last check is a day old it starts a new one through waitUntil, so no request waits.
export function updateChecker({ fetcher = fetch, now = Date.now } = {}) {
  let memo = null; // { version, checked, read }
  let running = null;
  async function check(kv, previous) {
    let version = previous;
    try {
      const r = await fetcher(UPDATE_SOURCE, {
        headers: { Accept: 'application/json', 'User-Agent': 'Neuro-CanvasLMS update check' },
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const text = await r.text();
        if (text.length < 65536) version = versionFrom(text) ?? previous;
      }
    } catch {}
    const record = { version, checked: now() };
    memo = { ...record, read: now() };
    try {
      await kv.put(UPDATE_KEY, JSON.stringify(record));
    } catch {}
  }
  return async function latest(kv, waitUntil) {
    if (!memo || now() - memo.read > REREAD) {
      let stored = null;
      try {
        stored = await kv.get(UPDATE_KEY, 'json');
      } catch {}
      memo = {
        version: VERSION.test(stored?.version ?? '') ? stored.version : null,
        checked: Number.isFinite(stored?.checked) ? stored.checked : 0,
        read: now(),
      };
    }
    if (now() - memo.checked > DAY && !running) {
      running = check(kv, memo.version).finally(() => (running = null));
      waitUntil(running);
    }
    return memo.version;
  };
}

// What the AI is told when a newer version exists (null otherwise).
export function updateNotice(latest, current) {
  if (!newer(latest, current)) return null;
  return `Neuro-CanvasLMS ${latest} is available; this connector runs ${current}. Tell the user once in this conversation, briefly, after answering their question: to update, run ${UPDATE_COMMAND} in a terminal on the computer they installed it from (Node.js 22 or newer). It keeps their connection, so nothing needs to be reconnected.`;
}
