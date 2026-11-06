# Neuro-CanvasLMS

[English](../README.md) · **简体中文** · [Español](README.es.md) · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

**把你的 Canvas 直接接进 Claude 和 ChatGPT。** 课程、截止日期、成绩、讲义，从此都在 AI 的掌握之中——任何对话、任何设备都能用。

> "这周有什么要交？" · "总结一下 MATH 132 的 Lecture 5。" · "HW 3 老师给了什么评语？" · "有新公告吗？"

## 为什么选 Neuro-CanvasLMS

| | |
|---|---|
| ☁️ **不用在本地运行** | 跑在云端的 Cloudflare Workers 上。不用开着任何程序，没有本地服务器，也不用留着终端窗口。 |
| 🔌 **不需要任何设备一直开着** | 合上电脑、手机揣兜里都没关系，AI 随时都能连上 Canvas，在 claude.ai 网页、桌面版、手机 App、Claude Code、ChatGPT 里都能用。 |
| 💸 **免费** | 用的是 Cloudflare 免费套餐，个人用远远用不完。没有服务器账单，没有订阅费，用你现有的 Claude 或 ChatGPT 账号就行。 |
| 🧠 **文件留在对话里** | AI 读过的讲义和 PDF 会随对话保存在 AI 服务商的服务器上。不用下载，不占你的硬盘，下次打开对话还在。 |

市面上大多数 Canvas + AI 的工具都是**本地工具**：只有你自己的电脑开着、程序在跑的时候才能用，而且只能在桌面版或编程工具里用。Neuro-CanvasLMS 是一个**远程连接器**：

| | 常见的本地 Canvas 工具 | **Neuro-CanvasLMS** |
|---|---|---|
| 运行在 | 你的电脑上 | 云端（你自己的 Cloudflare 账号） |
| 电脑必须开着 | 是 | **否** |
| 手机 / claude.ai 网页能用 | 否 | **能** |
| ChatGPT 能用 | 否（ChatGPT 只支持远程连接器） | **能** |
| 费用 | 免费 | **免费** |

为 UMass Amherst 的同学编写，并在 UMass Amherst 的 Canvas 上测试过。其他使用 Canvas 的学校应该也能用——只需改一行配置。

## 功能

- **59 个只读工具：** 课程、模块、页面、文件、作业、提交记录、成绩与评语、评分标准、公告、讨论区、站内信、日历、待办、小组、测验记录、个人设置。
- **真正能读文件：** 提取 PDF、Word、PPT、Excel 的文字；手写或扫描的讲义会提供原始文件，让 AI 逐页看图。
- **设计上就是只读：** 全部是固定的 `GET` 请求。不会提交作业、发消息、开始测验，也不会修改 Canvas 中的任何内容。
- **只属于你：** 你自己部署，锁定你自己的 Canvas 账号。
- **AI 帮你装：** 用 Claude Code（或 Codex）打开这个文件夹，说一句"帮我配置 Canvas 连接器"。

## 原理

```
Claude / ChatGPT ──OAuth──▶ 你 Cloudflare 上的 Neuro-CanvasLMS ──只读 API──▶ 你学校的 Canvas
  （任何设备）                （始终在线，加密保存你的 Canvas 令牌）
```

## 安装（约 10 分钟，只需一次；推荐让 AI 来做）

你需要：Canvas 账号、免费的 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)；以及**只在安装时**需要一台装有 [Node.js 20+](https://nodejs.org) 和 Claude Code（或 Codex）的电脑。装好以后，这台电脑关机也不影响使用。

```bash
git clone https://github.com/BloodyReginaa/Neuro-CanvasLMS.git
cd Neuro-CanvasLMS
claude
```

然后说：**"帮我配置 Canvas 连接器。"** 它会按照 [`SKILL.md`](../.claude/skills/canvas-connector-setup/SKILL.md) 一步步来：检查环境、设置学校、登录 Cloudflare（你点"允许"）、部署，再带你完成连接。它**不会**向你索要 Canvas 令牌。

<details><summary><b>手动安装</b></summary>

1. `git checkout "$(git tag -l 'v*' --sort=-v:refname | head -1)"` (latest release), then `npm install && npm test`
2. 编辑 `config.mjs`：`CANVAS_HOST`（如 `umamherst.instructure.com`）、`SCHOOL_NAME`、`ACCENT_COLOR`。
3. `npx wrangler login`
4. `npx wrangler kv namespace create OAUTH_KV`，把输出的 id 填进 `wrangler.jsonc`。
5. `npx wrangler deploy`，记下 `https://neuro-canvas-lms.<你>.workers.dev`。
6. 立刻完成连接（第一个授权的 Canvas 账号会成为所有者）。
</details>

## 连接

1. **生成 Canvas 令牌：** Canvas → 账户 → 设置 → **+ 新建访问许可证**。UMass Amherst 最长 **30 天**有效。立刻复制——Canvas 只显示一次。
2. **Claude：** 设置 → 连接器 → **添加自定义连接器** → URL 填 `https://…workers.dev/mcp` → 连接 → 在打开的页面粘贴令牌 → 授权。只要是同一个账号，手机 App 和 Claude Code 里也都能用。
3. **ChatGPT：** 在开发者模式中用同一个 URL 添加自定义连接器。
4. 新开一个对话，问："我这周有哪些作业？"

**令牌过期后：** 生成一个新令牌，在连接器里"断开 → 重新连接"并粘贴即可，不需要重新部署。

## 更新

安装时选择新版本怎么到达：

- **自动更新（推荐）：** 新版本发布 24 小时后自动安装，装完自动自检，有任何问题自动回滚。
- **自动提醒：** 有新版本时 AI 会提一句；你说"更新 Canvas 连接器"就会安装（同样有自检和回滚）。

这件事由你 Cloudflare 账号里的一个小 Worker（更新器）完成。它没有公开网址，只安装用维护者密钥签名过的版本，所以即使 GitHub 账号被盗，也没人能把代码推到你的连接器上。更新前后存储、设置和连接都会保留，不需要重新连接。之后想换方式，直接跟 AI 说就行。

## 隐私与安全

- 令牌只会发送到你的 Worker 和学校的 Canvas，并加密保存在你 Cloudflare KV 的授权记录里。任何其他人（包括作者）都看不到。
- 连接器会绑定第一个完成授权的 Canvas 账号，其他账号一律拒绝。
- 只有 Claude、ChatGPT 和本地客户端可以完成 OAuth 授权。
- 课程内容一律视为不可信数据，不会被当作指令执行。
- 文件下载上限 15 MiB，仅限 HTTPS，并禁止访问内网地址。
- Canvas 依然执行你本人的权限——你只能读到自己本来就能看到的内容。
- AI 读过的文件由 AI 服务商作为对话的一部分保存，适用该服务商自己的隐私条款；删除对话即可删除。

使用前请确认你所在学校关于个人访问令牌和第三方工具的规定。

## 限制

- 超过 15 MiB 的文件无法通过连接器读取（受 Cloudflare Worker 内存限制）。请下载后用本地的 Claude Code 打开。
- Gradescope、WebAssign、外部网站、锁定内容和 New Quizzes 内部数据无法读取。
- 有些课程隐藏了"文件/测验"页面（403/404），但从"模块"里链接的内容通常仍可读取。

## 开发

`npm test`（Node 自带测试）· `npm run check`（试构建）· `npx wrangler deploy`。
界面文字在 `i18n.mjs`（English、简体中文、Español、日本語、हिन्दी），欢迎提交更多语言。代码结构见 [`AGENTS.md`](../AGENTS.md)。

在 AI 编程助手的帮助下开发。MIT 许可证。
