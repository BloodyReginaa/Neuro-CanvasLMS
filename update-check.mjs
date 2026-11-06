// Tells the user when a newer version of the connector is out. Every deployment keeps running the
// code it was installed with and nobody announces updates, so once a day the connector reads the
// version number in this project's package.json on GitHub. Only that number is used: nothing
// about the user is sent, and no text from GitHub reaches the AI (the notice is written here).
// The check runs in the background after a request; a failed check just shows no notice.
export const UPDATE_SOURCE =
  'https://raw.githubusercontent.com/BloodyReginaa/Neuro-CanvasLMS/main/package.json';
export const UPDATE_COMMAND = 'npx -y github:BloodyReginaa/Neuro-CanvasLMS';
export const UPDATE_KEY = 'update:latest'; // in OAUTH_KV: { version, checked }
import { localTime } from './time.mjs';

export const PROJECT_URL = 'https://github.com/BloodyReginaa/Neuro-CanvasLMS';
const DAY = 24 * 3600 * 1000;
const FRESH = 10 * 60 * 1000; // when the user asks, a check younger than this is good enough
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
// latest.now(kv) → { version, checked } after a check at most FRESH old (for the version tool).
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
  async function load(kv) {
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
  }
  const start = kv => (running ??= check(kv, memo.version).finally(() => (running = null)));
  async function latest(kv, waitUntil) {
    await load(kv);
    if (now() - memo.checked > DAY && !running) waitUntil(start(kv));
    return memo.version;
  }
  latest.now = async kv => {
    await load(kv);
    if (now() - memo.checked > FRESH) await start(kv);
    return { version: memo.version, checked: memo.checked };
  };
  return latest;
}

// What the AI is told when a newer version exists (null otherwise).
export function updateNotice(latest, current) {
  if (!newer(latest, current)) return null;
  return `Neuro-CanvasLMS ${latest} is available; this connector runs ${current}. Tell the user once in this conversation, briefly, after answering their question: to update, run ${UPDATE_COMMAND} in a terminal on the computer they installed it from (Node.js 22 or newer). It keeps their connection, so nothing needs to be reconnected.`;
}

export const versionTool = {
  name: 'canvas_connector_version',
  description:
    'Which version of this Canvas connector (Neuro-CanvasLMS) is running and whether a newer one is out, checked against the project on GitHub, with the command to update. Use it when the user asks whether the connector itself has an update. Does not read Canvas.',
  inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

// The version tool's answer. latest is an updateChecker(); timeZone shows when GitHub was checked.
export async function connectorVersion(latest, kv, running, { timeZone } = {}) {
  const { version, checked } = await latest.now(kv);
  const out = {
    connector: 'Neuro-CanvasLMS',
    running_version: running,
    latest_version: version,
    up_to_date: version ? !newer(version, running) : null,
    checked_at: checked
      ? localTime(new Date(checked), timeZone) || new Date(checked).toISOString()
      : null,
    project: PROJECT_URL,
  };
  if (!version) out.note = 'GitHub could not be reached to check; try again later.';
  else if (newer(version, running))
    out.how_to_update = `Run ${UPDATE_COMMAND} in a terminal on the computer the connector was installed from (Node.js 22 or newer), then answer y. It keeps the connection; nothing needs to be reconnected.`;
  return out;
}
