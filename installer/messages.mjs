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
    updated:
      'Updated to version {version}. Your connected Claude/ChatGPT keep working: no reconnecting.',
    updated_refresh:
      'ChatGPT keeps its own copy of the tool list: in ChatGPT, open Settings, find this connector and click Refresh to get the new features. In Claude, just start a new chat.',
    updated_expired:
      'Updates never need reconnecting. Only when your Canvas token expires (your AI then says "authorization expired"): make a new Canvas token, then Disconnect → Connect the connector in your AI app and paste it.',
    done_update:
      'To update later, run the same command again: it keeps your storage and connections.',
    un_confirm:
      'This deletes the connector "{name}" and its storage. Your AI apps will lose the connection. Type the name to confirm:',
    un_failed:
      'Could not delete {what}: {detail}\n  Your local install record was kept: run the same command again to retry.',
    un_done:
      'Removed. Also delete the Canvas token (Canvas → Account → Settings) and the connector in your AI app.',
    cancelled: 'Cancelled.',
    cert_wait:
      'The new workers.dev address is still getting its HTTPS certificate. The first time this can take a few minutes; waiting…',
    pick_account_flag:
      'This Cloudflare login has several accounts. Run the same command again with one of these added:\n{list}',
    canvas_flag:
      "Without an interactive terminal the Canvas address must be given: add --canvas-host <address>, e.g. --canvas-host canvas.example.edu (what the browser's address bar shows when you use Canvas).",
    subdomain_needed:
      "Your Cloudflare account has no workers.dev subdomain yet (the connector's address uses it). A Cloudflare page opens in your browser: pick a name, for example your name plus a number, and save it.\n  {link}",
    subdomain_wait: 'When it is saved, come back here and press Enter:',
    update_q:
      'Found your install "{name}" ({from}). New version: {to}. Update it? Your settings are kept and your AI apps stay connected. (y/n)',
    update_q_same:
      'Found your install "{name}", already on the newest version ({to}). Deploy it again anyway? (y/n)',
    update_q_older:
      'Found your install "{name}" ({from}), which is newer than the code you are running ({to}). Continuing would put the older version back. Continue? (y/n)',
    update_q_unknown:
      'Found your install "{name}". Update it to {to}? Your settings are kept and your AI apps stay connected. (y/n)',
    update_cancelled: 'Nothing changed. Run the same command again whenever you want to update.',
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
    updated: '已更新到 {version} 版。已经连好的 Claude / ChatGPT 照常能用，不用重新连接。',
    updated_refresh:
      'ChatGPT 会保存一份旧的工具列表：请到 ChatGPT 设置里找到这个连接器，点"刷新"，才能用上新功能。Claude 新开一个对话就行。',
    updated_expired:
      '更新永远不需要重新连接。只有 Canvas 令牌过期时（AI 会提示"authorization expired"，授权过期）才需要：生成一个新的 Canvas 令牌，在 AI 应用里把连接器断开再连接，粘贴新令牌就行。',
    done_update: '以后想更新，再运行一次同一条命令就行：存储和连接都会保留。',
    un_confirm: '这会删除连接器「{name}」和它的存储，你的 AI 应用会失去连接。输入名称确认：',
    un_failed: '没能删除{what}：{detail}\n  本地安装记录已保留，再运行一次同一条命令即可重试。',
    un_done: '已删除。另外请删掉 Canvas 令牌（Canvas → 账户 → 设置）和 AI 应用里的连接器。',
    cancelled: '已取消。',
    cert_wait: '新的 workers.dev 地址还在申请 HTTPS 证书，第一次可能要几分钟，正在等待…',
    pick_account_flag:
      '这个 Cloudflare 登录下有多个账号。请在同一条命令后加上其中一个，再运行一次：\n{list}',
    canvas_flag:
      '没有交互终端时，需要直接给出 Canvas 网址：在命令后加上 --canvas-host <网址>，比如 --canvas-host canvas.example.edu（就是用 Canvas 时浏览器地址栏里的网址）。',
    subdomain_needed:
      '你的 Cloudflare 账号还没有 workers.dev 子域名（连接器的网址会用到它）。浏览器会打开 Cloudflare 的设置页：起一个名字（比如你的名字加几个数字），保存。\n  {link}',
    subdomain_wait: '保存好之后，回到这里按回车继续：',
    update_q:
      '找到你已有的安装「{name}」（{from}）。新版本：{to}。要更新吗？设置会沿用，AI 应用不用重新连接。(y/n)',
    update_q_same: '找到你已有的安装「{name}」，已经是最新版（{to}）。还要再部署一次吗？(y/n)',
    update_q_older:
      '找到你已有的安装「{name}」（{from}），比你现在运行的这份代码（{to}）还新。继续会换回旧版本。要继续吗？(y/n)',
    update_q_unknown:
      '找到你已有的安装「{name}」。要更新到 {to} 吗？设置会沿用，AI 应用不用重新连接。(y/n)',
    update_cancelled: '什么都没改。想更新时再运行一次同一条命令就行。',
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
    updated:
      'Actualizado a la versión {version}. Tu Claude/ChatGPT conectado sigue funcionando: no hace falta reconectar.',
    updated_refresh:
      'ChatGPT guarda su propia copia de la lista de herramientas: en ChatGPT, abre Configuración, busca este conector y pulsa Actualizar para tener las novedades. En Claude, basta con abrir un chat nuevo.',
    updated_expired:
      'Las actualizaciones nunca requieren reconectar. Solo cuando tu token de Canvas caduca (tu IA dice "authorization expired"): crea un token nuevo de Canvas, desconecta y vuelve a conectar el conector en tu app de IA y pégalo.',
    done_update:
      'Para actualizar más adelante, vuelve a ejecutar el mismo comando: conserva tu almacenamiento y tus conexiones.',
    un_confirm:
      'Esto elimina el conector "{name}" y su almacenamiento. Tus apps de IA perderán la conexión. Escribe el nombre para confirmar:',
    un_failed:
      'No se pudo eliminar {what}: {detail}\n  Se conservó el registro local: vuelve a ejecutar el mismo comando para reintentar.',
    un_done:
      'Eliminado. Borra también el token de Canvas (Canvas → Cuenta → Configuración) y el conector en tu app de IA.',
    cancelled: 'Cancelado.',
    cert_wait:
      'La nueva dirección workers.dev todavía está obteniendo su certificado HTTPS. La primera vez puede tardar unos minutos; esperando…',
    pick_account_flag:
      'Este inicio de sesión de Cloudflare tiene varias cuentas. Ejecuta el mismo comando otra vez añadiendo una de estas:\n{list}',
    canvas_flag:
      'Sin una terminal interactiva hay que indicar la dirección de Canvas: añade --canvas-host <dirección>, por ejemplo --canvas-host canvas.example.edu (lo que muestra la barra de direcciones cuando usas Canvas).',
    subdomain_needed:
      'Tu cuenta de Cloudflare aún no tiene un subdominio workers.dev (la dirección del conector lo usa). Se abre una página de Cloudflare en el navegador: elige un nombre, por ejemplo tu nombre y un número, y guárdalo.\n  {link}',
    subdomain_wait: 'Cuando esté guardado, vuelve aquí y pulsa Enter:',
    update_q:
      'Se encontró tu instalación "{name}" ({from}). Versión nueva: {to}. ¿Actualizarla? Se conserva tu configuración y tus apps de IA siguen conectadas. (y/n)',
    update_q_same:
      'Se encontró tu instalación "{name}", que ya está en la versión más reciente ({to}). ¿Desplegarla de nuevo de todos modos? (y/n)',
    update_q_older:
      'Se encontró tu instalación "{name}" ({from}), más nueva que el código que estás ejecutando ({to}). Si continúas, volverá la versión anterior. ¿Continuar? (y/n)',
    update_q_unknown:
      'Se encontró tu instalación "{name}". ¿Actualizarla a {to}? Se conserva tu configuración y tus apps de IA siguen conectadas. (y/n)',
    update_cancelled: 'No se cambió nada. Ejecuta el mismo comando cuando quieras actualizar.',
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
    updated:
      'バージョン {version} に更新しました。接続済みの Claude / ChatGPT はそのまま使えます。再接続は不要です。',
    updated_refresh:
      'ChatGPT はツール一覧のコピーを保存しています。新機能を使うには、ChatGPT の設定でこのコネクタを探して「更新」を押してください。Claude は新しいチャットを始めるだけで反映されます。',
    updated_expired:
      '更新で再接続が必要になることはありません。Canvas トークンの期限が切れたとき（AI が「authorization expired」と言います）だけ：新しい Canvas トークンを作り、AI アプリでコネクタを切断 → 再接続して貼り付けてください。',
    done_update:
      '後で更新するときは、同じコマンドをもう一度実行するだけです。ストレージと接続はそのまま残ります。',
    un_confirm:
      'コネクタ「{name}」とそのストレージを削除します。AI アプリとの接続は切れます。確認のため名前を入力してください：',
    un_failed:
      '{what} を削除できませんでした：{detail}\n  ローカルのインストール記録は残してあります。同じコマンドをもう一度実行すると再試行できます。',
    un_done:
      '削除しました。Canvas トークン（Canvas → アカウント → 設定）と AI アプリのコネクタも削除してください。',
    cancelled: 'キャンセルしました。',
    cert_wait:
      '新しい workers.dev アドレスの HTTPS 証明書を準備しています。初回は数分かかることがあります。待機しています…',
    pick_account_flag:
      'この Cloudflare ログインには複数のアカウントがあります。同じコマンドに次のどれかを付けて、もう一度実行してください：\n{list}',
    canvas_flag:
      '対話型ターミナルがない場合は Canvas のアドレスを指定する必要があります：--canvas-host <アドレス> を付けてください（例：--canvas-host canvas.example.edu。Canvas を使うときにブラウザのアドレスバーに表示されるもの）。',
    subdomain_needed:
      'Cloudflare アカウントにまだ workers.dev サブドメインがありません（コネクタのアドレスに使います）。ブラウザで Cloudflare のページが開くので、名前（例：自分の名前＋数字）を決めて保存してください。\n  {link}',
    subdomain_wait: '保存したら、ここに戻って Enter を押してください：',
    update_q:
      '既存のインストール「{name}」（{from}）が見つかりました。新しいバージョン：{to}。更新しますか？設定はそのまま使い、AI アプリの再接続も不要です。(y/n)',
    update_q_same:
      '既存のインストール「{name}」はすでに最新版（{to}）です。もう一度デプロイしますか？(y/n)',
    update_q_older:
      '既存のインストール「{name}」（{from}）は、今実行しているコード（{to}）より新しいです。続けると古いバージョンに戻ります。続けますか？(y/n)',
    update_q_unknown:
      '既存のインストール「{name}」が見つかりました。{to} に更新しますか？設定はそのまま使い、AI アプリの再接続も不要です。(y/n)',
    update_cancelled:
      '何も変更していません。更新したいときに同じコマンドをもう一度実行してください。',
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
    updated:
      'संस्करण {version} में अपडेट हो गया। आपका जुड़ा हुआ Claude/ChatGPT चलता रहेगा: दोबारा जोड़ने की ज़रूरत नहीं।',
    updated_refresh:
      'ChatGPT टूल सूची की अपनी कॉपी रखता है: नई सुविधाएँ पाने के लिए ChatGPT की सेटिंग्स में यह कनेक्टर ढूँढें और Refresh दबाएँ। Claude में बस नई चैट शुरू करें।',
    updated_expired:
      'अपडेट के बाद दोबारा जोड़ने की ज़रूरत कभी नहीं होती। सिर्फ़ जब Canvas टोकन की अवधि खत्म हो (AI "authorization expired" कहेगा): नया Canvas टोकन बनाएँ, फिर AI ऐप में कनेक्टर को Disconnect → Connect करें और उसे चिपकाएँ।',
    done_update:
      'बाद में अपडेट करने के लिए वही कमांड फिर से चलाएँ: आपका स्टोरेज और कनेक्शन बने रहेंगे।',
    un_confirm:
      'यह कनेक्टर "{name}" और उसका स्टोरेज हटा देगा। आपके AI ऐप का कनेक्शन टूट जाएगा। पुष्टि के लिए नाम लिखें:',
    un_failed:
      '{what} हटाया नहीं जा सका: {detail}\n  आपका लोकल इंस्टॉल रिकॉर्ड रखा गया है: फिर से कोशिश करने के लिए वही कमांड चलाएँ।',
    un_done:
      'हटा दिया गया। Canvas टोकन (Canvas → Account → Settings) और अपने AI ऐप में कनेक्टर भी हटाएँ।',
    cancelled: 'रद्द किया गया।',
    cert_wait:
      'नए workers.dev पते का HTTPS प्रमाणपत्र अभी तैयार हो रहा है। पहली बार इसमें कुछ मिनट लग सकते हैं; प्रतीक्षा हो रही है…',
    pick_account_flag:
      'इस Cloudflare लॉगिन में कई खाते हैं। वही कमांड इनमें से एक जोड़कर फिर से चलाएँ:\n{list}',
    canvas_flag:
      'इंटरैक्टिव टर्मिनल के बिना Canvas का पता देना ज़रूरी है: --canvas-host <पता> जोड़ें, जैसे --canvas-host canvas.example.edu (Canvas इस्तेमाल करते समय ब्राउज़र के एड्रेस बार में जो दिखता है)।',
    subdomain_needed:
      'आपके Cloudflare खाते में अभी workers.dev सबडोमेन नहीं है (कनेक्टर का पता इसी से बनता है)। ब्राउज़र में Cloudflare का पेज खुलेगा: एक नाम चुनें, जैसे आपका नाम और कोई संख्या, और सेव करें।\n  {link}',
    subdomain_wait: 'सेव करने के बाद यहाँ लौटकर Enter दबाएँ:',
    update_q:
      'आपका मौजूदा इंस्टॉल "{name}" ({from}) मिला। नया संस्करण: {to}। अपडेट करें? आपकी सेटिंग्स बनी रहेंगी और आपके AI ऐप जुड़े रहेंगे। (y/n)',
    update_q_same:
      'आपका मौजूदा इंस्टॉल "{name}" पहले से नवीनतम संस्करण ({to}) पर है। फिर भी दोबारा डिप्लॉय करें? (y/n)',
    update_q_older:
      'आपका मौजूदा इंस्टॉल "{name}" ({from}) आपके अभी चल रहे कोड ({to}) से नया है। आगे बढ़ने पर पुराना संस्करण वापस आ जाएगा। जारी रखें? (y/n)',
    update_q_unknown:
      'आपका मौजूदा इंस्टॉल "{name}" मिला। इसे {to} पर अपडेट करें? आपकी सेटिंग्स बनी रहेंगी और आपके AI ऐप जुड़े रहेंगे। (y/n)',
    update_cancelled: 'कुछ नहीं बदला। जब अपडेट करना हो, वही कमांड फिर से चलाएँ।',
    failed:
      'कुछ गलत हो गया: {detail}\n  कुछ भी नहीं खोया: जारी रखने के लिए वही कमांड फिर से चलाएँ।',
  },
};
export const msg = (lang, key, vars = {}) =>
  (M[lang]?.[key] ?? M.en[key]).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
export const MESSAGES = M;
