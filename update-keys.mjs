// KV keys shared by the connector (OAUTH_KV) and the updater (STATE) — both bindings point at the
// same namespace. Kept under one prefix so they can never collide with OAuth or owner records.
export const UPDATE_KEYS = {
  status: 'updater:status', // JSON written by the updater after every check
  mode: 'updater:mode', // 'auto' | 'notify' (overrides the updater's UPDATE_MODE var)
  request: 'updater:request', // set when the owner asks for an update now
  lock: 'updater:lock', // short-lived lock so two runs never overlap
  lastCheck: 'updater:last_check', // ms timestamp of the last release check
  bad: version => `updater:bad:${version}`, // releases that failed their health check here
};
export const UPDATE_MODES = ['auto', 'notify'];
