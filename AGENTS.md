# Agent instructions

This repo, **Neuro-CanvasLMS** (`neuro-canvas-lms`), is a read-only Canvas LMS connector (remote MCP server on Cloudflare Workers) that
each student deploys to their **own** Cloudflare account.

- To set up, deploy, renew a token, update or troubleshoot: follow
  `.claude/skills/canvas-connector-setup/SKILL.md` step by step (Claude Code loads it
  automatically as a skill; other agents should read it).
- Reply in the user's language. Most users are students, not developers.
- Never ask for, read, type or store the user's Canvas access token — they paste it only
  into the connector's authorization page in their browser.
- Keep it read-only: no write routes, no generic URL-fetch tools. Run `npm test` before deploying.
- User-specific values live only in `config.mjs` and `wrangler.jsonc`.

Code map: `worker.mjs` (OAuth + MCP entry), `canvas.mjs` + `read-tools.mjs` (tools → fixed GET
routes), `canvas-transport.mjs` (TLS socket transport to Canvas), `file-content.mjs` (text
extraction), `zip-content.mjs` (server-side ZIP unpacking), `module-file.mjs` + `file-resource.mjs` (original files as MCP resources),
`owner.mjs` (owner binding, allowed OAuth clients), `i18n.mjs` + `pages.mjs` (web pages).
Updates: `version.mjs` (release version, served at /healthz), `connector-update.mjs` (the
`connector_update` tool + update notices), `update-keys.mjs` (shared KV keys), `updater/` (the
separate updater Worker: signed-release check, install, health check, rollback),
`scripts/release.mjs` + `scripts/keygen.mjs` (maintainer: sign and publish releases).
Never rename or remove MCP tools (clients store per-tool approvals by name); only add.
