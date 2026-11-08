// The connector's version, shown on its home page and at /healthz (the installer checks that the
// deployed version answers). Bump it together with package.json and server.json (the MCP Registry
// entry) when something changes; version.test.mjs checks they match.
export const VERSION = '2.13.0';
