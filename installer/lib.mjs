// Pure helpers for the installer (no I/O), so every piece is unit-tested.
import { isValidCanvasHost } from '../config.mjs';

import { newer } from '../update-check.mjs';

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

export const CLI_LANGS = ['en', 'zh', 'es', 'ja', 'hi'];
// First supported language among the candidates (most preferred first); English otherwise.
export function pickLang(candidates) {
  for (const c of candidates) {
    const tag = String(c ?? '')
      .trim()
      .toLowerCase();
    if (!tag || tag === 'c' || tag === 'posix') continue;
    const base = tag.split(/[-_.@]/)[0];
    if (CLI_LANGS.includes(base)) return base;
  }
  return 'en';
}
// Order: explicit NCLMS_LANG, the operating system's preferred languages (macOS AppleLanguages —
// Terminal's LANG is often en_US even on a Chinese system), the locale env vars, then English.
export function detectLang(env = process.env, systemLanguages = []) {
  return pickLang([env.NCLMS_LANG, ...systemLanguages, env.LC_ALL, env.LC_MESSAGES, env.LANG]);
}
// Parses `defaults read -g AppleLanguages` output: ( "zh-Hans-US", "en-US" ) or ( en, ja ).
export const parseAppleLanguages = out =>
  (out.match(/[A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*/g) ?? []).filter(Boolean);

export function parseArgs(argv) {
  const out = { command: 'install' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['install', 'uninstall', 'help', 'check'].includes(a)) out.command = a;
    else if (a === '--yes' || a === '-y') out.yes = true;
    else if (a.startsWith('--')) {
      const [k, v] = a.includes('=') ? a.slice(2).split(/=(.*)/s) : [a.slice(2), argv[++i]];
      out[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
  }
  return out;
}

// Re-running the installer on an existing install is an update: it asks nothing and reuses the
// saved Canvas address, school name and Cloudflare account, unless a flag says otherwise.
export function updateChoices(state = {}, args = {}) {
  const updating = Boolean(state.url && state.host);
  return {
    updating,
    host: args.canvasHost ?? (updating ? state.host : undefined),
    askHost: !(args.canvasHost || updating),
    school: args.school ?? (updating ? (state.school ?? '') : undefined),
    askSchool: args.school === undefined && !updating,
    accountId: args.accountId ?? (updating ? state.accountId : undefined),
  };
}

// Re-running asks once before it updates. Which question depends on the version the connector runs
// now (null when it did not answer) and the version of the code being installed.
export function updateQuestion(running, next) {
  if (!running) return 'update_q_unknown';
  if (newer(next, running)) return 'update_q';
  if (newer(running, next)) return 'update_q_older';
  return 'update_q_same';
}
// Only y / yes goes ahead; anything else, Enter included, changes nothing.
export const isYes = answer => /^(?:y|yes)$/i.test(String(answer ?? '').trim());

// A brand-new Cloudflare account has no workers.dev subdomain yet. wrangler asks for one only in an
// interactive terminal; run by the installer it gives up with this message and a dashboard link.
export const needsSubdomain = out => /register a workers\.dev subdomain/i.test(out ?? '');
export const subdomainLink = accountId =>
  `https://dash.cloudflare.com/${encodeURIComponent(accountId)}/workers/onboarding`;

// A new workers.dev address answers only once its DNS and HTTPS certificate are ready, which can
// take minutes on a brand-new subdomain. These errors mean "not ready yet", not "broken".
export const isWarmingUp = detail =>
  /SSL|TLS|CERT|UNABLE_TO_VERIFY|SELF_SIGNED|EPROTO|handshake|ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|certificate/i.test(
    detail ?? '',
  );
export const CHECK_WAIT = 60 * 1000; // a normal deploy answers within a minute
export const WARMUP_WAIT = 5 * 60 * 1000; // a new address may need a few minutes for its certificate
