# Canvas AI Connector

**English** · [简体中文](docs/README.zh-CN.md) · [Español](docs/README.es.md) · [日本語](docs/README.ja.md) · [हिन्दी](docs/README.hi.md)

Let **Claude** (web, desktop, mobile, Claude Code) or **ChatGPT** read your Canvas — in a
normal chat, not just in a coding tool.

> "What's due this week?" · "Summarize Lecture 5 in MATH 132." · "What feedback did I get on HW 3?" · "Any new announcements?"

Written for UMass Amherst students and tested on UMass Amherst Canvas. It should work with
any school that uses Canvas — you only change one line.

- **Read-only.** 58 tools, all fixed `GET` requests. It never submits work, sends messages or changes anything.
- **Yours only.** It runs on your own free Cloudflare account and locks itself to your Canvas account.
- **Reads real files.** PDFs, Word, PowerPoint, Excel — including handwritten/scanned lecture notes (the AI views the pages as images).
- **Set up by AI.** Open this folder in Claude Code (or Codex) and say *"set up the Canvas connector"*.

## How it works

```
Claude / ChatGPT  ──OAuth──▶  your Cloudflare Worker  ──read-only API──▶  your school's Canvas
                               (this repo, stores your Canvas token encrypted)
```

You deploy the Worker once. Claude or ChatGPT connects to it as a *custom connector*. The
first time, the Worker's own page asks for a Canvas access token you create yourself.

## Setup (≈10 minutes, recommended: let the AI do it)

You need: a Canvas account, a free [Cloudflare account](https://dash.cloudflare.com/sign-up),
[Node.js 20+](https://nodejs.org), and Claude Code (or Codex).

```bash
git clone https://github.com/BloodyReginaa/canvas-ai-connector.git
cd canvas-ai-connector
claude
```

Then say: **"Help me set up the Canvas connector."** It follows
[`.claude/skills/canvas-connector-setup/SKILL.md`](.claude/skills/canvas-connector-setup/SKILL.md):
checks your machine, sets your school, logs in to Cloudflare (you click Allow), deploys, and
walks you through connecting. It will never ask for your Canvas token.

<details><summary><b>Manual setup</b></summary>

1. `npm install && npm test`
2. Edit `config.mjs` — `CANVAS_HOST` (e.g. `umamherst.instructure.com`), `SCHOOL_NAME`, `ACCENT_COLOR`.
3. `npx wrangler login`
4. `npx wrangler kv namespace create OAUTH_KV` → put the id into `wrangler.jsonc`.
5. `npx wrangler deploy` → note `https://canvas-ai-connector.<you>.workers.dev`.
6. Connect right away (the first Canvas account to authorize becomes the owner).
</details>

## Connect it

1. **Create a Canvas token:** Canvas → Account → Settings → **+ New Access Token**. At UMass
   Amherst the maximum lifetime is **30 days**. Copy it — Canvas shows it only once.
2. **Claude:** Settings → Connectors → **Add custom connector** → URL `https://…workers.dev/mcp`
   → Connect → paste the token on the page that opens → Authorize.
   It also appears in Claude Code when you're signed in with the same account.
3. **ChatGPT:** add a custom connector (developer mode) with the same URL.
4. Start a new chat and ask *"What assignments do I have this week?"*

**When the token expires:** make a new one, then Disconnect → Connect the connector and
paste it. No redeploy needed.

## Privacy & security

- Your token goes only to your Worker and your school's Canvas; it's stored encrypted inside
  the OAuth grant in your Cloudflare KV. Nobody else (including the authors) can see it.
- The Worker binds to the first Canvas account that authorizes it; other accounts are refused.
- Only Claude, ChatGPT and local (loopback) clients may complete OAuth.
- Course content is treated as untrusted data, never as instructions.
- File downloads are size-limited (15 MiB), HTTPS-only and blocked from private networks.
- Canvas still enforces your own permissions — you can only read what you can already see.

Check your school's policy on personal access tokens and third-party tools before use.

## Limits

- Files over 15 MiB can't be read through the connector (Cloudflare Worker memory). Download
  them and open them with Claude Code locally.
- Gradescope, WebAssign, external sites, locked content and New Quizzes internals are out of reach.
- Some courses hide Files/Quizzes pages (403/404); items linked from Modules usually still work.

## Development

`npm test` (Node's built-in test runner) · `npm run check` (dry-run build) · `npx wrangler deploy`.
UI text lives in `i18n.mjs` (English, 简体中文, Español, 日本語, हिन्दी) — PRs for more languages welcome.
See [`AGENTS.md`](AGENTS.md) for a code map.

Built with the help of AI coding assistants. MIT licensed.
