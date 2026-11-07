import test from 'node:test';
import assert from 'node:assert/strict';
import * as config from './config.mjs';
import { endpoint } from './canvas.mjs';
import { createCanvasTransport } from './canvas-transport.mjs';
import { homePage, authorizePage } from './pages.mjs';
import { allowedDownload } from './file-content.mjs';

const defaults = {
  CANVAS_HOST: config.CANVAS_HOST,
  SCHOOL_NAME: config.SCHOOL_NAME,
  ACCENT_COLOR: config.ACCENT_COLOR,
};

test('one release serves any school: vars switch the Canvas host, name and colour everywhere', async () => {
  try {
    config.applyConfig({
      CANVAS_HOST: 'Canvas.Example.EDU',
      SCHOOL_NAME: 'Example University',
      ACCENT_COLOR: '#123456',
    });
    assert.equal(config.CANVAS_HOST, 'canvas.example.edu');
    assert.equal(endpoint('canvas_courses', {}).origin, 'https://canvas.example.edu');
    assert.equal(allowedDownload('https://canvas.example.edu/files/1/download'), true);
    let host;
    const client = createCanvasTransport(
      a => (
        (host = a.hostname),
        {
          opened: Promise.reject(new Error('stop')),
          closed: Promise.resolve(),
          close: async () => {},
        }
      ),
      () => {
        throw new Error('no fetch');
      },
      { mode: () => 'socket' },
    );
    await assert.rejects(
      client('https://canvas.example.edu/api/v1/x', {
        method: 'GET',
        redirect: 'manual',
        headers: {},
      }),
    );
    assert.equal(host, 'canvas.example.edu');
    const home = homePage('en', 'https://w.example/', { bound: true, version: '2.2.0' });
    assert.match(home, /canvas\.example\.edu/);
    assert.match(home, /Example University/);
    assert.match(home, /--accent:#123456/);
    assert.match(home, /<title>Neuro-CanvasLMS<\/title>/); // the product name once, not "X · X"
    const auth = authorizePage('en', 'https://w.example/authorize', { csrf: 'x', returnTo: 'r' });
    assert.match(auth, /Connect your Example University Canvas/);
    // one click to where the token is made, in a new tab so the form stays open
    assert.match(
      auth,
      /<a class="open" href="https:\/\/canvas\.example\.edu\/profile\/settings" target="_blank" rel="noopener noreferrer">Open Canvas settings ↗<\/a>/,
    );
  } finally {
    config.applyConfig(defaults);
  }
  assert.equal(config.CANVAS_HOST, 'canvas.example.edu');
});

test('without a school name (the installer no longer asks) every title still reads naturally', () => {
  try {
    config.applyConfig({ SCHOOL_NAME: '' });
    for (const [lang, title] of [
      ['en', 'Connect your Canvas'],
      ['zh-CN', '连接你的 Canvas'],
      ['es', 'Conecta tu Canvas'],
      ['ja', 'Canvas を接続'],
      ['hi', 'अपना Canvas जोड़ें'],
    ]) {
      const html = authorizePage(lang, 'https://w.example/authorize', { csrf: 'x', returnTo: 'r' });
      assert.ok(html.includes(`<h1>${title}</h1>`), lang);
      assert.ok(html.includes(`<title>${title} · Neuro-CanvasLMS</title>`), lang);
      const home = homePage(lang, 'https://w.example/', { bound: false, version: '2.13.0' });
      assert.ok(home.includes('<title>Neuro-CanvasLMS</title>'), lang);
    }
  } finally {
    config.applyConfig(defaults);
  }
  assert.equal(config.SCHOOL_NAME, 'Example University');
});

test('invalid settings are ignored, the previous values stay', () => {
  try {
    config.applyConfig({
      CANVAS_HOST: 'https://evil.example/x',
      ACCENT_COLOR: 'red;}body{display:none',
      SCHOOL_NAME: 'x'.repeat(500),
    });
    assert.equal(config.CANVAS_HOST, 'canvas.example.edu');
    assert.equal(config.ACCENT_COLOR, '#881c1c');
    assert.equal(config.SCHOOL_NAME.length, 80);
    for (const bad of ['localhost', '127.0.0.1', 'a..b.edu', '-x.edu', 'x'])
      assert.equal(config.isValidCanvasHost(bad), false, bad);
    assert.equal(config.isValidCanvasHost('umamherst.instructure.com'), true);
  } finally {
    config.applyConfig(defaults);
  }
});

test('nothing school-specific is built in', async () => {
  const src = (await import('node:fs')).readFileSync(
    new URL('./config.mjs', import.meta.url),
    'utf8',
  );
  assert.match(src, /export let CANVAS_HOST = '';/);
  assert.match(src, /export let SCHOOL_NAME = '';/);
});
