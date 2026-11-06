# Neuro-CanvasLMS

[English](../README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · **日本語** · [हिन्दी](README.hi.md)

**あなたの Canvas LMS を、Claude と ChatGPT に直結。** コース、締め切り、成績、講義資料が、どのチャットでも、どのデバイスでも AI の知識になります。

> 「今週の締め切りは？」·「MATH 132 の第 5 回講義を要約して」·「HW 3 にどんなフィードバックがあった？」·「新しいお知らせはある？」

## Neuro-CanvasLMS が選ばれる理由

| | |
|---|---|
| ☁️ **あなたの PC では何も動かない** | クラウド上の Cloudflare Workers で動作。開きっぱなしのアプリも、ローカルサーバーも、ターミナルも不要です。 |
| 🔌 **どのデバイスも起動しておく必要なし** | ノート PC を閉じても、スマホをポケットにしまっても大丈夫。claude.ai、デスクトップ／モバイルアプリ、Claude Code、ChatGPT から 24 時間 Canvas にアクセスできます。 |
| 💸 **無料** | Cloudflare の無料プランで動き、学生一人には十分すぎる容量です。サーバー代もサブスクもなし。今使っている Claude / ChatGPT アカウントで使えます。 |
| 🧠 **ファイルは会話の中に残る** | AI が読んだ講義ノートや PDF は、その会話とともに AI プロバイダーのサーバーに保存されます。ダウンロード不要、ディスクも圧迫せず、次に開いたときもそこにあります。 |

Canvas と AI をつなぐツールの多くは *ローカル* ツールです。自分の PC が起動していてツールが動いている間しか使えず、デスクトップやコーディング用アプリの中でしか使えません。Neuro-CanvasLMS は **リモートコネクタ** です。

| | 一般的なローカルツール | **Neuro-CanvasLMS** |
|---|---|---|
| 動作場所 | あなたのノート PC | クラウド（あなた自身の Cloudflare アカウント） |
| PC の起動が必要 | はい | **いいえ** |
| スマホ / claude.ai Web で使える | いいえ | **はい** |
| ChatGPT で使える | いいえ（ChatGPT はリモートコネクタのみ対応） | **はい** |
| 費用 | 無料 | **無料** |

UMass Amherst の学生向けに作られ、UMass Amherst の Canvas で動作確認しています。Canvas を使っている他の学校でも、設定を 1 行変えるだけで動くはずです。

## 主な機能

- **59 個の読み取り専用ツール：** コース、モジュール、ページ、ファイル、課題、提出物、成績とフィードバック、ルーブリック、お知らせ、ディスカッション、受信トレイ、カレンダー、To Do、グループ、小テスト履歴、プロフィール。
- **ファイルを本当に読める：** PDF・Word・PowerPoint・Excel からテキストを抽出。スキャンや手書きのノートは元ファイルを渡し、AI が 1 ページずつ画像として読みます。
- **設計から読み取り専用：** 固定の `GET` リクエストのみ。課題の提出、メッセージ送信、小テストの開始、Canvas 上の変更は一切行いません。
- **あなた専用：** 自分でデプロイし、自分の Canvas アカウントに紐づきます。
- **AI がセットアップ：** このフォルダを Claude Code（または Codex）で開き、「Canvas コネクタをセットアップして」と言うだけ。

## 仕組み

```
Claude / ChatGPT ──OAuth──▶ あなたの Cloudflare 上の Neuro-CanvasLMS ──読み取り専用 API──▶ 学校の Canvas
 （どのデバイスでも）        （常時稼働。Canvas トークンを暗号化して保存）
```

## セットアップ（約 10 分・1 回だけ。AI に任せるのがおすすめ）

必要なもの：Canvas アカウント、無料の [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)、そして **セットアップ時だけ** [Node.js 20+](https://nodejs.org) と Claude Code（または Codex）が入った PC。セットアップ後はその PC の電源を切っても問題ありません。

```bash
git clone https://github.com/BloodyReginaa/Neuro-CanvasLMS.git
cd Neuro-CanvasLMS
claude
```

「**Canvas コネクタのセットアップを手伝って**」と伝えてください。[`SKILL.md`](../.claude/skills/canvas-connector-setup/SKILL.md) に沿って、環境確認・学校の設定・Cloudflare ログイン（「許可」はあなたがクリック）・デプロイ・接続まで案内します。Canvas トークンを聞かれることはありません。

<details><summary><b>手動セットアップ</b></summary>

1. `git checkout "$(git tag -l 'v*' --sort=-v:refname | head -1)"` (latest release), then `npm install && npm test`
2. `config.mjs` を編集：`CANVAS_HOST`（例 `umamherst.instructure.com`）、`SCHOOL_NAME`、`ACCENT_COLOR`。
3. `npx wrangler login`
4. `npx wrangler kv namespace create neuro-canvas-lms-oauth` → 表示された id を `wrangler.jsonc` に記入。
5. `npx wrangler deploy` → `https://neuro-canvas-lms.<あなた>.workers.dev` を控える。
6. すぐに接続する（最初に認可した Canvas アカウントが所有者になります）。
</details>

## 接続する

1. **Canvas トークンを作成：** Canvas → アカウント → 設定 → **+ 新しいアクセストークン**。UMass Amherst では最長 **30 日**。表示は一度きりなのですぐコピー。
2. **Claude：** 設定 → コネクタ → **カスタムコネクタを追加** → URL `https://…workers.dev/mcp` → 接続 → 開いたページにトークンを貼り付けて認可。同じアカウントなら、モバイルアプリや Claude Code でも使えます。
3. **ChatGPT：** 開発者モードで同じ URL のカスタムコネクタを追加。
4. 新しいチャットで「今週の課題は？」と聞いてみてください。

**トークンの期限が切れたら：** 新しいトークンを作り、コネクタを切断 → 再接続して貼り付けるだけ。再デプロイは不要です。

## 更新

セットアップ時に新バージョンの受け取り方を選びます：

- **自動更新（おすすめ）：** 公開から 24 時間後に自動でインストールされ、動作確認を行い、問題があれば自動で元に戻します。
- **お知らせ：** 新バージョンが出ると AI が一度だけ知らせます。「Canvas コネクタを更新して」と言えばインストールされます（同じ確認とロールバック付き）。

あなたの Cloudflare アカウント内の小さな Worker（アップデーター）が行います。公開 URL はなく、メンテナーの鍵で署名されたリリースだけをインストールします。ストレージ・設定・接続はそのまま残り、再接続は不要です。

## プライバシーとセキュリティ

- トークンはあなたの Worker と学校の Canvas にのみ送られ、Cloudflare KV 内に暗号化して保存されます。作者を含め誰も見られません。
- コネクタは最初に認可した Canvas アカウントに紐づき、他のアカウントは拒否します。
- OAuth を完了できるのは Claude・ChatGPT・ローカルクライアントのみです。
- コース内容は信頼できないデータとして扱い、指示としては実行しません。
- ダウンロードは上限 15 MiB・HTTPS のみ・プライベートネットワーク遮断。
- Canvas の権限はそのまま適用され、もともと見られる内容しか読めません。
- AI が読んだファイルは、会話の一部として AI プロバイダーがそのプライバシー規約に従って保存します。チャットを削除すれば消えます。

利用前に、個人アクセストークンや外部ツールに関する学校の規定を確認してください。

## 制限

- 15 MiB を超えるファイルはコネクタ経由では読めません（Cloudflare Worker のメモリ制限）。ダウンロードしてローカルの Claude Code で開いてください。
- Gradescope・WebAssign・外部サイト・ロックされた内容・New Quizzes の内部データは対象外です。
- ファイル／小テストのページを非表示にしているコースもあります（403/404）。モジュールからのリンクは通常読めます。

## 開発

`npm test` · `npm run check` · `npx wrangler deploy`。UI テキストは `i18n.mjs` にあります。コード構成は [`AGENTS.md`](../AGENTS.md) を参照。

AI コーディングアシスタントの協力で開発。MIT ライセンス。
