---
name: canvas-connector-setup
description: Install, update, reconnect, uninstall or troubleshoot this repo's read-only Canvas LMS connector (a remote MCP server on the user's own Cloudflare account) so Claude (web, desktop, mobile, Claude Code) or ChatGPT can read their Canvas. Use when the user asks to set up / install / deploy the Canvas connector, connect Canvas to Claude or ChatGPT, renew an expired Canvas token, update or remove the connector, use it at their school, or fix connector errors.
---

# Canvas connector setup

The user runs **their own copy** of this connector in their own Cloudflare account. The
installer (`npm run setup`, same as `npx -y github:BloodyReginaa/Neuro-CanvasLMS`) does all the
technical work. Most users are not developers: explain each step in one plain sentence, **in the
user's language**.

## Hard rules

1. **Never ask for, read, type, store or print the user's Canvas access token.** They paste it only
   into the connector's authorization page in their browser. If they paste one into chat, tell
   them not to, do not use it, and suggest deleting it in Canvas and making a new one.
2. Never print, copy or commit Cloudflare credentials.
3. Do not describe this project as official or endorsed by any school or by Instructure.
4. Keep it read-only: no write/POST routes, no generic URL-fetch tools.
5. The user clicks the Cloudflare "Authorize" button and authorizes the connector themselves.

## Install

1. Check `node -v` (needs 22+; otherwise point them to https://nodejs.org). Run `npm install`,
   then `npm test` (all must pass).
2. Ask for their school's Canvas address (what they see in the browser's address bar when they use
   Canvas) and, optionally, the school's name.
3. **Before running the installer, tell them:** a Cloudflare page will open, maybe in a background
   tab, and they must click the blue **Authorize** button within about 2 minutes. If it times out,
   they close the old consent tabs and you run the installer again.
4. Run it (non-interactive form, so it works from an agent):
   ```bash
   npm run setup -- --canvas-host "<address they gave>" --school "<name or empty>" --yes
   ```
   It signs in, checks that the address is a real Canvas API (401 JSON), creates storage
   (`<name>-oauth`), deploys, health-checks, and prints the connector URL. If the Cloudflare
   login has several accounts, add `--account-id <id>` (from `npx wrangler whoami`).
5. Then the user, in their browser:
   - Canvas → Account → Settings → **+ New Access Token** (schools may cap it, e.g. 30 days at
     UMass Amherst; copy it right away).
   - Claude: Settings → Connectors → **Add custom connector** → the printed `…/mcp` URL →
     **Connect** → paste the Canvas token → Authorize. Works on every device with the same account,
     including Claude Code (check with `/mcp`).
   - ChatGPT: custom connector in developer mode, same URL. Menu names change; follow the UI.
6. Test in a **new chat**: "What assignments do I have due this week?"

Connect right after installing: until the first authorization, whoever authorizes first becomes
the owner. (To pin the owner, add `OWNER_CANVAS_ID` to the vars in
`~/.neuro-canvas-lms/<name>/wrangler.jsonc` and deploy that file with wrangler.)

## Update / reinstall / uninstall

- **Update:** `git pull`, then run the installer again (or `npx -y github:BloodyReginaa/Neuro-CanvasLMS`).
  It reuses the storage, so connections keep working. Start a new chat afterwards (clients cache
  tool lists).
- **Uninstall:** `npm run setup -- uninstall --yes` (deletes the Worker and its storage), then the
  user deletes the Canvas token and the connector in their AI app.

## Renewing an expired token

Symptom: "Canvas authorization expired; reconnect." The user makes a new Canvas token, then in
their AI app: connector → Disconnect → Connect → paste it. No reinstall needed.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "bound to a different Canvas account" | Someone else authorized first, or the user changed accounts. Reset: `npx wrangler kv key delete --namespace-id <id> --remote owner:canvas_user_id` (id in `~/.neuro-canvas-lms/<name>/state.json`), then connect again. |
| Installer: "does not look like a Canvas site" | They pasted the school portal or SSO page. Find the real Canvas host (often `<school>.instructure.com`). |
| Cloudflare sign-in timed out | Close old consent tabs, run the installer again, click Authorize within ~2 minutes. |
| Homepage says "not configured" / `/healthz` not ok | `CANVAS_HOST` var missing: run the installer again. |
| Verification failed, HTTP 401 | Token wrong, incomplete or expired → new token. |
| "denied access to this resource" | Canvas permission for that item (e.g. the instructor hid it). The token is fine; don't reconnect. |
| HTTP 406 / HTML error pages from Canvas | Something in front of Canvas rejected the request. API calls already retry over a raw TLS socket (`canvas-transport.mjs`). Debug with the `CANVAS_TRANSPORT` var (`fetch` / `socket`) and `npx wrangler tail`. |
| File download 403 (`text/html`) while metadata works | A firewall rejects the download's User-Agent (none, or one containing `UMassCanvas`). Keep `DOWNLOAD_UA` in `file-content.mjs` as shipped. |
| "not shared as Anyone with the link" on a module link | The Google/Dropbox file is private. Only the teacher can change that; give the user the link to open it signed in. |
| HTTP 403/404 on Files, Pages or Quizzes | The course hides that list. Files are still found with `canvas_find_files` (searches front page, syllabus, modules, assignments, announcements and linked pages); quizzes stay hidden. |
| File "exceeds 15 MiB" | Worker memory limit. Download it and open it with Claude Code locally. |
| Handwritten/scanned PDF has no text | Expected. Use `canvas_file_original` (any file id) or `canvas_module_file`; the AI reads pages as images (ask for ~150 dpi for formulas). |

## Logs

Persistent Workers Logs are on, with automatic invocation logs OFF (request headers are never
stored). The Worker writes only `{http: {path, method, status}}`, `{mcp_method}`,
`{mcp_resource_read: ok|error}` and `{canvas_transport: {via, status, reason}}`. Cloudflare
dashboard → Workers → the Worker → Logs, or live with `npx wrangler tail <name>`.
