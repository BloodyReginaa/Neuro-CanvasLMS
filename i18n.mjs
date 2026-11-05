// UI strings for the connector's own web pages (home, authorize, errors).
// To add a language: copy the `en` block, translate every key, add it to LANGS.
// {placeholders} are filled in by t(). Keep HTML out of translations.

export const LANGS = ['en', 'zh-CN', 'es', 'ja', 'hi'];
export const LANG_NAMES = { en: 'English', 'zh-CN': '简体中文', es: 'Español', ja: '日本語', hi: 'हिन्दी' };

const S = {
  en: {
    product: 'Canvas AI Connector',
    tagline: 'Your Canvas, readable by your own AI assistant.',
    home_lead: 'A private, read-only bridge between your Canvas account and Claude or ChatGPT. Ask about deadlines, grades, lecture files and announcements in plain language.',
    status_bound: 'Connected to its owner',
    status_unbound: 'Waiting for its owner — the first Canvas account to authorize will own this connector',
    home_add_title: 'Add it to your assistant',
    home_add_body: 'In Claude or ChatGPT, add a custom connector with this address:',
    home_safe: 'Read-only. It never submits work, sends messages or changes anything in Canvas.',
    canvas_site: 'Canvas site',
    auth_title: 'Connect your {school} Canvas',
    auth_lead: 'Let your own AI assistant read what you can already see in Canvas.',
    read_only: 'Read-only',
    scopes_title: 'What it can read',
    scopes: 'Courses & modules|Files & lecture notes|Assignments & submissions|Grades & feedback|Inbox|Discussions|Calendar & to-dos|Groups|Quiz history|Profile & notification settings',
    returning_to: 'After authorizing you will return to',
    token_label: 'Canvas access token',
    token_placeholder: 'Paste your token here',
    token_how: 'Create one in Canvas: Account → Settings → New Access Token. Copy it right away — Canvas shows it only once.',
    token_privacy: 'The token goes only to this Worker (which you deployed) and to Canvas, then is stored encrypted inside the authorization. Your school may limit tokens to 30 days; when it expires, reconnect with a new one.',
    consent: 'I allow this AI assistant to read the Canvas data listed above.',
    submit: 'Authorize',
    fail_title: 'Could not verify the token',
    fail_hint: 'Check that the token was copied completely and has not expired, then go back and try again.',
    back: 'Go back',
    owner_title: 'This connector belongs to someone else',
    owner_body: 'It is already bound to a different Canvas account. Deploy your own copy to use it.',
    client_title: 'Unsupported app',
    client_body: 'Only Claude, ChatGPT and local AI clients can connect to this connector.',
    footer: 'Open source · read-only · runs on your own Cloudflare account',
    language: 'Language',
  },
  'zh-CN': {
    product: 'Canvas AI 连接器',
    tagline: '让你自己的 AI 助手读懂你的 Canvas。',
    home_lead: '在你的 Canvas 账号与 Claude 或 ChatGPT 之间建立一条私人的只读通道。用日常语言询问截止日期、成绩、讲义文件和课程公告。',
    status_bound: '已绑定所有者',
    status_unbound: '等待绑定——第一个完成授权的 Canvas 账号将成为此连接器的所有者',
    home_add_title: '添加到你的 AI 助手',
    home_add_body: '在 Claude 或 ChatGPT 中添加自定义连接器，地址填写：',
    home_safe: '只读。不会提交作业、发送消息，也不会修改 Canvas 中的任何内容。',
    canvas_site: 'Canvas 站点',
    auth_title: '连接你的 {school} Canvas',
    auth_lead: '让你自己的 AI 助手读取你在 Canvas 中本来就能看到的内容。',
    read_only: '只读',
    scopes_title: '可读取的内容',
    scopes: '课程与模块|文件与讲义|作业与提交记录|成绩与评语|站内信|讨论区|日历与待办|小组|测验记录|个人资料与通知设置',
    returning_to: '授权后将返回',
    token_label: 'Canvas 访问令牌',
    token_placeholder: '在此粘贴令牌',
    token_how: '在 Canvas 中创建：账户 → 设置 → 新建访问许可证。请立即复制——Canvas 只显示一次。',
    token_privacy: '令牌只会发送到这个由你自己部署的 Worker 和 Canvas，并加密保存在授权记录中。学校可能限制令牌最长 30 天有效，过期后用新令牌重新连接即可。',
    consent: '我允许该 AI 助手读取上面列出的 Canvas 信息。',
    submit: '授权',
    fail_title: '令牌验证失败',
    fail_hint: '请确认令牌已完整复制且未过期，然后返回重试。',
    back: '返回',
    owner_title: '此连接器属于其他人',
    owner_body: '它已绑定到另一个 Canvas 账号。如需使用，请部署你自己的副本。',
    client_title: '不支持的应用',
    client_body: '只有 Claude、ChatGPT 和本地 AI 客户端可以连接此连接器。',
    footer: '开源 · 只读 · 运行在你自己的 Cloudflare 账号上',
    language: '语言',
  },
  es: {
    product: 'Conector de IA para Canvas',
    tagline: 'Tu Canvas, al alcance de tu propio asistente de IA.',
    home_lead: 'Un puente privado y de solo lectura entre tu cuenta de Canvas y Claude o ChatGPT. Pregunta por fechas de entrega, calificaciones, apuntes y anuncios en lenguaje natural.',
    status_bound: 'Vinculado a su propietario',
    status_unbound: 'Esperando a su propietario: la primera cuenta de Canvas que autorice será la propietaria',
    home_add_title: 'Añádelo a tu asistente',
    home_add_body: 'En Claude o ChatGPT, añade un conector personalizado con esta dirección:',
    home_safe: 'Solo lectura. Nunca entrega tareas, envía mensajes ni modifica nada en Canvas.',
    canvas_site: 'Sitio de Canvas',
    auth_title: 'Conecta tu Canvas de {school}',
    auth_lead: 'Permite que tu propio asistente de IA lea lo que ya puedes ver en Canvas.',
    read_only: 'Solo lectura',
    scopes_title: 'Qué puede leer',
    scopes: 'Cursos y módulos|Archivos y apuntes|Tareas y entregas|Calificaciones y comentarios|Bandeja de entrada|Foros de discusión|Calendario y pendientes|Grupos|Historial de exámenes|Perfil y notificaciones',
    returning_to: 'Tras autorizar volverás a',
    token_label: 'Token de acceso de Canvas',
    token_placeholder: 'Pega tu token aquí',
    token_how: 'Créalo en Canvas: Cuenta → Configuración → Nuevo token de acceso. Cópialo enseguida: Canvas solo lo muestra una vez.',
    token_privacy: 'El token solo se envía a este Worker (que tú desplegaste) y a Canvas, y se guarda cifrado dentro de la autorización. Tu universidad puede limitar los tokens a 30 días; cuando caduque, vuelve a conectar con uno nuevo.',
    consent: 'Permito que este asistente de IA lea los datos de Canvas indicados arriba.',
    submit: 'Autorizar',
    fail_title: 'No se pudo verificar el token',
    fail_hint: 'Comprueba que lo copiaste completo y que no ha caducado; luego vuelve e inténtalo de nuevo.',
    back: 'Volver',
    owner_title: 'Este conector pertenece a otra persona',
    owner_body: 'Ya está vinculado a otra cuenta de Canvas. Despliega tu propia copia para usarlo.',
    client_title: 'Aplicación no compatible',
    client_body: 'Solo Claude, ChatGPT y clientes de IA locales pueden conectarse.',
    footer: 'Código abierto · solo lectura · en tu propia cuenta de Cloudflare',
    language: 'Idioma',
  },
  ja: {
    product: 'Canvas AI コネクタ',
    tagline: 'あなたの Canvas を、あなた自身の AI アシスタントに。',
    home_lead: 'Canvas アカウントと Claude / ChatGPT をつなぐ、個人用の読み取り専用ブリッジです。締め切り、成績、講義資料、お知らせを普段の言葉で質問できます。',
    status_bound: '所有者と連携済み',
    status_unbound: '所有者を待っています — 最初に認可した Canvas アカウントが所有者になります',
    home_add_title: 'アシスタントに追加する',
    home_add_body: 'Claude または ChatGPT で、次のアドレスをカスタムコネクタとして追加してください：',
    home_safe: '読み取り専用です。課題の提出、メッセージ送信、Canvas 上の変更は一切行いません。',
    canvas_site: 'Canvas サイト',
    auth_title: '{school} の Canvas を接続',
    auth_lead: 'Canvas であなたがすでに閲覧できる内容を、あなた自身の AI アシスタントが読めるようにします。',
    read_only: '読み取り専用',
    scopes_title: '読み取れる内容',
    scopes: 'コースとモジュール|ファイルと講義ノート|課題と提出物|成績とフィードバック|受信トレイ|ディスカッション|カレンダーと To Do|グループ|小テスト履歴|プロフィールと通知設定',
    returning_to: '認可後の戻り先',
    token_label: 'Canvas アクセストークン',
    token_placeholder: 'ここにトークンを貼り付け',
    token_how: 'Canvas で作成：アカウント → 設定 → 新しいアクセストークン。表示は一度きりなので、すぐにコピーしてください。',
    token_privacy: 'トークンはあなたがデプロイしたこの Worker と Canvas にのみ送信され、認可情報の中に暗号化して保存されます。学校によっては有効期限が最長 30 日です。期限切れの際は新しいトークンで再接続してください。',
    consent: '上記の Canvas データをこの AI アシスタントが読み取ることを許可します。',
    submit: '認可する',
    fail_title: 'トークンを確認できませんでした',
    fail_hint: 'トークンが最後までコピーされているか、期限切れでないかを確認して、もう一度お試しください。',
    back: '戻る',
    owner_title: 'このコネクタは別の人のものです',
    owner_body: 'すでに別の Canvas アカウントに紐づいています。利用するにはご自身でデプロイしてください。',
    client_title: '対応していないアプリです',
    client_body: '接続できるのは Claude、ChatGPT、ローカルの AI クライアントのみです。',
    footer: 'オープンソース · 読み取り専用 · あなたの Cloudflare アカウントで動作',
    language: '言語',
  },
  hi: {
    product: 'Canvas AI कनेक्टर',
    tagline: 'आपका Canvas, आपके अपने AI सहायक के लिए।',
    home_lead: 'आपके Canvas खाते और Claude या ChatGPT के बीच एक निजी, केवल-पढ़ने वाला पुल। समय-सीमा, ग्रेड, लेक्चर फ़ाइलों और घोषणाओं के बारे में सामान्य भाषा में पूछें।',
    status_bound: 'अपने स्वामी से जुड़ा हुआ',
    status_unbound: 'स्वामी की प्रतीक्षा — सबसे पहले अधिकृत करने वाला Canvas खाता इसका स्वामी होगा',
    home_add_title: 'इसे अपने सहायक में जोड़ें',
    home_add_body: 'Claude या ChatGPT में इस पते के साथ एक कस्टम कनेक्टर जोड़ें:',
    home_safe: 'केवल पढ़ने के लिए। यह कभी असाइनमेंट जमा नहीं करता, संदेश नहीं भेजता और Canvas में कुछ नहीं बदलता।',
    canvas_site: 'Canvas साइट',
    auth_title: 'अपना {school} Canvas जोड़ें',
    auth_lead: 'Canvas में जो आप पहले से देख सकते हैं, उसे अपने AI सहायक को पढ़ने दें।',
    read_only: 'केवल पढ़ना',
    scopes_title: 'यह क्या पढ़ सकता है',
    scopes: 'कोर्स और मॉड्यूल|फ़ाइलें और लेक्चर नोट्स|असाइनमेंट और सबमिशन|ग्रेड और फ़ीडबैक|इनबॉक्स|चर्चाएँ|कैलेंडर और टू-डू|समूह|क्विज़ इतिहास|प्रोफ़ाइल और सूचना सेटिंग्स',
    returning_to: 'अधिकृत करने के बाद आप यहाँ लौटेंगे',
    token_label: 'Canvas एक्सेस टोकन',
    token_placeholder: 'अपना टोकन यहाँ चिपकाएँ',
    token_how: 'Canvas में बनाएँ: Account → Settings → New Access Token. तुरंत कॉपी करें — Canvas इसे केवल एक बार दिखाता है।',
    token_privacy: 'टोकन केवल इस Worker (जिसे आपने डिप्लॉय किया है) और Canvas को भेजा जाता है, फिर प्राधिकरण के अंदर एन्क्रिप्ट करके रखा जाता है। आपका संस्थान टोकन को 30 दिनों तक सीमित कर सकता है; समाप्त होने पर नए टोकन से फिर से जोड़ें।',
    consent: 'मैं इस AI सहायक को ऊपर बताए गए Canvas डेटा को पढ़ने की अनुमति देता/देती हूँ।',
    submit: 'अधिकृत करें',
    fail_title: 'टोकन सत्यापित नहीं हो सका',
    fail_hint: 'जाँचें कि टोकन पूरा कॉपी हुआ है और उसकी अवधि समाप्त नहीं हुई है, फिर वापस जाकर दोबारा कोशिश करें।',
    back: 'वापस जाएँ',
    owner_title: 'यह कनेक्टर किसी और का है',
    owner_body: 'यह पहले से किसी दूसरे Canvas खाते से जुड़ा है। इसे इस्तेमाल करने के लिए अपनी खुद की कॉपी डिप्लॉय करें।',
    client_title: 'असमर्थित ऐप',
    client_body: 'केवल Claude, ChatGPT और लोकल AI क्लाइंट ही इस कनेक्टर से जुड़ सकते हैं।',
    footer: 'ओपन सोर्स · केवल पढ़ना · आपके अपने Cloudflare खाते पर चलता है',
    language: 'भाषा',
  },
};

// ?lang= wins, then the browser's Accept-Language (with q-weights), then English.
export function pickLang(request) {
  const url = new URL(request.url);
  const fromQuery = match(url.searchParams.get('lang'));
  if (fromQuery) return fromQuery;
  const header = request.headers.get('accept-language') ?? '';
  const ranked = header.split(',').map((part, i) => {
    const [tag, ...params] = part.trim().split(';');
    const q = Number(params.find(p => p.trim().startsWith('q='))?.split('=')[1] ?? 1);
    return { tag, q: Number.isFinite(q) ? q : 0, i };
  }).filter(x => x.tag && x.q > 0).sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) { const m = match(tag); if (m) return m; }
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
