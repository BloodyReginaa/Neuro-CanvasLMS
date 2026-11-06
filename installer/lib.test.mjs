import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCanvasHost,
  validWorkerName,
  connectorConfig,
  parseWorkerUrl,
  detectLang,
  parseArgs,
} from './lib.mjs';

test('school Canvas addresses are accepted however people paste them', () => {
  for (const [input, host] of [
    ['https://umamherst.instructure.com/courses/41051/modules', 'umamherst.instructure.com'],
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
