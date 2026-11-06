// Maintainer only: stop a bad release from reaching more users.
//   node scripts/yank.mjs v2.2.0
// Marks the GitHub release as a pre-release, so .../releases/latest/download/ points back to the
// previous release. Updaters then see nothing newer and do not install the yanked version (those
// already on it stay there until a fixed, higher version is released). Undo with:
//   gh release edit v2.2.0 --prerelease=false --latest
import { execFileSync } from 'node:child_process';
const tag = process.argv[2];
if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '')) {
  console.error('usage: node scripts/yank.mjs vX.Y.Z');
  process.exit(1);
}
execFileSync('gh', ['release', 'edit', tag, '--prerelease', '--latest=false'], {
  stdio: 'inherit',
});
const latest = execFileSync('gh', ['release', 'view', '--json', 'tagName', '-q', '.tagName'], {
  encoding: 'utf8',
}).trim();
console.log(`✓ ${tag} yanked. Updaters now see ${latest || 'no release'} as the latest.`);
