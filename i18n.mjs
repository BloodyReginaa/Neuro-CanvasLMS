// UI strings for the connector's own web pages (home, authorize, errors).
// To add a language: copy the `en` block, translate every key, add it to LANGS.
// {placeholders} are filled in by t(). Keep HTML out of translations.

export const LANGS = ['en', 'zh-CN', 'es', 'ja', 'hi'];
export const LANG_NAMES = {
  en: 'English',
  'zh-CN': '简体中文',
  es: 'Español',
  ja: '日本語',
  hi: 'हिन्दी',
};

const S = {
  en: {
    product: 'Neuro-CanvasLMS',
    tagline: 'Your Canvas, readable by your own AI assistant.',
    status_bound: 'Connected to its owner',
    status_unbound: 'Not connected yet',
    home_add_title: 'Add it to your assistant',
    canvas_site: 'Canvas site',
    auth_title: 'Connect your {school} Canvas',
    auth_title_plain: 'Connect your Canvas',
    auth_lead: 'Let your own AI assistant read what you can already see in Canvas.',
    read_only: 'Read-only',
    scopes_title: 'What it can read',
    scopes:
      'Courses & modules|Files & lecture notes|Assignments & submissions|Grades & feedback|Inbox|Discussions|Calendar & to-dos|Groups|Quiz history|Profile & notification settings',
    returning_to: 'After authorizing you will return to',
    token_label: 'Canvas access token',
    token_placeholder: 'Paste your token here',
    token_how:
      'Create one in Canvas: Account → Settings → New Access Token. Copy it right away — Canvas shows it only once.',
    token_open: 'Open Canvas settings',
    token_privacy:
      'The token goes only to this Worker (which you deployed) and to Canvas, then is stored encrypted inside the authorization. Your school may limit tokens to 30 days; when it expires, reconnect with a new one.',
    consent: 'I allow this AI assistant to read the Canvas data listed above.',
    submit: 'Authorize',
    fail_title: 'Could not verify the token',
    fail_hint:
      'Check that the token was copied completely and has not expired, then go back and try again.',
    back: 'Go back',
    owner_title: 'This connector belongs to someone else',
    owner_body:
      'It is already bound to a different Canvas account. Deploy your own copy to use it.',
    client_title: 'Unsupported app',
    client_body: 'Only Claude, ChatGPT and local AI clients can connect to this connector.',
    expired_title: 'This page has expired',
    expired_body:
      'The page was open too long, or was opened again in another tab. Go back and paste your token again.',
    down_title: 'Canvas is not answering right now',
    down_hint:
      'Your token is probably fine: Canvas is slow, down for maintenance, or could not be reached. Wait a few minutes, then go back and try again.',
    busy_title: 'Something went wrong on your connector',
    busy_body:
      "Usually its Cloudflare storage is briefly unavailable, or the free plan's daily storage limit is used up (it resets at 00:00 UTC). Your token and your connection are not affected. Try again later.",
    footer: 'Open source · read-only · runs on your own Cloudflare account',
    version_label: 'Version',
    not_configured: 'Not configured yet. Run the installer.',
    language: 'Language',
    token_path: 'Account → Settings → + New Access Token',
    step_token: 'Token',
    step_consent: 'Consent',
    step_authorize: 'Authorize',
    next: 'Continue',
    skip: 'Skip',
    token_got: 'Token received',
    thanks_title: 'Thank you',
    thanks_body: 'Connecting your Canvas to your AI…',
    subjects:
      'Calculus|Linear Algebra|Organic Chemistry|Cell Biology|Quantum Mechanics|Macroeconomics|Data Structures|Statistics|Psychology|World History|Philosophy|Literature|Linguistics|Music Theory|Art History|Political Science',
  },
  'zh-CN': {
    product: 'Neuro-CanvasLMS',
    tagline: '让你自己的 AI 助手读懂你的 Canvas。',
    status_bound: '已绑定所有者',
    status_unbound: '还没有连接',
    home_add_title: '添加到你的 AI 助手',
    canvas_site: 'Canvas 站点',
    auth_title: '连接你的 {school} Canvas',
    auth_title_plain: '连接你的 Canvas',
    auth_lead: '让你自己的 AI 助手读取你在 Canvas 中本来就能看到的内容。',
    read_only: '只读',
    scopes_title: '可读取的内容',
    scopes:
      '课程与模块|文件与讲义|作业与提交记录|成绩与评语|站内信|讨论区|日历与待办|小组|测验记录|个人资料与通知设置',
    returning_to: '授权后将返回',
    token_label: 'Canvas 访问令牌',
    token_placeholder: '在此粘贴令牌',
    token_how: '在 Canvas 中创建：账户 → 设置 → 新建访问许可证。请立即复制——Canvas 只显示一次。',
    token_open: '打开 Canvas 设置',
    token_privacy:
      '令牌只会发送到这个由你自己部署的 Worker 和 Canvas，并加密保存在授权记录中。学校可能限制令牌最长 30 天有效，过期后用新令牌重新连接即可。',
    consent: '我允许该 AI 助手读取上面列出的 Canvas 信息。',
    submit: '授权',
    fail_title: '令牌验证失败',
    fail_hint: '请确认令牌已完整复制且未过期，然后返回重试。',
    back: '返回',
    owner_title: '此连接器属于其他人',
    owner_body: '它已绑定到另一个 Canvas 账号。如需使用，请部署你自己的副本。',
    client_title: '不支持的应用',
    client_body: '只有 Claude、ChatGPT 和本地 AI 客户端可以连接此连接器。',
    expired_title: '页面已过期',
    expired_body: '这个页面打开太久了，或者在另一个标签页里又打开过一次。请返回，重新粘贴令牌。',
    down_title: 'Canvas 暂时没有响应',
    down_hint: '令牌多半没有问题：Canvas 现在很慢、正在维护，或者连不上。等几分钟后返回重试。',
    busy_title: '你的连接器出了点问题',
    busy_body:
      '通常是它的 Cloudflare 存储暂时不可用，或者免费版当天的存储额度用完了（每天 UTC 0 点重置）。你的令牌和已有的连接都不受影响，请稍后再试。',
    footer: '开源 · 只读 · 运行在你自己的 Cloudflare 账号上',
    version_label: '版本',
    not_configured: '还没配置，请运行安装向导。',
    language: '语言',
    token_path: '账户 → 设置 → 新建访问许可证',
    step_token: '令牌',
    step_consent: '同意',
    step_authorize: '授权',
    next: '继续',
    skip: '跳过',
    token_got: '已收到令牌',
    thanks_title: '谢谢',
    thanks_body: '正在把你的 Canvas 接入你的 AI 助手…',
    subjects:
      '微积分|线性代数|有机化学|细胞生物学|量子力学|宏观经济学|数据结构|统计学|心理学|世界史|哲学|文学|语言学|乐理|艺术史|政治学',
  },
  es: {
    product: 'Neuro-CanvasLMS',
    tagline: 'Tu Canvas, al alcance de tu propio asistente de IA.',
    status_bound: 'Vinculado a su propietario',
    status_unbound: 'Aún no conectado',
    home_add_title: 'Añádelo a tu asistente',
    canvas_site: 'Sitio de Canvas',
    auth_title: 'Conecta tu Canvas de {school}',
    auth_title_plain: 'Conecta tu Canvas',
    auth_lead: 'Permite que tu propio asistente de IA lea lo que ya puedes ver en Canvas.',
    read_only: 'Solo lectura',
    scopes_title: 'Qué puede leer',
    scopes:
      'Cursos y módulos|Archivos y apuntes|Tareas y entregas|Calificaciones y comentarios|Bandeja de entrada|Foros de discusión|Calendario y pendientes|Grupos|Historial de exámenes|Perfil y notificaciones',
    returning_to: 'Tras autorizar volverás a',
    token_label: 'Token de acceso de Canvas',
    token_placeholder: 'Pega tu token aquí',
    token_how:
      'Créalo en Canvas: Cuenta → Configuración → Nuevo token de acceso. Cópialo enseguida: Canvas solo lo muestra una vez.',
    token_open: 'Abrir la configuración de Canvas',
    token_privacy:
      'El token solo se envía a este Worker (que tú desplegaste) y a Canvas, y se guarda cifrado dentro de la autorización. Tu universidad puede limitar los tokens a 30 días; cuando caduque, vuelve a conectar con uno nuevo.',
    consent: 'Permito que este asistente de IA lea los datos de Canvas indicados arriba.',
    submit: 'Autorizar',
    fail_title: 'No se pudo verificar el token',
    fail_hint:
      'Comprueba que lo copiaste completo y que no ha caducado; luego vuelve e inténtalo de nuevo.',
    back: 'Volver',
    owner_title: 'Este conector pertenece a otra persona',
    owner_body: 'Ya está vinculado a otra cuenta de Canvas. Despliega tu propia copia para usarlo.',
    client_title: 'Aplicación no compatible',
    client_body: 'Solo Claude, ChatGPT y clientes de IA locales pueden conectarse.',
    expired_title: 'La página ha caducado',
    expired_body:
      'La página estuvo abierta demasiado tiempo o se volvió a abrir en otra pestaña. Vuelve y pega tu token de nuevo.',
    down_title: 'Canvas no responde ahora mismo',
    down_hint:
      'Seguramente tu token está bien: Canvas va lento, está en mantenimiento o no se pudo contactar. Espera unos minutos, luego vuelve e inténtalo de nuevo.',
    busy_title: 'Algo salió mal en tu conector',
    busy_body:
      'Normalmente su almacenamiento de Cloudflare no está disponible por un momento, o se agotó el límite diario del plan gratuito (se reinicia a las 00:00 UTC). Tu token y tu conexión no se ven afectados. Inténtalo más tarde.',
    footer: 'Código abierto · solo lectura · en tu propia cuenta de Cloudflare',
    version_label: 'Versión',
    not_configured: 'Aún no configurado. Ejecuta el instalador.',
    language: 'Idioma',
    token_path: 'Cuenta → Configuración → + Nuevo token de acceso',
    step_token: 'Token',
    step_consent: 'Consentimiento',
    step_authorize: 'Autorizar',
    next: 'Continuar',
    skip: 'Saltar',
    token_got: 'Token recibido',
    thanks_title: 'Gracias',
    thanks_body: 'Conectando tu Canvas con tu IA…',
    subjects:
      'Cálculo|Álgebra lineal|Química orgánica|Biología celular|Mecánica cuántica|Macroeconomía|Estructuras de datos|Estadística|Psicología|Historia universal|Filosofía|Literatura|Lingüística|Teoría musical|Historia del arte|Ciencia política',
  },
  ja: {
    product: 'Neuro-CanvasLMS',
    tagline: 'あなたの Canvas を、あなた自身の AI アシスタントに。',
    status_bound: '所有者と連携済み',
    status_unbound: 'まだ接続されていません',
    home_add_title: 'アシスタントに追加する',
    canvas_site: 'Canvas サイト',
    auth_title: '{school} の Canvas を接続',
    auth_title_plain: 'Canvas を接続',
    auth_lead:
      'Canvas であなたがすでに閲覧できる内容を、あなた自身の AI アシスタントが読めるようにします。',
    read_only: '読み取り専用',
    scopes_title: '読み取れる内容',
    scopes:
      'コースとモジュール|ファイルと講義ノート|課題と提出物|成績とフィードバック|受信トレイ|ディスカッション|カレンダーと To Do|グループ|小テスト履歴|プロフィールと通知設定',
    returning_to: '認可後の戻り先',
    token_label: 'Canvas アクセストークン',
    token_placeholder: 'ここにトークンを貼り付け',
    token_how:
      'Canvas で作成：アカウント → 設定 → 新しいアクセストークン。表示は一度きりなので、すぐにコピーしてください。',
    token_open: 'Canvas の設定を開く',
    token_privacy:
      'トークンはあなたがデプロイしたこの Worker と Canvas にのみ送信され、認可情報の中に暗号化して保存されます。学校によっては有効期限が最長 30 日です。期限切れの際は新しいトークンで再接続してください。',
    consent: '上記の Canvas データをこの AI アシスタントが読み取ることを許可します。',
    submit: '認可する',
    fail_title: 'トークンを確認できませんでした',
    fail_hint:
      'トークンが最後までコピーされているか、期限切れでないかを確認して、もう一度お試しください。',
    back: '戻る',
    owner_title: 'このコネクタは別の人のものです',
    owner_body:
      'すでに別の Canvas アカウントに紐づいています。利用するにはご自身でデプロイしてください。',
    client_title: '対応していないアプリです',
    client_body: '接続できるのは Claude、ChatGPT、ローカルの AI クライアントのみです。',
    expired_title: 'ページの有効期限が切れました',
    expired_body:
      'ページを長く開いたままにしたか、別のタブで開き直しました。戻って、もう一度トークンを貼り付けてください。',
    down_title: 'Canvas が今は応答していません',
    down_hint:
      'トークンはおそらく問題ありません。Canvas が遅いか、メンテナンス中か、接続できませんでした。数分待ってから、戻ってもう一度お試しください。',
    busy_title: 'コネクタで問題が発生しました',
    busy_body:
      '多くの場合、Cloudflare のストレージが一時的に使えないか、無料プランの 1 日あたりのストレージ上限に達しています（UTC 0:00 にリセット）。トークンと接続には影響ありません。しばらくしてからもう一度お試しください。',
    footer: 'オープンソース · 読み取り専用 · あなたの Cloudflare アカウントで動作',
    version_label: 'バージョン',
    not_configured: '未設定です。インストーラーを実行してください。',
    language: '言語',
    token_path: 'アカウント → 設定 → 新しいアクセストークン',
    step_token: 'トークン',
    step_consent: '同意',
    step_authorize: '認可',
    next: '次へ',
    skip: 'スキップ',
    token_got: 'トークンを受け取りました',
    thanks_title: 'ありがとうございます',
    thanks_body: 'Canvas を AI に接続しています…',
    subjects:
      '微分積分|線形代数|有機化学|細胞生物学|量子力学|マクロ経済学|データ構造|統計学|心理学|世界史|哲学|文学|言語学|音楽理論|美術史|政治学',
  },
  hi: {
    product: 'Neuro-CanvasLMS',
    tagline: 'आपका Canvas, आपके अपने AI सहायक के लिए।',
    status_bound: 'अपने स्वामी से जुड़ा हुआ',
    status_unbound: 'अभी तक कनेक्ट नहीं हुआ',
    home_add_title: 'इसे अपने सहायक में जोड़ें',
    canvas_site: 'Canvas साइट',
    auth_title: 'अपना {school} Canvas जोड़ें',
    auth_title_plain: 'अपना Canvas जोड़ें',
    auth_lead: 'Canvas में जो आप पहले से देख सकते हैं, उसे अपने AI सहायक को पढ़ने दें।',
    read_only: 'केवल पढ़ना',
    scopes_title: 'यह क्या पढ़ सकता है',
    scopes:
      'कोर्स और मॉड्यूल|फ़ाइलें और लेक्चर नोट्स|असाइनमेंट और सबमिशन|ग्रेड और फ़ीडबैक|इनबॉक्स|चर्चाएँ|कैलेंडर और टू-डू|समूह|क्विज़ इतिहास|प्रोफ़ाइल और सूचना सेटिंग्स',
    returning_to: 'अधिकृत करने के बाद आप यहाँ लौटेंगे',
    token_label: 'Canvas एक्सेस टोकन',
    token_placeholder: 'अपना टोकन यहाँ चिपकाएँ',
    token_how:
      'Canvas में बनाएँ: Account → Settings → New Access Token. तुरंत कॉपी करें — Canvas इसे केवल एक बार दिखाता है।',
    token_open: 'Canvas सेटिंग्स खोलें',
    token_privacy:
      'टोकन केवल इस Worker (जिसे आपने डिप्लॉय किया है) और Canvas को भेजा जाता है, फिर प्राधिकरण के अंदर एन्क्रिप्ट करके रखा जाता है। आपका संस्थान टोकन को 30 दिनों तक सीमित कर सकता है; समाप्त होने पर नए टोकन से फिर से जोड़ें।',
    consent: 'मैं इस AI सहायक को ऊपर बताए गए Canvas डेटा को पढ़ने की अनुमति देता/देती हूँ।',
    submit: 'अधिकृत करें',
    fail_title: 'टोकन सत्यापित नहीं हो सका',
    fail_hint:
      'जाँचें कि टोकन पूरा कॉपी हुआ है और उसकी अवधि समाप्त नहीं हुई है, फिर वापस जाकर दोबारा कोशिश करें।',
    back: 'वापस जाएँ',
    owner_title: 'यह कनेक्टर किसी और का है',
    owner_body:
      'यह पहले से किसी दूसरे Canvas खाते से जुड़ा है। इसे इस्तेमाल करने के लिए अपनी खुद की कॉपी डिप्लॉय करें।',
    client_title: 'असमर्थित ऐप',
    client_body: 'केवल Claude, ChatGPT और लोकल AI क्लाइंट ही इस कनेक्टर से जुड़ सकते हैं।',
    expired_title: 'पेज की अवधि समाप्त हो गई',
    expired_body:
      'यह पेज बहुत देर तक खुला रहा, या किसी दूसरे टैब में फिर से खोला गया। वापस जाएँ और अपना टोकन फिर से चिपकाएँ।',
    down_title: 'Canvas अभी जवाब नहीं दे रहा',
    down_hint:
      'आपका टोकन शायद ठीक है: Canvas धीमा है, रखरखाव में है, या उससे संपर्क नहीं हो सका। कुछ मिनट रुकें, फिर वापस जाकर दोबारा कोशिश करें।',
    busy_title: 'आपके कनेक्टर में कुछ गड़बड़ हुई',
    busy_body:
      'आम तौर पर इसका Cloudflare स्टोरेज कुछ देर के लिए उपलब्ध नहीं होता, या फ़्री प्लान की रोज़ की स्टोरेज सीमा खत्म हो गई है (यह 00:00 UTC पर रीसेट होती है)। आपका टोकन और कनेक्शन प्रभावित नहीं हैं। बाद में फिर से कोशिश करें।',
    footer: 'ओपन सोर्स · केवल पढ़ना · आपके अपने Cloudflare खाते पर चलता है',
    version_label: 'संस्करण',
    not_configured: 'अभी कॉन्फ़िगर नहीं है। इंस्टॉलर चलाएँ।',
    language: 'भाषा',
    token_path: 'Account → Settings → + New Access Token',
    step_token: 'टोकन',
    step_consent: 'सहमति',
    step_authorize: 'अनुमति',
    next: 'आगे बढ़ें',
    skip: 'छोड़ें',
    token_got: 'टोकन मिल गया',
    thanks_title: 'धन्यवाद',
    thanks_body: 'आपका Canvas आपके AI से जोड़ा जा रहा है…',
    subjects:
      'कलन|रैखिक बीजगणित|कार्बनिक रसायन|कोशिका जीवविज्ञान|क्वांटम यांत्रिकी|समष्टि अर्थशास्त्र|डेटा संरचनाएँ|सांख्यिकी|मनोविज्ञान|विश्व इतिहास|दर्शनशास्त्र|साहित्य|भाषाविज्ञान|संगीत सिद्धांत|कला इतिहास|राजनीति विज्ञान',
  },
};

// ?lang= wins, then the browser's Accept-Language (with q-weights), then English.
export function pickLang(request) {
  const url = new URL(request.url);
  const fromQuery = match(url.searchParams.get('lang'));
  if (fromQuery) return fromQuery;
  const header = request.headers.get('accept-language') ?? '';
  const ranked = header
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(';');
      const q = Number(params.find(p => p.trim().startsWith('q='))?.split('=')[1] ?? 1);
      return { tag, q: Number.isFinite(q) ? q : 0, i };
    })
    .filter(x => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) {
    const m = match(tag);
    if (m) return m;
  }
  return 'en';
}
export function match(tag) {
  if (!tag || typeof tag !== 'string') return null;
  const t = tag.toLowerCase();
  if (t.startsWith('zh')) return 'zh-CN';
  return LANGS.find(l => l.toLowerCase() === t || l.toLowerCase() === t.split('-')[0]) ?? null;
}
export function t(lang, key, vars = {}) {
  const s = S[lang]?.[key] ?? S.en[key];
  if (s === undefined) throw new Error('Missing i18n key: ' + key);
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
export const STRINGS = S;
