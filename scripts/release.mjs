// Maintainer only: build, sign and publish a release that updaters can install.
//   node scripts/release.mjs --dry     build + sign into dist/release, publish nothing
//   node scripts/release.mjs           also create the GitHub release v<version>
import { execFileSync } from 'node:child_process';
import { createPrivateKey, sign, createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseJsonc } from './jsonc.mjs';
import { KEY_PATH } from './keygen.mjs';
import { VERSION } from '../version.mjs';

const root = new URL('..', import.meta.url).pathname;
const dry = process.argv.includes('--dry');
const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
const out = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim();
const fail = msg => {
  console.error('✗ ' + msg);
  process.exit(1);
};

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.version !== VERSION)
  fail(`version.mjs (${VERSION}) and package.json (${pkg.version}) differ`);
if (!fs.existsSync(KEY_PATH))
  fail(`no signing key at ${KEY_PATH} (run node scripts/keygen.mjs once)`);
if (!dry) {
  if (out('git', ['status', '--porcelain'])) fail('working tree is not clean; commit first');
  if (out('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') fail('release from main only');
  try {
    out('gh', ['release', 'view', `v${VERSION}`]);
    fail(`release v${VERSION} already exists; bump the version`);
  } catch {}
}

sh('npm', ['test', '--silent']);
const build = path.join(root, 'dist', 'release-build');
fs.rmSync(build, { recursive: true, force: true });
sh(
  'npx',
  ['wrangler', 'deploy', '--dry-run', '--minify', '--outdir', build, '-c', 'wrangler.jsonc'],
  {
    stdio: ['ignore', 'ignore', 'inherit'],
  },
);
const config = parseJsonc(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
const bundle = fs.readFileSync(path.join(build, 'worker.js'));

const manifest = {
  schema: 1,
  name: 'neuro-canvas-lms',
  version: VERSION,
  published_at: new Date().toISOString(),
  min_updater: 1,
  compatibility_date: config.compatibility_date,
  compatibility_flags: config.compatibility_flags ?? [],
  main_module: 'worker.js',
  required_bindings: ['OAUTH_KV'],
  commit: out('git', ['rev-parse', 'HEAD']),
  files: [
    {
      name: 'worker.js',
      size: bundle.length,
      sha256: createHash('sha256').update(bundle).digest('hex'),
      type: 'application/javascript+module',
    },
  ],
};
const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
const signature = sign(null, manifestBytes, createPrivateKey(fs.readFileSync(KEY_PATH))).toString(
  'base64',
);

const dist = path.join(root, 'dist', 'release');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'worker.js'), bundle);
fs.writeFileSync(path.join(dist, 'release.json'), manifestBytes);
fs.writeFileSync(path.join(dist, 'release.json.sig'), signature + '\n');
console.log(
  `✓ v${VERSION}: worker.js ${(bundle.length / 1024).toFixed(0)} KB, signed → dist/release`,
);

if (!dry) {
  sh('gh', [
    'release',
    'create',
    `v${VERSION}`,
    path.join(dist, 'worker.js'),
    path.join(dist, 'release.json'),
    path.join(dist, 'release.json.sig'),
    '--title',
    `Neuro-CanvasLMS v${VERSION}`,
    '--notes',
    `Signed release for the Neuro-CanvasLMS updater (commit ${manifest.commit.slice(0, 7)}).`,
  ]);
  console.log(
    `✓ published v${VERSION}. Early-channel updaters install it within ~6 h, stable ones after 24 h.`,
  );
}
