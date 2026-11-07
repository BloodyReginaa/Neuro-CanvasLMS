import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { KNOWLEDGE, SCENE_JS, sceneScriptHash } from './page-scene.mjs';
import { authorizePage, homePage, messagePage } from './pages.mjs';
import { LANGS } from './i18n.mjs';

const url = 'https://w.example/authorize?client_id=abc&state=x';
const pages = lang => [
  authorizePage(lang, url, { csrf: 'c', returnTo: 'https://claude.ai/api/mcp/auth_callback' }),
  homePage(lang, 'https://w.example/', { bound: false, version: '2.13.0' }),
  messagePage(lang, url, { titleKey: 'fail_title', bodyKey: 'fail_hint', backHref: '/authorize' }),
];

test('every page runs exactly one script, ours, and the CSP hash allows exactly that one', async () => {
  const hash = 'sha256-' + createHash('sha256').update(SCENE_JS).digest('base64');
  assert.equal(await sceneScriptHash(), hash);
  for (const lang of LANGS)
    for (const html of pages(lang)) {
      const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
      const run = scripts.filter(([, attrs]) => !/type="application\/json"/.test(attrs));
      assert.equal(run.length, 1, lang);
      assert.equal(run[0][2], SCENE_JS);
      // the scene's data is JSON that is never run, and cannot close its tag
      const data = scripts.find(([, attrs]) => /id="scene-data"/.test(attrs))[2];
      assert.doesNotMatch(data, /</);
      assert.ok(JSON.parse(data).knowledge.length > 50);
    }
  // worker.mjs adds that hash, and only that, to the pages' CSP; default-src stays 'none'
  const worker = readFileSync(new URL('./worker.mjs', import.meta.url), 'utf8');
  assert.match(worker, /script-src '\$\{await sceneScriptHash\(\)\}'/);
  assert.match(worker, /"default-src 'none';/);
  assert.doesNotMatch(worker, /unsafe-inline'[^"]*script|script-src[^"]*unsafe/);
});

test('the script cannot leak the token: no network, no storage of it, only its length is read', () => {
  assert.doesNotThrow(() => new Function(SCENE_JS)); // it parses
  assert.doesNotMatch(SCENE_JS, /<\/script/i);
  assert.doesNotMatch(
    SCENE_JS,
    /\bfetch\b|XMLHttpRequest|WebSocket|sendBeacon|EventSource|localStorage|indexedDB|postMessage|\beval\b|new Function|innerHTML|document\.cookie|\bimport\(|window\.open/,
  );
  const reads = [...SCENE_JS.matchAll(/\.value\b/g)].map(m =>
    SCENE_JS.slice(m.index, m.index + 26),
  );
  assert.deepEqual([...new Set(reads)], ['.value.trim().length >= 20']);
  // the only thing it remembers: that the intro was seen in this tab
  assert.deepEqual(SCENE_JS.match(/sessionStorage\.setItem\([^)]*\)/g), [
    "sessionStorage.setItem('nclms-intro', '1')",
  ]);
});

test('without the script nothing is hidden: the whole form shows and posts as before', () => {
  const html = authorizePage('en', url, { csrf: 'tok', returnTo: 'https://claude.ai/x' });
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  // every rule that hides a step belongs to the script's step-by-step mode
  for (const rule of css.match(/[^}]*visibility:hidden[^}]*}/g))
    assert.match(rule.trim(), /^\.flow /);
  assert.match(css, /\.ui\{[^}]*animation:reveal/); // shown even if the script never runs
  assert.match(html, /<noscript><style>\.ui\{opacity:1;animation:none\}<\/style><\/noscript>/);
  for (const field of [
    '<input type="hidden" name="csrf" value="tok">',
    '<input type="password" id="token" name="token" required',
    '<input type="checkbox" name="consent" value="yes" required>',
    '<button type="submit" class="go">Authorize</button>',
  ])
    assert.ok(html.includes(field), field);
  for (const stage of ['intro', 'token', 'consent', 'authorize', 'thanks'])
    assert.ok(html.includes(`data-stage="${stage}"`), stage);
  assert.match(html, /<form method="post" class="connect card">/);
});

test('the orbiting knowledge is short lines from many subjects', () => {
  assert.ok(KNOWLEDGE.length >= 80);
  assert.equal(new Set(KNOWLEDGE).size, KNOWLEDGE.length, 'no duplicates');
  for (const k of KNOWLEDGE) assert.ok(k.length <= 36, k);
});
