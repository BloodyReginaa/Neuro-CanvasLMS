# Agent instructions

This repo, **Neuro-CanvasLMS** (`neuro-canvas-lms`), is a read-only Canvas LMS connector (remote MCP
server on Cloudflare Workers) that each user deploys to their **own** Cloudflare account. It works
with any Canvas school; nothing school-specific is in the code (the school comes from Worker vars).
It is a community project provided as is.

- To install, update, reconnect, uninstall or troubleshoot: follow
  `.claude/skills/canvas-connector-setup/SKILL.md` (Claude Code loads it as a skill; other agents
  should read it). The installer is `npm run setup` / `npx -y github:BloodyReginaa/Neuro-CanvasLMS`.
- Reply in the user's language. Most users are students, not developers.
- Never ask for, read, type or store the user's Canvas access token — they paste it only
  into the connector's authorization page in their browser.
- Keep it read-only: no write routes, no generic URL-fetch tools. Run `npm test` before deploying;
  GitHub Actions (`.github/workflows/test.yml`) runs the tests, `npm run format:check` and the
  dry-run build on every push and pull request.
- Never rename or remove MCP tools (clients store per-tool approvals by name); only add.

Code map:
- `worker.mjs`: OAuth + MCP entry, /healthz. `config.mjs`: school settings from Worker vars.
- `canvas.mjs` + `read-tools.mjs`: tools → fixed GET routes. `canvas-transport.mjs`: fetch with a TLS
  socket fallback to Canvas.
- Results: `slim.mjs` (compact results: HTML → text, internal fields dropped, local times, list
  previews; `raw: true` skips it), `html-text.mjs` (HTML → text), `time.mjs` (time zones, day
  ranges).
- Files: `file-content.mjs` (text extraction), `file-types.mjs` (file type detection shared by all
  readers), `zip-content.mjs` (server-side ZIP unpacking), `find-files.mjs` (finds files a course
  links to when its Files list is hidden), `external-links.mjs` (Google/Dropbox/GitHub share links →
  the file itself), `module-file.mjs` + `file-resource.mjs` (original files as MCP resources).
- `owner.mjs`: owner binding, allowed OAuth clients. `i18n.mjs` + `pages.mjs`: web pages.
- `update-check.mjs`: once a day reads the newest version number from GitHub; when it is newer the AI
  tells the user how to update.
- `installer/`: the setup wizard (re-running it asks once, y/n, then updates with the saved
  settings; without a terminal it does not ask). `version.mjs`: shown on
  the home page and /healthz, compared with GitHub by update-check.mjs.
