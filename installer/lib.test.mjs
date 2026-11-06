import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCanvasHost,
  validWorkerName,
  connectorConfig,
  parseWorkerUrl,
  detectLang,
  pickLang,
  parseAppleLanguages,
  CLI_LANGS,
  parseArgs,
  updateChoices,
  updateQuestion,
  isYes,
  needsSubdomain,
  subdomainLink,
} from './lib.mjs';
import { MESSAGES, msg } from './messages.mjs';

test('school Canvas addresses are accepted however people paste them', () => {
  for (const [input, host] of [
    ['https://umamherst.instructure.com/courses/1234/modules', 'umamherst.instructure.com'],
    ['Canvas.Example.EDU', 'canvas.example.edu'],
    ['  canvas.harvard.edu/  ', 'canvas.harvard.edu'],
    ['http://school.instructure.com', 'school.instructure.com'],
  ])
    assert.equal(normalizeCanvasHost(input), host, input);
  for (const bad of ['', 'localhost', 'not a url', 'https://127.0.0.1', 'ftp:// x'])
    assert.equal(normalizeCanvasHost(bad), null, bad);
});

test('generated deployment config: this code, school vars, logs without request headers', () => {
  const template = {
    compatibility_date: '2026-09-23',
    compatibility_flags: ['nodejs_compat'],
    observability: { enabled: true, logs: { enabled: true, invocation_logs: false } },
  };
  const c = connectorConfig({
    name: 'n',
    accountId: 'a',
    kvId: 'k',
    main: '../code/worker.mjs',
    template,
    host: 'canvas.example.edu',
    school: 'Example',
  });
  assert.equal(c.main, '../code/worker.mjs');
  assert.equal(c.no_bundle, undefined);
  assert.deepEqual(c.vars, { CANVAS_HOST: 'canvas.example.edu', SCHOOL_NAME: 'Example' });
  assert.deepEqual(c.kv_namespaces, [{ binding: 'OAUTH_KV', id: 'k' }]);
  assert.equal(c.observability.logs.invocation_logs, false);
  assert.deepEqual(
    connectorConfig({ name: 'n', accountId: 'a', kvId: 'k', main: 'w', template, host: 'h.edu' })
      .vars,
    { CANVAS_HOST: 'h.edu' },
  );
});

test('small helpers', () => {
  assert.equal(
    parseWorkerUrl('Deployed\n  https://neuro-canvas-lms.someone.workers.dev\nCurrent Version'),
    'https://neuro-canvas-lms.someone.workers.dev',
  );
  assert.equal(validWorkerName('neuro-canvas-lms'), true);
  assert.equal(validWorkerName('Bad Name'), false);
  assert.equal(detectLang({ LANG: 'zh_CN.UTF-8' }), 'zh');
  assert.equal(detectLang({ LANG: 'en_US.UTF-8' }), 'en');
  assert.deepEqual(parseArgs(['uninstall', '--name', 'x', '--yes']), {
    command: 'uninstall',
    name: 'x',
    yes: true,
  });
  assert.deepEqual(parseArgs(['--canvas-host=a.edu', '--school', 'A']), {
    command: 'install',
    canvasHost: 'a.edu',
    school: 'A',
  });
});

test('installer language: system language first, English as the fallback', () => {
  // macOS: Terminal's LANG is often en_US even when the system language is Chinese.
  assert.equal(detectLang({ LANG: 'en_US.UTF-8' }, ['zh-Hans-US', 'en-US']), 'zh');
  assert.equal(detectLang({ NCLMS_LANG: 'ja', LANG: 'zh_CN.UTF-8' }, ['es-ES']), 'ja');
  assert.equal(detectLang({ LANG: 'hi_IN.UTF-8' }, []), 'hi');
  assert.equal(detectLang({ LANG: 'C' }, ['fr-FR', 'de-DE']), 'en');
  assert.equal(detectLang({}, ['fr-FR', 'es-MX']), 'es');
  assert.equal(detectLang({}, []), 'en');
  assert.equal(pickLang(['', null, 'POSIX', 'ja_JP.UTF-8']), 'ja');
  assert.deepEqual(parseAppleLanguages('(\n    "zh-Hans-US",\n    "en-US"\n)\n'), [
    'zh-Hans-US',
    'en-US',
  ]);
  assert.deepEqual(parseAppleLanguages('(\n    en,\n    ja\n)'), ['en', 'ja']);
  assert.deepEqual(parseAppleLanguages(''), []);
});

