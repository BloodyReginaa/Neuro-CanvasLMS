---
name: canvas-connector-setup
description: Deploy, connect, update, renew or troubleshoot this repo's read-only Canvas LMS connector (a remote MCP server on the user's own Cloudflare account) so Claude (web, desktop, mobile, Claude Code) or ChatGPT can read their Canvas. Use when the user asks to set up / install / deploy the Canvas connector, connect Canvas to Claude or ChatGPT, renew an expired Canvas token, update the connector, use it at another school, or fix connector errors.
---

# Canvas connector setup

You are helping a student run **their own copy** of this connector. The result: a URL like
`https://neuro-canvas-lms.<their-subdomain>.workers.dev/mcp` that they add as a custom
connector in Claude or ChatGPT. Most users are not developers — explain each step in one
plain sentence, **in the user's language**, and do the technical work yourself.

## Hard rules

1. **Never ask for, read, type, store or print the user's Canvas access token.** The user
   creates it in Canvas and pastes it only into the connector's own authorization page in
   their browser. If they paste a token into chat, tell them not to, do not use it, and
   suggest deleting it in Canvas and making a new one.
2. Never print, copy or commit Cloudflare credentials (`~/.wrangler`, `.config/`, API tokens).
3. Do not describe this project as official or endorsed by any school or by Instructure.
4. Do not weaken the read-only design (no write/POST routes, no generic URL fetch tools).
5. The user approves anything in their browser (Cloudflare login, connector authorization)
   themselves. You open pages; they click Allow.

## Step 0 — check the machine

```bash
node -v          # need >= 20; if missing, suggest https://nodejs.org (LTS) or `brew install node`
git --version
```
Install the **latest signed release**, not whatever is on `main` (main can hold unreleased work
that still carries the previous version number; updaters only ever install signed releases):
```bash
git fetch --tags --quiet
LATEST=$(git tag -l 'v*' --sort=-v:refname | head -1)
git checkout --quiet "$LATEST" && echo "Installing $LATEST"
```
If there is no tag yet, stay on `main`. Then run `npm install` in the repo root, then
`npm test` — all tests must pass before deploying.

## Step 1 — the user's Canvas site

Ask which school / Canvas address they use (default: `umamherst.instructure.com`, UMass Amherst).
Ask them to open Canvas in a browser and read the host from the address bar if unsure.
Verify it is a Canvas API host — an unauthenticated call must return **401 with JSON**:

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://HOST/api/v1/users/self
```
If it redirects (3xx) to a login page or returns HTML, the host is probably the school's
portal, not Canvas — find the real Canvas host (often `<school>.instructure.com`).

Edit `config.mjs`: `CANVAS_HOST`, `SCHOOL_NAME` (shown on pages; may be empty), and
optionally `ACCENT_COLOR` (6-digit hex, e.g. the school color). Re-run `npm test`
(tests read the host from config).

## Step 2 — Cloudflare

The user needs a free Cloudflare account (https://dash.cloudflare.com/sign-up). Then:

```bash
npx wrangler login      # opens the browser; the USER clicks the blue Authorize button
npx wrangler whoami
```
- Tell the user BEFORE running it: a Cloudflare page opens (maybe in a background tab) and must be
  authorized within about 2 minutes. If it times out, have them close the old consent tabs (they
  no longer work) and run `npx wrangler login` again.
- If `whoami` lists several accounts, ask which one and add `"account_id": "<id>"` to `wrangler.jsonc`.
- First-time accounts must have a workers.dev subdomain. If deploy later complains about it,
  ask the user to open Cloudflare dashboard → Workers & Pages once (it offers to create one).

## Step 3 — storage and deploy

```bash
npx wrangler kv namespace create neuro-canvas-lms-oauth
```
The title only has to be unique in the account (if it already exists — e.g. a previous install —
pick another, like `neuro-canvas-lms-oauth-2`; never reuse another Worker's namespace). Ignore the
suggested binding name it prints; the binding stays `OAUTH_KV`. Copy the printed `id` into
`wrangler.jsonc` → `kv_namespaces[0].id`
(replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`). Optionally let the user rename `"name"`.

