# Canvas AI コネクタ

[English](../README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · **日本語** · [हिन्दी](README.hi.md)

**Claude**（Web・デスクトップ・モバイル・Claude Code）や **ChatGPT** から、あなたの Canvas を読めるようにします。コーディングツールだけでなく、普段のチャットで使えます。

> 「今週の締め切りは？」·「MATH 132 の第 5 回講義を要約して」·「HW 3 にどんなフィードバックがあった？」·「新しいお知らせはある？」

UMass Amherst の学生向けに作られ、UMass Amherst の Canvas で動作確認しています。Canvas を使っている他の学校でも、設定を 1 行変えるだけで動くはずです。

- **読み取り専用。** 58 個のツールはすべて固定の `GET` リクエスト。提出・送信・変更は一切しません。
- **あなた専用。** あなた自身の無料 Cloudflare アカウントで動き、あなたの Canvas アカウントに紐づきます。
- **実際のファイルを読める。** PDF・Word・PowerPoint・Excel、手書きやスキャンの講義ノートも（AI がページを画像として読みます）。
- **AI がセットアップ。** このフォルダを Claude Code（または Codex）で開き、「Canvas コネクタをセットアップして」と言うだけ。

## 仕組み

```
Claude / ChatGPT  ──OAuth──▶  あなたの Cloudflare Worker  ──読み取り専用 API──▶  学校の Canvas
                               （このリポジトリ。Canvas トークンを暗号化して保存）
```

## セットアップ（約 10 分。AI に任せるのがおすすめ）

必要なもの：Canvas アカウント、無料の [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)、[Node.js 20+](https://nodejs.org)、Claude Code（または Codex）。

```bash
git clone https://github.com/BloodyReginaa/canvas-ai-connector.git
cd canvas-ai-connector
claude
```

「**Canvas コネクタのセットアップを手伝って**」と伝えてください。[`SKILL.md`](../.claude/skills/canvas-connector-setup/SKILL.md) に沿って、環境確認・学校の設定・Cloudflare ログイン（「許可」はあなたがクリック）・デプロイ・接続まで案内します。Canvas トークンを聞かれることはありません。

<details><summary><b>手動セットアップ</b></summary>

1. `npm install && npm test`
2. `config.mjs` を編集：`CANVAS_HOST`（例 `umamherst.instructure.com`）、`SCHOOL_NAME`、`ACCENT_COLOR`。
3. `npx wrangler login`
4. `npx wrangler kv namespace create OAUTH_KV` → 表示された id を `wrangler.jsonc` に記入。
5. `npx wrangler deploy` → `https://canvas-ai-connector.<あなた>.workers.dev` を控える。
6. すぐに接続する（最初に認可した Canvas アカウントが所有者になります）。
</details>

## 接続する

1. **Canvas トークンを作成：** Canvas → アカウント → 設定 → **+ 新しいアクセストークン**。UMass Amherst では最長 **30 日**。表示は一度きりなのですぐコピー。
2. **Claude：** 設定 → コネクタ → **カスタムコネクタを追加** → URL `https://…workers.dev/mcp` → 接続 → 開いたページにトークンを貼り付けて認可。
3. **ChatGPT：** 開発者モードで同じ URL のカスタムコネクタを追加。
4. 新しいチャットで「今週の課題は？」と聞いてみてください。

**トークンの期限が切れたら：** 新しいトークンを作り、コネクタを切断 → 再接続して貼り付けるだけ。再デプロイは不要です。

## プライバシーとセキュリティ

- トークンはあなたの Worker と学校の Canvas にのみ送られ、Cloudflare KV 内に暗号化して保存されます。作者を含め誰も見られません。
- Worker は最初に認可した Canvas アカウントに紐づき、他のアカウントは拒否します。
- OAuth を完了できるのは Claude・ChatGPT・ローカルクライアントのみです。
- コース内容は信頼できないデータとして扱い、指示としては実行しません。
- ダウンロードはサイズ制限（15 MiB）・HTTPS のみ・プライベートネットワーク遮断。
- Canvas の権限はそのまま適用され、もともと見られる内容しか読めません。

利用前に、個人アクセストークンや外部ツールに関する学校の規定を確認してください。

## 制限

- 15 MiB を超えるファイルはコネクタ経由では読めません。ダウンロードしてローカルの Claude Code で開いてください。
- Gradescope・WebAssign・外部サイト・ロックされた内容・New Quizzes の内部データは対象外です。
- ファイル／小テストのページを非表示にしているコースもあります（403/404）。モジュールからのリンクは通常読めます。

## 開発

`npm test` · `npm run check` · `npx wrangler deploy`。UI テキストは `i18n.mjs` にあります。コード構成は [`AGENTS.md`](../AGENTS.md) を参照。

AI コーディングアシスタントの協力で開発。MIT ライセンス。