test('installer messages: every language has every message with the same placeholders', () => {
  const holes = s =>
    [...s.matchAll(/\{(\w+)\}/g)]
      .map(m => m[1])
      .sort()
      .join(',');
  const keys = Object.keys(MESSAGES.en).sort();
  assert.deepEqual(Object.keys(MESSAGES).sort(), [...CLI_LANGS].sort());
  for (const lang of CLI_LANGS) {
    assert.deepEqual(Object.keys(MESSAGES[lang]).sort(), keys, lang);
    for (const k of keys)
      assert.equal(holes(MESSAGES[lang][k]), holes(MESSAGES.en[k]), `${lang}.${k}`);
  }
  assert.equal(msg('fr', 'cancelled'), MESSAGES.en.cancelled);
  assert.match(msg('ja', 'canvas_ok', { host: 'a.edu' }), /a\.edu/);
});

test('re-running on an existing install updates it without asking anything', () => {
  const state = {
    url: 'https://neuro-canvas-lms.you.workers.dev',
    host: 'canvas.example.edu',
    school: 'Example University',
    accountId: 'acc1',
  };
  assert.deepEqual(updateChoices(state, {}), {
    updating: true,
    host: 'canvas.example.edu',
    askHost: false,
    school: 'Example University',
    askSchool: false,
    accountId: 'acc1',
  });
  // flags still win
  const flagged = updateChoices(state, {
    canvasHost: 'canvas.other.edu',
    school: '',
    accountId: 'acc2',
  });
  assert.equal(flagged.host, 'canvas.other.edu');
  assert.equal(flagged.school, '');
  assert.equal(flagged.accountId, 'acc2');
  // a first install asks; a half-finished one (no URL yet) asks again
  for (const s of [{}, { host: 'canvas.example.edu' }]) {
    const first = updateChoices(s, {});
    assert.equal(first.updating, false);
    assert.equal(first.askHost, true);
    assert.equal(first.askSchool, true);
    assert.equal(first.accountId, undefined);
  }
});

test('an update asks once, and the question fits the versions', () => {
  assert.equal(updateQuestion('2.8.0', '2.8.2'), 'update_q');
  assert.equal(updateQuestion('2.8.2', '2.8.2'), 'update_q_same');
  assert.equal(updateQuestion('2.9.0', '2.8.2'), 'update_q_older'); // an old copy would downgrade
  assert.equal(updateQuestion(null, '2.8.2'), 'update_q_unknown');
  for (const lang of CLI_LANGS) {
    const q = msg(lang, 'update_q', { name: 'neuro-canvas-lms', from: '2.8.0', to: '2.8.2' });
    assert.ok(q.includes('2.8.0') && q.includes('2.8.2') && q.endsWith('(y/n)'), lang);
  }
  for (const yes of ['y', 'Y', 'yes', ' YES ']) assert.ok(isYes(yes), yes);
  for (const no of ['', 'n', 'no', 'ok', 'yy', null, undefined]) assert.ok(!isYes(no), String(no));
});

test("a new Cloudflare account without a workers.dev subdomain is recognised (wrangler's own words)", () => {
  // what wrangler prints when it cannot ask (no terminal) on an account without a subdomain
  const out = `▲ [WARNING] You need to register a workers.dev subdomain before publishing to workers.dev
✘ [ERROR] You can either deploy your worker to one or more routes by specifying them in your wrangler.jsonc file, or register a workers.dev subdomain here: https://dash.cloudflare.com/abc/workers/onboarding`;
  assert.ok(needsSubdomain(out));
  assert.ok(!needsSubdomain('✘ [ERROR] Authentication error [code: 10000]'));
  assert.ok(!needsSubdomain(undefined));
  assert.equal(subdomainLink('abc123'), 'https://dash.cloudflare.com/abc123/workers/onboarding');
  for (const lang of CLI_LANGS)
    assert.ok(msg(lang, 'subdomain_needed', { link: 'L' }).includes('L'), lang);
});
