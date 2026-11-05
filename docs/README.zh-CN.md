# Canvas AI 连接器

[English](../README.md) · **简体中文** · [Español](README.es.md) · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

让 **Claude**（网页版、桌面版、手机版、Claude Code）或 **ChatGPT** 读取你的 Canvas——在普通聊天里就能用，不只是编程工具。

> "这周有什么作业要交？" · "总结一下 MATH 132 的 Lecture 5。" · "HW 3 老师给了什么评语？" · "有新公告吗？"

为 UMass Amherst 的同学编写，并在 UMass Amherst 的 Canvas 上测试过。其他使用 Canvas 的学校应该也能用——只需改一行配置。

- **只读。** 58 个工具，全部是固定的 `GET` 请求。不会提交作业、发消息或修改任何内容。
- **只属于你。** 运行在你自己的免费 Cloudflare 账号上，并自动锁定到你的 Canvas 账号。
- **能读真实文件。** PDF、Word、PPT、Excel，包括手写或扫描的讲义（AI 会把页面当图片来看）。
- **AI 帮你装。** 用 Claude Code（或 Codex）打开这个文件夹，说一句"帮我配置 Canvas 连接器"。

## 原理

```
Claude / ChatGPT  ──OAuth──▶  你的 Cloudflare Worker  ──只读 API──▶  你学校的 Canvas
                               （本项目，加密保存你的 Canvas 令牌）
```

Worker 只需部署一次。Claude 或 ChatGPT 把它当作"自定义连接器"连接。第一次连接时，Worker 自己的页面会让你填入一个你自己生成的 Canvas 访问令牌。

## 安装（约 10 分钟，推荐让 AI 来做）

你需要：Canvas 账号、免费的 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)、[Node.js 20+](https://nodejs.org)，以及 Claude Code（或 Codex）。

```bash
git clone https://github.com/BloodyReginaa/canvas-ai-connector.git
cd canvas-ai-connector
claude
```

然后说：**"帮我配置 Canvas 连接器。"** 它会按照 [`SKILL.md`](../.claude/skills/canvas-connector-setup/SKILL.md) 一步步来：检查环境、设置学校、登录 Cloudflare（你点"允许"）、部署，再带你完成连接。它**不会**向你索要 Canvas 令牌。

<details><summary><b>手动安装</b></summary>

1. `npm install && npm test`
2. 编辑 `config.mjs`：`CANVAS_HOST`（如 `umamherst.instructure.com`）、`SCHOOL_NAME`、`ACCENT_COLOR`。
3. `npx wrangler login`
4. `npx wrangler kv namespace create OAUTH_KV`，把输出的 id 填进 `wrangler.jsonc`。
5. `npx wrangler deploy`，记下 `https://canvas-ai-connector.<你>.workers.dev`。
6. 立刻完成连接（第一个授权的 Canvas 账号会成为所有者）。
</details>

## 连接

1. **生成 Canvas 令牌：** Canvas → 账户 → 设置 → **+ 新建访问许可证**。UMass Amherst 最长 **30 天**有效。立刻复制——Canvas 只显示一次。
2. **Claude：** 设置 → 连接器 → **添加自定义连接器** → URL 填 `https://…workers.dev/mcp` → 连接 → 在打开的页面粘贴令牌 → 授权。用同一账号登录 Claude Code 时也能直接使用。
3. **ChatGPT：** 在开发者模式中用同一个 URL 添加自定义连接器。
4. 新开一个对话，问："我这周有哪些作业？"

**令牌过期后：** 生成一个新令牌，在连接器里"断开 → 重新连接"并粘贴即可，不需要重新部署。

## 隐私与安全

- 令牌只会发送到你的 Worker 和学校的 Canvas，并加密保存在你 Cloudflare KV 的授权记录里。任何其他人（包括作者）都看不到。
- Worker 会绑定第一个完成授权的 Canvas 账号，其他账号一律拒绝。
- 只有 Claude、ChatGPT 和本地客户端可以完成 OAuth 授权。
- 课程内容一律视为不可信数据，不会被当作指令执行。
- 文件下载有大小限制（15 MiB），仅限 HTTPS，并禁止访问内网地址。
- Canvas 依然执行你本人的权限——你只能读到自己本来就能看到的内容。

使用前请确认你所在学校关于个人访问令牌和第三方工具的规定。

## 限制

- 超过 15 MiB 的文件无法通过连接器读取（受 Cloudflare Worker 内存限制）。请下载后用本地的 Claude Code 打开。
- Gradescope、WebAssign、外部网站、锁定内容和 New Quizzes 内部数据无法读取。
- 有些课程隐藏了"文件/测验"页面（403/404），但从"模块"里链接的内容通常仍可读取。

## 开发

`npm test`（Node 自带测试）· `npm run check`（试构建）· `npx wrangler deploy`。
界面文字在 `i18n.mjs`（English、简体中文、Español、日本語、हिन्दी），欢迎提交更多语言。代码结构见 [`AGENTS.md`](../AGENTS.md)。

在 AI 编程助手的帮助下开发。MIT 许可证。
