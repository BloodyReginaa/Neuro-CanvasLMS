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
    done_now: 'Do this right away, and keep the URL to yourself until it is connected.',
    done_gpt: '   ChatGPT: add a custom connector (developer mode) with the same URL.',
    done_update:
      'To update later, run the same command again: it keeps your storage and connections.',
    rerun:
      'Found your existing install "{name}". This updates it to the code you are running now and keeps your settings and connections.',
    un_confirm:
      'This deletes the connector "{name}" and its storage. Your AI apps will lose the connection. Type the name to confirm:',
    un_failed:
      'Could not delete {what}: {detail}\n  Your local install record was kept: run the same command again to retry.',
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
    done_now: '现在就去连接；连好之前不要把这个网址发给别人。',
    done_gpt: '   ChatGPT：在开发者模式里用同一个网址添加自定义连接器。',
    done_update: '以后想更新，再运行一次同一条命令就行：存储和连接都会保留。',
    rerun: '找到你已有的安装「{name}」。会把它更新成你现在运行的这份代码，设置和连接都会保留。',
    un_confirm: '这会删除连接器「{name}」和它的存储，你的 AI 应用会失去连接。输入名称确认：',
    un_failed: '没能删除{what}：{detail}\n  本地安装记录已保留，再运行一次同一条命令即可重试。',
    un_done: '已删除。另外请删掉 Canvas 令牌（Canvas → 账户 → 设置）和 AI 应用里的连接器。',
    cancelled: '已取消。',
    failed: '出错了：{detail}\n  没有任何东西丢失：再运行一次同一条命令就能接着装。',
  },
  es: {
    title: 'Instalador de Neuro-CanvasLMS — conecta tu Canvas a Claude o ChatGPT',
    node_old:
      'Se necesita Node.js {need} o más reciente (tienes {have}). Instálalo desde https://nodejs.org y vuelve a ejecutar esto.',
    login_needed:
      'Paso 1/4 · Inicia sesión en Cloudflare (cuenta gratuita: https://dash.cloudflare.com/sign-up).\n  Se abre una página de Cloudflare en tu navegador (quizá en una pestaña de fondo). Haz clic en el botón azul "Authorize" en menos de 2 minutos.',
    login_retry:
      'El inicio de sesión no se completó. Cierra las pestañas antiguas de Cloudflare; se está abriendo una nueva.',
    login_failed:
      'No se pudo iniciar sesión en Cloudflare. Vuelve a ejecutar este comando cuando estés listo.',
    logged_in: 'Sesión iniciada en Cloudflare como {email}.',
    pick_account: '¿En qué cuenta de Cloudflare se instala el conector?',
    canvas_q:
      'Paso 2/4 · La dirección de Canvas de tu universidad (abre Canvas en el navegador y pega la barra de direcciones, p. ej. canvas.example.edu):',
    canvas_bad:
      'Eso no parece un sitio de Canvas ({detail}). Pega la dirección de la página donde inicias sesión en Canvas.',
    canvas_ok: 'Canvas encontrado en {host}.',
    school_q:
      'Nombre de tu universidad, se muestra en las páginas del conector (opcional, Enter para omitir):',
    kv: 'Creando el almacenamiento del conector…',
    kv_reuse: 'Reutilizando el almacenamiento existente.',
    deploy: 'Paso 3/4 · Desplegando el conector (versión {version})…',
    deploy_ok: 'El conector está activo: {url}',
    check: 'Paso 4/4 · Comprobando el conector…',
    check_ok: 'Todo funciona (versión {version}).',
    check_bad: 'El conector no pasó la comprobación: {detail}',
    done: '¡Listo! Último paso, en tu IA:',
    done_1:
      '1. Crea un token de acceso de Canvas: {canvas}/profile/settings → "+ Nuevo token de acceso" (cópialo; Canvas lo muestra una sola vez).',
    done_2:
      '2. Claude: Configuración → Conectores → "Añadir conector personalizado" → pega esta URL (ya está copiada):',
    done_3:
      '3. Haz clic en "Conectar", pega el token de Canvas en la página que se abre y autoriza.',
    done_now: 'Hazlo ahora mismo y no compartas la URL hasta que esté conectado.',
    done_gpt: '   ChatGPT: añade un conector personalizado (modo desarrollador) con la misma URL.',
    done_update:
      'Para actualizar más adelante, vuelve a ejecutar el mismo comando: conserva tu almacenamiento y tus conexiones.',
    rerun:
      'Se encontró tu instalación "{name}". Esto la actualiza al código que estás ejecutando y conserva tu configuración y conexiones.',
    un_confirm:
      'Esto elimina el conector "{name}" y su almacenamiento. Tus apps de IA perderán la conexión. Escribe el nombre para confirmar:',
    un_failed:
      'No se pudo eliminar {what}: {detail}\n  Se conservó el registro local: vuelve a ejecutar el mismo comando para reintentar.',
    un_done:
      'Eliminado. Borra también el token de Canvas (Canvas → Cuenta → Configuración) y el conector en tu app de IA.',
    cancelled: 'Cancelado.',
    failed:
      'Algo salió mal: {detail}\n  No se perdió nada: vuelve a ejecutar el mismo comando para continuar.',
  },
  ja: {
    title: 'Neuro-CanvasLMS インストーラー — Canvas を Claude や ChatGPT につなぐ',
    node_old:
      'Node.js {need} 以降が必要です（現在は {have}）。https://nodejs.org からインストールして、もう一度実行してください。',
    login_needed:
      'ステップ 1/4 · Cloudflare にサインイン（無料アカウント：https://dash.cloudflare.com/sign-up）。\n  ブラウザで Cloudflare のページが開きます（背景のタブかもしれません）。2 分以内に青い "Authorize" ボタンを押してください。',
    login_retry:
      'サインインが完了しませんでした。古い Cloudflare のタブを閉じてください。新しいページを開いています。',
    login_failed:
      'Cloudflare にサインインできませんでした。準備ができたら、このコマンドをもう一度実行してください。',
    logged_in: 'Cloudflare にサインインしました：{email}',
    pick_account: 'コネクタをどの Cloudflare アカウントに入れますか？',
    canvas_q:
      'ステップ 2/4 · 学校の Canvas のアドレス（ブラウザで Canvas を開き、アドレスバーを貼り付けてください。例：canvas.example.edu）：',
    canvas_bad:
      'Canvas のサイトではないようです（{detail}）。Canvas にログインするページのアドレスを貼り付けてください。',
    canvas_ok: 'Canvas が見つかりました：{host}',
    school_q: '学校名（コネクタのページに表示されます。任意、Enter でスキップ）：',
    kv: 'コネクタのストレージを作成しています…',
    kv_reuse: '既存のストレージを再利用します。',
    deploy: 'ステップ 3/4 · コネクタをデプロイしています（バージョン {version}）…',
    deploy_ok: 'コネクタが公開されました：{url}',
    check: 'ステップ 4/4 · コネクタを確認しています…',
    check_ok: 'すべて正常です（バージョン {version}）。',
    check_bad: 'コネクタが確認に失敗しました：{detail}',
    done: '完了！最後のステップ（AI 側）：',
    done_1:
      '1. Canvas アクセストークンを作成：{canvas}/profile/settings →「+ 新しいアクセストークン」（すぐコピー。表示は一度きりです）。',
    done_2:
      '2. Claude：設定 → コネクタ →「カスタムコネクタを追加」→ この URL を貼り付け（コピー済み）：',
    done_3: '3.「接続」を押し、開いたページに Canvas トークンを貼り付けて認可します。',
    done_now: '今すぐ接続してください。接続が終わるまで、この URL を他人に教えないでください。',
    done_gpt: '   ChatGPT：開発者モードで同じ URL のカスタムコネクタを追加します。',
    done_update:
      '後で更新するときは、同じコマンドをもう一度実行するだけです。ストレージと接続はそのまま残ります。',
    rerun:
      '既存のインストール「{name}」が見つかりました。今実行しているコードに更新し、設定と接続はそのまま残します。',
    un_confirm:
      'コネクタ「{name}」とそのストレージを削除します。AI アプリとの接続は切れます。確認のため名前を入力してください：',
    un_failed:
      '{what} を削除できませんでした：{detail}\n  ローカルのインストール記録は残してあります。同じコマンドをもう一度実行すると再試行できます。',
    un_done:
      '削除しました。Canvas トークン（Canvas → アカウント → 設定）と AI アプリのコネクタも削除してください。',
    cancelled: 'キャンセルしました。',
    failed:
      'エラーが発生しました：{detail}\n  何も失われていません。同じコマンドをもう一度実行すると続きから進みます。',
  },
  hi: {
    title: 'Neuro-CanvasLMS इंस्टॉलर — अपने Canvas को Claude या ChatGPT से जोड़ें',
    node_old:
      'Node.js {need} या नया संस्करण चाहिए (आपके पास {have} है)। https://nodejs.org से इंस्टॉल करें और इसे फिर से चलाएँ।',
    login_needed:
      'चरण 1/4 · Cloudflare में साइन इन करें (मुफ़्त खाता: https://dash.cloudflare.com/sign-up)।\n  आपके ब्राउज़र में Cloudflare का पेज खुलेगा (शायद पीछे वाले टैब में)। 2 मिनट के भीतर नीला "Authorize" बटन दबाएँ।',
    login_retry: 'साइन इन पूरा नहीं हुआ। पुराने Cloudflare टैब बंद करें; अब एक नया पेज खुल रहा है।',
    login_failed: 'Cloudflare में साइन इन नहीं हो सका। तैयार होने पर यह कमांड फिर से चलाएँ।',
    logged_in: 'Cloudflare में साइन इन हुआ: {email}',
    pick_account: 'कनेक्टर किस Cloudflare खाते में लगाया जाए?',
    canvas_q:
      'चरण 2/4 · आपके संस्थान का Canvas पता (ब्राउज़र में Canvas खोलें और एड्रेस बार चिपकाएँ, जैसे canvas.example.edu):',
    canvas_bad:
      'यह Canvas साइट नहीं लगती ({detail})। उस पेज का पता चिपकाएँ जहाँ आप Canvas में लॉग इन करते हैं।',
    canvas_ok: 'Canvas मिला: {host}',
    school_q:
      'आपके संस्थान का नाम, कनेक्टर के पेजों पर दिखेगा (वैकल्पिक, छोड़ने के लिए Enter दबाएँ):',
    kv: 'कनेक्टर का स्टोरेज बनाया जा रहा है…',
    kv_reuse: 'मौजूदा स्टोरेज का फिर से उपयोग किया जा रहा है।',
    deploy: 'चरण 3/4 · कनेक्टर डिप्लॉय हो रहा है (संस्करण {version})…',
    deploy_ok: 'कनेक्टर चालू है: {url}',
    check: 'चरण 4/4 · कनेक्टर की जाँच हो रही है…',
    check_ok: 'सब कुछ ठीक है (संस्करण {version})।',
    check_bad: 'कनेक्टर जाँच में विफल रहा: {detail}',
    done: 'हो गया! आख़िरी कदम, अपने AI में:',
    done_1:
      '1. Canvas एक्सेस टोकन बनाएँ: {canvas}/profile/settings → "+ New Access Token" (तुरंत कॉपी करें; Canvas इसे केवल एक बार दिखाता है)।',
    done_2:
      '2. Claude: Settings → Connectors → "Add custom connector" → यह URL चिपकाएँ (पहले से कॉपी है):',
    done_3: '3. "Connect" दबाएँ, खुले पेज पर Canvas टोकन चिपकाएँ और अधिकृत करें।',
    done_now: 'यह अभी करें, और जुड़ने तक यह URL किसी के साथ साझा न करें।',
    done_gpt: '   ChatGPT: डेवलपर मोड में उसी URL से कस्टम कनेक्टर जोड़ें।',
    done_update:
      'बाद में अपडेट करने के लिए वही कमांड फिर से चलाएँ: आपका स्टोरेज और कनेक्शन बने रहेंगे।',
    rerun:
      'आपका मौजूदा इंस्टॉल "{name}" मिला। यह उसे अभी चल रहे कोड पर अपडेट करेगा और आपकी सेटिंग्स व कनेक्शन बनाए रखेगा।',
    un_confirm:
      'यह कनेक्टर "{name}" और उसका स्टोरेज हटा देगा। आपके AI ऐप का कनेक्शन टूट जाएगा। पुष्टि के लिए नाम लिखें:',
    un_failed:
      '{what} हटाया नहीं जा सका: {detail}\n  आपका लोकल इंस्टॉल रिकॉर्ड रखा गया है: फिर से कोशिश करने के लिए वही कमांड चलाएँ।',
    un_done:
      'हटा दिया गया। Canvas टोकन (Canvas → Account → Settings) और अपने AI ऐप में कनेक्टर भी हटाएँ।',
    cancelled: 'रद्द किया गया।',
    failed:
      'कुछ गलत हो गया: {detail}\n  कुछ भी नहीं खोया: जारी रखने के लिए वही कमांड फिर से चलाएँ।',
  },
};
export const msg = (lang, key, vars = {}) =>
  (M[lang]?.[key] ?? M.en[key]).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
export const MESSAGES = M;
