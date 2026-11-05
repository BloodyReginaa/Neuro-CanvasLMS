import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGS, STRINGS, pickLang, t } from './i18n.mjs';
import { homePage, authorizePage, messagePage } from './pages.mjs';
const req = (url, al) => new Request(url, { headers: al ? { 'accept-language': al } : {} });

test('every language defines every key with the same placeholders', () => {
  const keys = Object.keys(STRINGS.en);
  for (const l of LANGS) {
    assert.deepEqual(Object.keys(STRINGS[l]).sort(), [...keys].sort(), l);
    for (const k of keys) {
      const ph = s => (s.match(/\{\w+\}/g) ?? []).sort().join();
      assert.equal(ph(STRINGS[l][k]), ph(STRINGS.en[k]), `${l}.${k}`);
      assert.ok(STRINGS[l][k].trim(), `${l}.${k} empty`);
      assert.doesNotMatch(STRINGS[l][k], /[<>]/, `${l}.${k} contains HTML`);
    }
    assert.equal(
      STRINGS[l].scopes.split('|').length,
      STRINGS.en.scopes.split('|').length,
      l + ' scopes',
    );
  }
});
test('language is chosen from ?lang, then Accept-Language q-weights, then English', () => {
  assert.equal(pickLang(req('https://x/?lang=ja', 'zh-CN')), 'ja');
  assert.equal(pickLang(req('https://x/', 'zh-TW,zh;q=0.9')), 'zh-CN');
  assert.equal(pickLang(req('https://x/', 'fr-FR,es;q=0.8,en;q=0.5')), 'es');
  assert.equal(pickLang(req('https://x/', 'en;q=0.2,hi-IN;q=0.9')), 'hi');
  assert.equal(pickLang(req('https://x/', 'fr,de')), 'en');
  assert.equal(pickLang(req('https://x/?lang=xx')), 'en');
});
test('school name is interpolated', () => {
  assert.match(t('ja', 'auth_title', { school: 'UMass Amherst' }), /UMass Amherst の Canvas/);
});
test('pages render in every language, escape input, and keep OAuth params in language links', () => {
  const url = 'https://w.example/authorize?response_type=code&client_id=abc&state=%3Cx%3E';
  for (const l of LANGS) {
    for (const html of [
      homePage(l, url, { bound: true }),
      authorizePage(l, url, { csrf: 'c"<', returnTo: 'https://claude.ai/<b>' }),
      messagePage(l, url, {
        titleKey: 'fail_title',
        bodyKey: 'fail_hint',
        detail: '<script>',
        backHref: '/authorize?a=1',
      }),
    ]) {
      assert.match(html, new RegExp(`<html lang="${l}">`));
      assert.doesNotMatch(html, /<script>|<b>|c"</);
    }
    assert.match(
      authorizePage(l, url, { csrf: 'x', returnTo: 'r' }),
      /client_id=abc&amp;state=%3Cx%3E&amp;lang=/,
    );
  }
});
