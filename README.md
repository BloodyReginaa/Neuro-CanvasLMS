# Neuro-CanvasLMS

**English** · [简体中文](docs/README.zh-CN.md) · [Español](docs/README.es.md) · [日本語](docs/README.ja.md) · [हिन्दी](docs/README.hi.md)

**Wire your Canvas LMS straight into Claude and ChatGPT.** Your courses, deadlines, grades and
lecture files are now part of what your AI knows, in any chat and on any device.

> "What's due this week?" · "Summarize Lecture 5 in MATH 132." · "What feedback did I get on HW 3?" · "Any new announcements?"

## Why Neuro-CanvasLMS

| | |
|---|---|
| ☁️ **Nothing runs on your computer** | It lives in the cloud on Cloudflare Workers. No app to keep open, no local server, no terminal window. |
| 🔌 **No device has to stay on** | Close the laptop and leave the phone in your pocket. Your AI can still reach Canvas 24/7, from claude.ai, the desktop and mobile apps, Claude Code or ChatGPT. |
| 💸 **Free** | It runs on Cloudflare's free plan, which is far more than one student needs. No server bill, no subscription. You use the Claude or ChatGPT account you already have. |
| 🧠 **Your files live in the conversation** | Lecture notes and PDFs the AI reads stay with that chat on your AI provider's servers. Nothing to download, nothing filling your disk, still there when you come back. |

Most Canvas integrations for AI are *local* tools. They only work while your own computer is
on and running them, and only inside desktop or coding apps. Neuro-CanvasLMS is a
**remote connector**:

| | Typical local Canvas tool | **Neuro-CanvasLMS** |
|---|---|---|
| Runs on | your laptop | the cloud (your own Cloudflare account) |
| Laptop must be on | yes | **no** |
| Works on phone / claude.ai web | no | **yes** |
| Works in ChatGPT | no (ChatGPT only takes remote connectors) | **yes** |
| Cost | free | **free** |

Written for UMass Amherst students and tested on UMass Amherst Canvas. It should work at any
school that uses Canvas; you change one line.

## What you get

- **59 read-only tools:** courses, modules, pages, files, assignments, submissions, grades and
  feedback, rubrics, announcements, discussions, inbox, calendar, to-dos, groups, quiz
  history and profile settings.
- **Real file reading:** text from PDF, Word, PowerPoint and Excel, plus the original file
  for scanned or handwritten notes so the AI can look at each page.
- **Read-only by design:** only fixed `GET` requests. It never submits work, sends messages,
  starts quizzes or changes anything in Canvas.
- **Yours only:** your own deployment, locked to your own Canvas account.
- **Set up by AI:** open this folder in Claude Code (or Codex) and say *"set up the Canvas connector"*.

## How it works

```
Claude / ChatGPT ──OAuth──▶ Neuro-CanvasLMS on your Cloudflare ──read-only API──▶ your school's Canvas
  (any device)                (always on, stores your Canvas token encrypted)
```

## Setup (≈10 minutes, one time; recommended: let the AI do it)

You need a Canvas account, a free [Cloudflare account](https://dash.cloudflare.com/sign-up),
and, for the one-time setup only, a computer with [Node.js 20+](https://nodejs.org) and
Claude Code (or Codex). After setup, that computer can stay off forever.

```bash
git clone https://github.com/BloodyReginaa/Neuro-CanvasLMS.git
cd Neuro-CanvasLMS
claude
```

Then say: **"Help me set up the Canvas connector."** It follows
[`SKILL.md`](.claude/skills/canvas-connector-setup/SKILL.md): it checks your machine, sets your
school, logs in to Cloudflare (you click Allow), deploys, and walks you through connecting.
It never asks for your Canvas token.

<details><summary><b>Manual setup</b></summary>

1. `git checkout "$(git tag -l 'v*' --sort=-v:refname | head -1)"` (latest release), then `npm install && npm test`
2. Edit `config.mjs`: `CANVAS_HOST` (e.g. `umamherst.instructure.com`), `SCHOOL_NAME`, `ACCENT_COLOR`.
3. `npx wrangler login`
4. `npx wrangler kv namespace create neuro-canvas-lms-oauth`, then put the id into `wrangler.jsonc`.
5. `npx wrangler deploy` and note `https://neuro-canvas-lms.<you>.workers.dev`.
6. Connect right away. The first Canvas account to authorize becomes the owner.
</details>

## Connect it

1. **Create a Canvas token:** Canvas → Account → Settings → **+ New Access Token**. At UMass
   Amherst the maximum lifetime is **30 days**. Copy it right away; Canvas shows it only once.
2. **Claude:** Settings → Connectors → **Add custom connector** → URL `https://…workers.dev/mcp`
   → Connect → paste the token on the page that opens → Authorize. It works everywhere you
   use Claude, including the mobile app and Claude Code (same account).
3. **ChatGPT:** add a custom connector (developer mode) with the same URL.
4. Start a new chat and ask *"What assignments do I have this week?"*

**When the token expires:** make a new one, then Disconnect → Connect the connector and
paste it. No redeploy needed.

## Updates

During setup you choose how new versions arrive:

- **Auto-update (recommended):** a release installs itself 24 hours after it is published, is
  health-checked, and is rolled back automatically if anything fails.
- **Reminders:** your AI mentions a new version once; say *"update the Canvas connector"* to
  install it (same checks and rollback).

A small second Worker, the updater, does this inside your own Cloudflare account. It has no
public URL and installs only releases signed by the maintainer's key, so not even a compromised
GitHub account can push code to your connector. Storage, settings and your connection are kept
across updates; you never reconnect. Change your choice any time by asking your AI.

## Privacy & security

- Your token goes only to your Worker and your school's Canvas. It is stored encrypted inside
  the OAuth grant in your Cloudflare KV. Nobody else, including the authors, can see it.
- The connector binds to the first Canvas account that authorizes it and refuses all others.
- Only Claude, ChatGPT and local (loopback) clients can complete OAuth.
- Course content is treated as untrusted data, never as instructions.
- File downloads are capped at 15 MiB, HTTPS-only, and blocked from reaching private networks.
- Canvas still enforces your own permissions. You can only read what you can already see.
- Files the AI reads are kept by your AI provider as part of the conversation, under that
  provider's own privacy terms. Delete the chat to remove them.

Check your school's policy on personal access tokens and third-party tools before use.

## Limits

- The connector can't read files over 15 MiB (Cloudflare Worker memory limit). Download
  those and open them with Claude Code locally.
- Gradescope, WebAssign, external sites, locked content and the internals of New Quizzes are
  out of reach.
- Some courses hide their Files or Quizzes pages (403/404). Items linked from Modules usually
  still work.

## Development

`npm test` (Node's built-in test runner) · `npm run check` (dry-run build) · `npx wrangler deploy`.
UI text lives in `i18n.mjs` (English, 简体中文, Español, 日本語, हिन्दी); PRs adding languages are welcome.
See [`AGENTS.md`](AGENTS.md) for a code map.

Built with the help of AI coding assistants. MIT licensed.
