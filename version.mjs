// The connector's release version. Bump it together with package.json for every release;
// scripts/release.mjs refuses to publish if the two disagree. The updater compares this value
// (served at /healthz) with the latest signed release to decide whether an update is needed.
export const VERSION = '2.1.0';
