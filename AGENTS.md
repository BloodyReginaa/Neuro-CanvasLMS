# Agent instructions

This repo, **Neuro-CanvasLMS** (`neuro-canvas-lms`), is a read-only Canvas LMS connector (remote MCP
server on Cloudflare Workers) that each user deploys to their **own** Cloudflare account. It works
with any Canvas school; nothing school-specific is in the code (the school comes from Worker vars).
It is a community project provided as is.

- To install, update, reconnect, uninstall or troubleshoot: follow
  `.claude/skills/canvas-connector-setup/SKILL.md` (Claude Code loads it as a skill; other agents
  should read it). The installer is `npm run setup` / `npx github:BloodyReginaa/Neuro-CanvasLMS`.
- Reply in the user's language. Most users are students, not developers.
- Never ask for, read, type or store the user's Canvas access token — they paste it only
  into the connector's authorization page in their browser.
- Keep it read-only: no write routes, no generic URL-fetch tools. Run `npm test` before deploying.
- Never rename or remove MCP tools (clients store per-tool approvals by name); only add.

Code map: `worker.mjs` (OAuth + MCP entry, /healthz), `config.mjs` (school settings from vars),
`canvas.mjs` + `read-tools.mjs` (tools → fixed GET routes), `canvas-transport.mjs` (fetch with TLS
socket fallback to Canvas), `file-content.mjs` (text extraction), `file-types.mjs` (file type detection shared by all readers), `zip-content.mjs` (server-side
ZIP unpacking), `find-files.mjs` (finds files a course links to when its Files list is hidden), `module-file.mjs` + `file-resource.mjs` (original files as MCP resources),
`owner.mjs` (owner binding, allowed OAuth clients), `i18n.mjs` + `pages.mjs` (web pages),
`installer/` (the setup wizard), `version.mjs` (shown on the home page and /healthz).
