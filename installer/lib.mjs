// Pure helpers for the installer (no I/O), so every piece is unit-tested.
import { isValidCanvasHost } from '../config.mjs';

export const DEFAULT_NAME = 'neuro-canvas-lms';

// Accepts what people paste: "https://canvas.example.edu/courses/1", "canvas.example.edu", ...
export function normalizeCanvasHost(input) {
  let s = String(input ?? '').trim();
  if (!s) return null;
  if (!/^[a-z]+:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  return isValidCanvasHost(host) ? host : null;
}

export const validWorkerName = n => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(n ?? '');

// The deployment config the installer writes for wrangler. `main` points at this copy of the code;
// wrangler bundles it. Everything school-specific is a var, nothing is edited in the code.
export function connectorConfig({ name, accountId, kvId, main, template, host, school }) {
  const vars = { CANVAS_HOST: host };
  if (school) vars.SCHOOL_NAME = school;
  return {
    name,
    main,
    account_id: accountId,
    compatibility_date: template.compatibility_date,
    compatibility_flags: template.compatibility_flags ?? [],
    workers_dev: true,
    observability: template.observability,
    kv_namespaces: [{ binding: 'OAUTH_KV', id: kvId }],
    vars,
  };
}

export const parseWorkerUrl = out => out.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i)?.[0] ?? null;

export function detectLang(env = process.env) {
  const v = env.NCLMS_LANG || env.LC_ALL || env.LC_MESSAGES || env.LANG || '';
  return /^zh/i.test(v) ? 'zh' : 'en';
}

export function parseArgs(argv) {
  const out = { command: 'install' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === 'install' || a === 'uninstall' || a === 'help') out.command = a;
    else if (a === '--yes' || a === '-y') out.yes = true;
    else if (a.startsWith('--')) {
      const [k, v] = a.includes('=') ? a.slice(2).split(/=(.*)/s) : [a.slice(2), argv[++i]];
      out[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
  }
  return out;
}