```bash
npm test && npx wrangler deploy
```
Note the `https://….workers.dev` URL. Check it:
```bash
curl -s -o /dev/null -w '%{http_code}\n' https://WORKER/mcp                       # expect 401
curl -s https://WORKER/.well-known/oauth-authorization-server | head -c 200        # expect JSON
```
Open `https://WORKER/` for the user — it should say it is waiting for its owner.

**Do Step 4 right away.** Until the first authorization, whoever authorizes first becomes
the owner. (To pin the owner instead, set `vars.OWNER_CANVAS_ID` — the numeric id is shown
at `https://HOST/api/v1/users/self` while logged in to Canvas in the browser.)

## Step 4 — the user creates a Canvas token (they do this, not you)

Tell them: Canvas → **Account → Settings → + New Access Token**. Purpose: e.g. `Claude`.
Many schools (UMass Amherst included) require an expiry date, **max 30 days** — pick the
latest allowed date. Copy the token immediately; Canvas shows it only once. You may open
`https://HOST/profile/settings` for them. Don't click Generate for them.

If they want to keep it, suggest a password manager or macOS Keychain — they paste it
into the prompt themselves:
```bash
security add-generic-password -U -a "$USER" -s "Canvas token" -w
```

## Step 5 — add the connector to their AI

**Claude (claude.ai / desktop / mobile):** Settings → Connectors → **Add custom connector** →
Name `Canvas`, URL `https://WORKER/mcp` → Add → **Connect**. The connector's page opens:
paste the token, tick the box, **Authorize**. Connectors added on claude.ai are also
available in Claude Code when signed in with the same account (check with `/mcp`).

**Claude Code only:** `claude mcp add --transport http canvas https://WORKER/mcp`, then `/mcp` → authenticate.

**ChatGPT:** Settings → Apps & Connectors → advanced/developer mode → create a connector
with the same URL (OAuth). ChatGPT menu names change often; follow what the UI shows.

Test in a **new chat**: "What assignments do I have due this week?" and
"Open the first lecture file in <course> and summarize it."

## Step 6 — choose how updates arrive

Ask the user, in their language, and explain both in one line each:

- **Auto-update (recommended):** new releases install by themselves 24 hours after they are
  published (an observation period), are health-checked, and are rolled back automatically if
  anything fails. Nothing to do, ever.
- **Reminders:** nothing changes on its own. When a release is out, the AI mentions it once and
  the connector's home page shows it; saying "update the Canvas connector" installs it (same
  checks and rollback).

Either way a small second Worker, the **updater**, is installed. It has no public URL; only its
timer and the connector can reach it. It installs only releases signed by the project
maintainer's key, so even a compromised GitHub account cannot push code to users. Users can
switch later by telling their AI "switch connector updates to automatic / reminders".

1. **The user creates a Cloudflare API token** (they do this, not you): open
   https://dash.cloudflare.com/profile/api-tokens → **Create Token** → **Create Custom Token** →
   Permissions: `Account` · `Workers Scripts` · `Edit` → Account Resources: their account →
   Create → copy it. Nothing else is needed; do not suggest broader templates.
2. Fill in `updater/wrangler.jsonc`: the connector's KV id (same as `OAUTH_KV`), the account id
   (`npx wrangler whoami`), `TARGET_SCRIPT` = the connector's Worker name (also in
   `services[0].service`), and `UPDATE_MODE` = `"auto"` or `"notify"`. Keep `CHANNEL` `"stable"`.
3. Deploy it and let the **user** store the token (they paste it into the prompt themselves;
   never ask for it, never pass it on the command line):
   ```bash
   npx wrangler deploy -c updater/wrangler.jsonc
   npx wrangler secret put CF_API_TOKEN -c updater/wrangler.jsonc
   ```
   In Claude Code the user can run the second line themselves with `! npx wrangler secret put …`.
