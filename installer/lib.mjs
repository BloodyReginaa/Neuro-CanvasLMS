// Pure helpers for the installer (no I/O), so every piece is unit-tested.
import { randomInt } from 'node:crypto';
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
// The school name (shown on the connector's pages) is never asked: it is optional, so it comes
// only from --school or an earlier install.
export function updateChoices(state = {}, args = {}) {
  const updating = Boolean(state.url && state.host);
  return {
    updating,
    host: args.canvasHost ?? (updating ? state.host : undefined),
    askHost: !(args.canvasHost || updating),
    school: String(args.school ?? state.school ?? '').slice(0, 80),
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

// A brand-new Cloudflare account has no workers.dev subdomain yet, and the connector's address needs
// one. The installer registers a random one itself through Cloudflare's API, with the login wrangler
// already has, so nobody has to pick a name in the dashboard. If that does not work, the deploy
// fails with the message below and the user is sent to the dashboard as before.
export const needsSubdomain = out => /register a workers\.dev subdomain/i.test(out ?? '');
export const subdomainLink = accountId =>
  `https://dash.cloudflare.com/${encodeURIComponent(accountId)}/workers/onboarding`;
export const subdomainApi = accountId =>
  `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/subdomain`;
// "neuro-" and 6 random letters or digits: hardly ever taken, and says nothing about the user.
const ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const subdomainCandidate = (rand = randomInt) =>
  'neuro-' + Array.from({ length: 6 }, () => ALNUM[rand(ALNUM.length)]).join('');
// The first complete JSON object in text that may have other lines around it (which can contain
// braces, or other JSON, too) and that `wanted` accepts; null if there is none.
export function findJsonObject(text, wanted = () => true) {
  const s = String(text ?? '');
  for (let a = s.indexOf('{'); a !== -1; a = s.indexOf('{', a + 1))
    for (let b = s.indexOf('}', a); b !== -1; b = s.indexOf('}', b + 1)) {
      let j;
      try {
        j = JSON.parse(s.slice(a, b + 1));
      } catch {
        continue;
      }
      if (j && typeof j === 'object' && !Array.isArray(j) && wanted(j)) return j;
      break; // a complete object that is not the one: look at the next {
    }
  return null;
}
const CREDENTIAL_TYPES = ['oauth', 'api_token', 'api_key'];
// Request headers for Cloudflare's API from `wrangler auth token --json` output; null if unusable.
// The JSON spans several lines and wrangler may print notes or warnings around it. The credentials
// only live in the installer's memory for these requests.
export function apiAuth(out) {
  const j = findJsonObject(out, o => CREDENTIAL_TYPES.includes(o.type));
  if ((j?.type === 'oauth' || j?.type === 'api_token') && typeof j.token === 'string' && j.token)
    return { Authorization: `Bearer ${j.token}` };
  if (j?.type === 'api_key' && typeof j.key === 'string' && typeof j.email === 'string')
    return { 'X-Auth-Key': j.key, 'X-Auth-Email': j.email };
  return null;
}
// What Cloudflare's answer about the account's workers.dev subdomain means:
// { subdomain } it has this one · { missing } none yet (10007) · { taken } that name belongs to
// someone else (10031) · { emailUnverified } the account's email is not verified yet · { error }.
export function subdomainAnswer(body) {
  const name = body?.result?.subdomain;
  if (body?.success && typeof name === 'string' && name) return { subdomain: name };
  const errors = Array.isArray(body?.errors) ? body.errors : [];
  if (errors.some(e => needsEmailVerification(e?.message))) return { emailUnverified: true };
  if (errors.some(e => e?.code === 10007)) return { missing: true };
  if (errors.some(e => e?.code === 10031)) return { taken: true };
  const detail = errors.map(e => `${e?.code ?? ''} ${e?.message ?? ''}`.trim()).join('; ');
  return { error: detail || 'no answer' };
}
// A new Cloudflare account must verify its email address before it can deploy anything.
export const needsEmailVerification = out =>
  /email_verification_required|verify your account's email/i.test(out ?? '');

// A new workers.dev address answers only once its DNS and HTTPS certificate are ready, which can
// take minutes on a brand-new subdomain. These errors mean "not ready yet", not "broken".
export const isWarmingUp = detail =>
  /SSL|TLS|CERT|UNABLE_TO_VERIFY|SELF_SIGNED|EPROTO|handshake|ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|certificate/i.test(
    detail ?? '',
  );
export const CHECK_WAIT = 60 * 1000; // a normal deploy answers within a minute
export const WARMUP_WAIT = 5 * 60 * 1000; // a new address may need a few minutes for its certificate
