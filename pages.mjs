// HTML for the connector's own pages. No JavaScript (CSP forbids it); pure CSS.
import { LANGS, LANG_NAMES, t } from './i18n.mjs';
import { ACCENT_COLOR, CANVAS_HOST, SCHOOL_NAME } from './config.mjs';

export const esc = s =>
  String(s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const accent = /^#[0-9a-f]{6}$/i.test(ACCENT_COLOR) ? ACCENT_COLOR : '#4f5bd5';
const school = { school: SCHOOL_NAME };

const icon = {
  mark: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--accent)"/><path d="M9 10.5c2.6-.9 5-.6 7 1v11c-2-1.6-4.4-1.9-7-1v-11Zm14 0c-2.6-.9-5-.6-7 1v11c2-1.6 4.4-1.9 7-1v-11Z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  globe:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5s1.2-6.1 3.6-8.5Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  alert:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5v5.5M12 16.2v.3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const CSS = `
:root{--accent:${accent};--bg:#f5f6fa;--card:#fff;--ink:#141a2a;--muted:#5d6577;--line:#e6e8ef;--soft:color-mix(in srgb,var(--accent) 8%,#fff);--ok:#1f9d61;--warn:#c27c0e;--bad:#c2410c;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#0e1118;--card:#161a24;--ink:#e9ecf3;--muted:#9aa3b5;--line:#262c3a;--soft:color-mix(in srgb,var(--accent) 16%,#161a24)}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;background:radial-gradient(1200px 500px at 50% -10%,color-mix(in srgb,var(--accent) 14%,transparent),transparent 70%),var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI","PingFang SC","Hiragino Sans","Noto Sans Devanagari","Noto Sans CJK SC","Noto Sans JP",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:600px;margin:0 auto;padding:28px 20px 48px}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
.brand{display:flex;align-items:center;gap:10px;font-weight:650;letter-spacing:-.01em}
.brand svg{width:30px;height:30px;flex:none}
.brand span{display:flex;flex-direction:column;line-height:1.2}
.brand small{font-weight:500;font-size:12.5px;color:var(--muted)}
details.lang{position:relative}
details.lang summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--muted);font-size:14px}
details.lang summary::-webkit-details-marker{display:none}
details.lang summary svg{width:16px;height:16px}
details.lang[open] summary{color:var(--ink)}
.menu{position:absolute;right:0;top:calc(100% + 6px);min-width:150px;padding:6px;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 32px rgba(15,20,40,.12);z-index:2}
.menu a{display:block;padding:8px 12px;border-radius:9px;color:var(--ink);text-decoration:none;font-size:14px}
.menu a:hover{background:var(--soft)}
.menu a[aria-current]{color:var(--accent);font-weight:600}
.card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:34px 32px;box-shadow:0 1px 2px rgba(15,20,40,.04),0 18px 48px -24px rgba(15,20,40,.18)}
h1{font-size:28px;line-height:1.25;letter-spacing:-.02em;margin:0 0 10px}
.lead{color:var(--muted);margin:0 0 22px;font-size:16.5px}
.pill{display:inline-flex;align-items:flex-start;gap:9px;padding:8px 14px;border-radius:14px;line-height:1.45;font-size:13.5px;background:var(--soft);color:var(--ink)}
.dot{flex:none;margin-top:6px;width:8px;height:8px;border-radius:50%;background:var(--warn);box-shadow:0 0 0 3px color-mix(in srgb,var(--warn) 22%,transparent)}
.dot.ok{background:var(--ok);box-shadow:0 0 0 3px color-mix(in srgb,var(--ok) 22%,transparent)}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--accent);background:var(--soft);padding:4px 10px;border-radius:999px;margin-bottom:14px}
.badge svg{width:15px;height:15px}
.row{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid var(--line);font-size:14.5px}
.row span:first-child{color:var(--muted)}
.row span:last-child{text-align:right;word-break:break-all}
h2{font-size:15px;margin:26px 0 10px;letter-spacing:-.005em}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.chips li{display:flex;align-items:center;gap:6px;font-size:13.5px;padding:6px 11px;border:1px solid var(--line);border-radius:10px}
.chips svg{width:14px;height:14px;color:var(--ok)}
.code{display:block;margin:8px 0 0;padding:12px 14px;border-radius:12px;background:var(--soft);font:14px/1.5 ui-monospace,"SF Mono",Menlo,Consolas,monospace;word-break:break-all;user-select:all}
.note{display:flex;gap:10px;align-items:flex-start;margin-top:22px;padding:14px 16px;border-radius:14px;background:var(--soft);color:var(--muted);font-size:14px}
.note svg{flex:none;width:20px;height:20px;margin-top:1px;color:var(--accent)}
form{margin-top:26px}
label.field{display:block;font-weight:600;font-size:14.5px}
input[type=password]{display:block;width:100%;margin:8px 0 6px;padding:13px 14px;font:inherit;color:var(--ink);background:var(--card);border:1.5px solid var(--line);border-radius:12px;outline:none;transition:border-color .15s,box-shadow .15s}
input[type=password]:focus{border-color:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 18%,transparent)}
.help{color:var(--muted);font-size:13.5px;margin:0}
.consent{display:flex;gap:10px;align-items:flex-start;margin:20px 0;font-size:14.5px;cursor:pointer}
.consent input{width:18px;height:18px;margin-top:3px;accent-color:var(--accent);flex:none}
button,.btn{display:inline-flex;justify-content:center;align-items:center;width:100%;padding:14px 20px;font:inherit;font-weight:600;color:#fff;background:var(--accent);border:0;border-radius:12px;cursor:pointer;text-decoration:none;transition:filter .15s,transform .05s}
button:hover,.btn:hover{filter:brightness(1.08)}
button:active{transform:translateY(1px)}
.state{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--bad) 12%,transparent);color:var(--bad);margin-bottom:16px}
.state svg{width:24px;height:24px}
.detail{font:13px/1.5 ui-monospace,Menlo,monospace;color:var(--muted);background:var(--soft);padding:10px 12px;border-radius:10px;word-break:break-word}
footer{text-align:center;color:var(--muted);font-size:13px;margin-top:22px}
@media (max-width:520px){.card{padding:26px 20px;border-radius:18px}h1{font-size:24px}}
`;

function langSwitcher(lang, url) {
  const links = LANGS.map(l => {
    const u = new URL(url);
    u.searchParams.set('lang', l);
    return `<a href="${esc(u.pathname + u.search)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${esc(LANG_NAMES[l])}</a>`;
  }).join('');
  return `<details class="lang"><summary aria-label="${esc(t(lang, 'language'))}">${icon.globe}${esc(LANG_NAMES[lang])}</summary><nav class="menu">${links}</nav></details>`;
}

export function layout(lang, url, title, body) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · ${esc(t(lang, 'product'))}</title><style>${CSS}</style></head><body><div class="wrap"><header class="top"><div class="brand">${icon.mark}<span>${esc(t(lang, 'product'))}${SCHOOL_NAME ? `<small>${esc(SCHOOL_NAME)}</small>` : ''}</span></div>${langSwitcher(lang, url)}</header><main class="card">${body}</main><footer>${esc(t(lang, 'footer'))}</footer></div></body></html>`;
}

export function homePage(lang, url, { bound, version, update }) {
  const origin = new URL(url).origin;
  const updateLine =
    update?.state === 'available' && update.latest
      ? `${t(lang, 'update_available', { version: update.latest })} ${t(lang, 'update_ask')}`
      : update?.state === 'waiting' && update.latest
        ? t(lang, 'update_waiting', { version: update.latest })
        : update?.state === 'rolled_back'
          ? t(lang, 'update_rolled_back')
          : update?.state === 'manual_required'
            ? t(lang, 'update_manual')
            : '';
  return layout(
    lang,
    url,
    t(lang, 'product'),
    `
<h1>${esc(t(lang, 'tagline'))}</h1>
<p class="lead">${esc(t(lang, 'home_lead'))}</p>
<span class="pill"><span class="dot${bound ? ' ok' : ''}"></span>${esc(t(lang, bound ? 'status_bound' : 'status_unbound'))}</span>
<h2>${esc(t(lang, 'home_add_title'))}</h2>
<p class="help">${esc(t(lang, 'home_add_body'))}</p>
<code class="code">${esc(origin)}/mcp</code>
<div class="row" style="margin-top:22px"><span>${esc(t(lang, 'canvas_site'))}</span><span>${esc(CANVAS_HOST)}</span></div>
${version ? `<div class="row"><span>${esc(t(lang, 'version_label'))}</span><span>${esc(version)}</span></div>` : ''}
${updateLine ? `<div class="note">${icon.alert}<span>${esc(updateLine)}</span></div>` : ''}
<div class="note">${icon.shield}<span>${esc(t(lang, 'home_safe'))}</span></div>`,
  );
}

export function authorizePage(lang, url, { csrf, returnTo }) {
  const chips = t(lang, 'scopes')
    .split('|')
    .map(s => `<li>${icon.check}${esc(s)}</li>`)
    .join('');
  return layout(
    lang,
    url,
    t(lang, 'auth_title', school),
    `
<span class="badge">${icon.shield}${esc(t(lang, 'read_only'))}</span>
<h1>${esc(t(lang, 'auth_title', school))}</h1>
<p class="lead">${esc(t(lang, 'auth_lead'))}</p>
<h2>${esc(t(lang, 'scopes_title'))}</h2>
<ul class="chips">${chips}</ul>
<div class="row" style="margin-top:22px"><span>${esc(t(lang, 'canvas_site'))}</span><span>${esc(CANVAS_HOST)}</span></div>
<div class="row"><span>${esc(t(lang, 'returning_to'))}</span><span>${esc(returnTo)}</span></div>
<form method="post">
<input type="hidden" name="csrf" value="${esc(csrf)}">
<label class="field" for="token">${esc(t(lang, 'token_label'))}</label>
<input type="password" id="token" name="token" required autocomplete="off" spellcheck="false" maxlength="512" placeholder="${esc(t(lang, 'token_placeholder'))}">
<p class="help">${esc(t(lang, 'token_how'))}</p>
<div class="note">${icon.lock}<span>${esc(t(lang, 'token_privacy'))}</span></div>
<label class="consent"><input type="checkbox" name="consent" value="yes" required><span>${esc(t(lang, 'consent'))}</span></label>
<button type="submit">${esc(t(lang, 'submit'))}</button>
</form>`,
  );
}

export function messagePage(lang, url, { titleKey, bodyKey, detail, backHref }) {
  return layout(
    lang,
    url,
    t(lang, titleKey),
    `
<div class="state">${icon.alert}</div>
<h1>${esc(t(lang, titleKey))}</h1>
<p class="lead">${esc(t(lang, bodyKey))}</p>
${detail ? `<p class="detail">${esc(detail)}</p>` : ''}
${backHref ? `<a class="btn" href="${esc(backHref)}">${esc(t(lang, 'back'))}</a>` : ''}`,
  );
}
