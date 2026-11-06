// Installer text. {placeholders} are filled by msg().
const M = {
  en: {
    title: 'Neuro-CanvasLMS installer — connect your Canvas to Claude or ChatGPT',
    node_old:
      'Node.js {need} or newer is required (you have {have}). Install it from https://nodejs.org and run this again.',
    login_needed:
      'Step 1/4 · Sign in to Cloudflare (free account: https://dash.cloudflare.com/sign-up).\n  A Cloudflare page opens in your browser — maybe in a background tab. Click the blue "Authorize" button within 2 minutes.',
    login_retry:
      'Sign-in did not complete. Close the old Cloudflare tabs; a new page is opening now.',
    login_failed: 'Could not sign in to Cloudflare. Run this command again when you are ready.',
    logged_in: 'Signed in to Cloudflare as {email}.',
    pick_account: 'Which Cloudflare account should host the connector?',
    canvas_q:
      "Step 2/4 · Your school's Canvas address (open Canvas in a browser and paste the address bar, e.g. canvas.example.edu):",
    canvas_bad:
      'That does not look like a Canvas site ({detail}). Paste the address of the page where you log in to Canvas.',
    canvas_ok: 'Canvas found at {host}.',
    school_q: "Your school's name, shown on the connector's pages (optional, press Enter to skip):",
    kv: "Creating the connector's storage…",
    kv_reuse: 'Reusing the existing storage.',
    deploy: 'Step 3/4 · Deploying the connector (version {version})…',
    deploy_ok: 'Connector is live: {url}',
    check: 'Step 4/4 · Checking the connector…',
    check_ok: 'Everything works (version {version}).',
    check_bad: 'The connector did not pass its check: {detail}',
    done: 'Done! Last step, in your AI:',
    done_1:
      '1. Create a Canvas access token: {canvas}/profile/settings → "+ New Access Token" (copy it; Canvas shows it once).',
    done_2:
      '2. Claude: Settings → Connectors → "Add custom connector" → paste this URL (already copied):',
    done_3: '3. Click "Connect", paste the Canvas token on the page that opens, and authorize.',
    done_gpt: '   ChatGPT: add a custom connector (developer mode) with the same URL.',
    done_update:
      'To update later, run the same command again: it keeps your storage and connections.',
    rerun:
      'Found your existing install "{name}". This updates it to the code you are running now and keeps your settings and connections.',
    un_confirm:
      'This deletes the connector "{name}" and its storage. Your AI apps will lose the connection. Type the name to confirm:',
    un_done:
      'Removed. Also delete the Canvas token (Canvas → Account → Settings) and the connector in your AI app.',
    cancelled: 'Cancelled.',
    failed:
      'Something went wrong: {detail}\n  Nothing is lost: run the same command again to continue.',
  },
  zh: {
    title: 'Neuro-CanvasLMS 安装向导：把你的 Canvas 接进 Claude 或 ChatGPT',
    node_old:
      '需要 Node.js {need} 或更新的版本（你现在是 {have}）。请到 https://nodejs.org 安装后再运行一次。',
    login_needed:
      '第 1/4 步 · 登录 Cloudflare（没有账号可以免费注册：https://dash.cloudflare.com/sign-up）。\n  浏览器会打开一个 Cloudflare 页面（可能在后台标签页里），请在 2 分钟内点蓝色的 "Authorize" 按钮。',
    login_retry: '没有完成登录。请关掉旧的 Cloudflare 标签页，现在重新打开一个。',
    login_failed: '没能登录 Cloudflare。准备好之后再运行一次这条命令。',
    logged_in: '已登录 Cloudflare：{email}',
    pick_account: '把连接器装在哪个 Cloudflare 账号里？',
    canvas_q:
      '第 2/4 步 · 你学校 Canvas 的网址（在浏览器打开 Canvas，把地址栏粘贴过来，比如 canvas.example.edu）：',
    canvas_bad: '这看起来不是 Canvas 网站（{detail}）。请粘贴你登录 Canvas 那个页面的网址。',
    canvas_ok: '找到 Canvas：{host}',
    school_q: '学校名称，会显示在连接器页面上（可选，直接回车跳过）：',
    kv: '创建连接器的存储…',
    kv_reuse: '沿用已有的存储。',
    deploy: '第 3/4 步 · 部署连接器（版本 {version}）…',
    deploy_ok: '连接器已上线：{url}',
    check: '第 4/4 步 · 检查连接器…',
    check_ok: '一切正常（版本 {version}）。',
    check_bad: '连接器没通过检查：{detail}',
    done: '装好了！最后一步，在你的 AI 里：',
    done_1:
      '1. 生成 Canvas 访问令牌：{canvas}/profile/settings →「+ 新建访问许可证」（立刻复制，Canvas 只显示一次）。',
    done_2: '2. Claude：设置 → 连接器 →「添加自定义连接器」→ 粘贴这个网址（已经复制好了）：',
    done_3: '3. 点「连接」，在弹出的页面粘贴 Canvas 令牌并授权。',
    done_gpt: '   ChatGPT：在开发者模式里用同一个网址添加自定义连接器。',
    done_update: '以后想更新，再运行一次同一条命令就行：存储和连接都会保留。',
    rerun: '找到你已有的安装「{name}」。会把它更新成你现在运行的这份代码，设置和连接都会保留。',
    un_confirm: '这会删除连接器「{name}」和它的存储，你的 AI 应用会失去连接。输入名称确认：',
    un_done: '已删除。另外请删掉 Canvas 令牌（Canvas → 账户 → 设置）和 AI 应用里的连接器。',
    cancelled: '已取消。',
    failed: '出错了：{detail}\n  没有任何东西丢失：再运行一次同一条命令就能接着装。',
  },
};
export const msg = (lang, key, vars = {}) =>
  (M[lang]?.[key] ?? M.en[key]).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
export const MESSAGES = M;