4. Connect the connector to the updater: uncomment the `services` block for `UPDATER` in
   `wrangler.jsonc` and run `npx wrangler deploy` again.
5. Check: ask the AI (new chat) "what's the Canvas connector update status?" → it calls
   `connector_update` with `status` and reports the installed version and mode.

Skipping Step 6 is fine; the connector then only updates manually (see Updating).

## Renewing an expired token

Symptom: the AI reports "Canvas authorization expired; reconnect." Steps: make a new token
(Step 4), then in Claude Settings → Connectors → this connector → Disconnect → Connect, and
paste the new one. Nothing needs to be redeployed. Delete the old token in Canvas.

## Updating

With the updater installed (Step 6) there is nothing to do: "auto" installs new releases
itself; with "notify" the user just tells their AI "update the Canvas connector" and the
`connector_update` tool queues it (done within ~10 minutes, health-checked, rolled back on
failure). Ask the AI for the update `status` to see what happened.

Manual update (no updater, a new major version, or a release that needs new settings):
```bash
git fetch --tags && git checkout "$(git tag -l 'v*' --sort=-v:refname | head -1)"
npm install && npm test && npx wrangler deploy
```
`config.mjs` and `wrangler.jsonc` hold the user's values — keep them when merging. After tool
changes, start a new chat (some clients cache the tool list).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "bound to a different Canvas account" | Someone else authorized first, or the user changed accounts. Reset: `npx wrangler kv key delete --binding OAUTH_KV --remote owner:canvas_user_id`, then connect again. |
| "Only Claude, ChatGPT…" / unsupported app | The client's OAuth redirect isn't allowed. See `isAllowedRedirect` in `owner.mjs`. |
| Verification failed, HTTP 401 | Token wrong, incomplete or expired → new token. |
| HTTP 406 / HTML error pages from Canvas | Something in front of Canvas rejected the request. API calls already retry over a raw TLS socket automatically (`canvas-transport.mjs`). To debug, set `"vars": { "CANVAS_TRANSPORT": "fetch" }` or `"socket"` in `wrangler.jsonc`, redeploy, and watch `npx wrangler tail` — every API call logs `{ via, status, reason }` (no URLs or tokens). Remove the var afterwards. Also confirm `CANVAS_HOST` is the real Canvas host. |
| File download fails with HTTP 403 (`text/html`) while file metadata works | A firewall is rejecting the download's User-Agent. The Canvas host rejects a missing one; Instructure's file storage (`inst-fs-*.inscloudgate.net`) rejects any containing `UMassCanvas`. Keep `DOWNLOAD_UA` in `file-content.mjs` as shipped. The error message lists every redirect hop to show which host refused. |
| HTTP 403/404 on files or quizzes | Canvas course permissions; the instructor hid that page. Module-linked items may still work. |
| File "exceeds 15 MiB" | Worker memory limit. Have the user download the file and open it with Claude Code locally. |
| Handwritten/scanned PDF has no text | Expected. Use `canvas_file_original` (any file ID) or `canvas_module_file` (module items); the AI reads the PDF pages as images (ask for ~150 dpi for formulas). |
| AI says "denied access to this resource" | Canvas permission for that item (e.g. the instructor hid it). The token is fine; don't reconnect. |
| Deploy: workers.dev subdomain / account errors | See Step 2. |

## Logs

Persistent Workers Logs are on (`observability` in `wrangler.jsonc`), with automatic invocation logs
OFF so request headers are never stored. The Worker itself writes only: `{http: {path, method,
status}}` for /mcp and OAuth endpoints, `{mcp_method}` names, `{mcp_resource_read: ok|error}` and
`{canvas_transport: {via, status, reason}}`. View them in the Cloudflare dashboard → Workers → the
Worker → Logs, or live with `npx wrangler tail`.

## Uninstall

`npx wrangler delete` (removes the Worker), delete the KV namespace in the dashboard,
delete the token in Canvas, remove the connector in Claude/ChatGPT.
