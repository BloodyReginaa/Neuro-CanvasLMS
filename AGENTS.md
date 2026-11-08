# Agent instructions

This repo, **Neuro-CanvasLMS** (`neuro-canvas-lms`), is a read-only Canvas LMS connector (remote MCP
server on Cloudflare Workers) that each user deploys to their **own** Cloudflare account. It works
with any Canvas school that lets students create access tokens; nothing school-specific is in the
code (the school comes from Worker vars). It is a community project provided as is.

- To install, update, reconnect, uninstall or troubleshoot: follow
  `.claude/skills/canvas-connector-setup/SKILL.md` (Claude Code loads it as a skill; other agents
  should read it). The installer is `npm run setup` / `npx -y neuro-canvas-lms`.
- Reply in the user's language. Most users are students, not developers.
- Never ask for, read, type or store the user's Canvas access token — they paste it only
  into the connector's authorization page in their browser.
- Keep it read-only: no write routes, no generic URL-fetch tools. Run `npm test` before deploying;
  GitHub Actions (`.github/workflows/test.yml`) runs the tests, `npm run format:check` and the
  dry-run build on every push and pull request.
- Never rename or remove MCP tools (clients store per-tool approvals by name); only add.
- Versions: every release makes every user's AI announce an update, so release only what users
  gain from. Patch: fixes. Minor: new tools or parameters, a tool answering differently, install
  changes. Major: only if users must act (reconnect, change Cloudflare settings, newer Node).
  Docs, CI and test changes are not released on their own. Bump the version only in the release
  commit (version.mjs, `npm version x.y.z --no-git-tag-version`, server.json), after testing on a
  real connector and in a new chat.

Code map:
- `worker.mjs`: OAuth + MCP entry, /healthz. `config.mjs`: school settings from Worker vars.
- `canvas.mjs` + `read-tools.mjs`: tools → fixed GET routes. `tool-list.mjs`: every tool in tools/list order,
  plus PARAM_DOCS (what each id parameter is and where it comes from); a test requires every tool
  and parameter to be described. `canvas-transport.mjs`: fetch with a TLS
  socket fallback to Canvas.
- Results: `slim.mjs` (compact results: HTML → text, internal fields dropped, local times, list
  previews; `raw: true` skips it), `html-text.mjs` (HTML → text), `time.mjs` (time zones, day
  ranges).
- Files: `file-content.mjs` (text extraction), `file-types.mjs` (file type detection shared by all
  readers), `zip-content.mjs` (server-side ZIP unpacking), `find-files.mjs` (finds files a course
  links to when its Files list is hidden), `external-links.mjs` (Google/Dropbox/GitHub share links →
  the file itself), `link-content.mjs` (text of a file linked in the syllabus, a page, an
  assignment or an announcement; only links that content really contains), `module-file.mjs` +
  `file-resource.mjs` (original files as MCP resources),
  `download-link.mjs` (one-time, minutes-long Canvas storage link so coding agents can curl an original
  file to disk).
- `owner.mjs`: owner binding, allowed OAuth clients. `i18n.mjs` + `pages.mjs`: web pages.
  `page-scene.mjs`: their one script (allowed by its hash in the CSP; pages stay off the network):
  the black-hole scene and the step-by-step authorization. Everything works without it.
- `update-check.mjs`: once a day reads the newest version number from npm; when it is newer the AI
  tells the user how to update. Also the `canvas_connector_version` tool.
- `installer/`: the setup wizard. On a new Cloudflare account it registers a random workers.dev
  subdomain through Cloudflare's API. Re-running it asks once (y/n), then updates with the saved
  settings (without a terminal it does not ask). `installer/verify.mjs`: the post-deploy online
  check, also run alone by `npx -y neuro-canvas-lms check`.
- `version.mjs`: shown on the home page and /healthz, compared with npm by update-check.mjs.
- `Dockerfile` + `scripts/glama-stdio.mjs`: a listing-only stdio server for MCP directories (Glama)
  to read the tool list; it has no Canvas access and every call says how to deploy. Not in the npm
  package.
- `server.json`: the entry in the official MCP Registry (one remote whose host each user fills in).
  Same version as `version.mjs` and package.json (`version.test.mjs`).
- Releases: bump those three, push to main, then push a tag `vX.Y.Z`;
  `.github/workflows/publish.yml` tests, publishes to npm and updates the MCP Registry, with
  no stored secrets (OIDC trusted publishing).
