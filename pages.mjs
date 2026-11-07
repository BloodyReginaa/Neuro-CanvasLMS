// HTML for the connector's own pages. One script runs on them, ours (page-scene.mjs, allowed by its
// hash in the CSP): the black-hole scene and the step-by-step authorization. Everything here also
// works without it: then all steps show at once, over a CSS picture of the black hole.
import { LANGS, LANG_NAMES, t } from './i18n.mjs';
import { ACCENT_COLOR, CANVAS_HOST, SCHOOL_NAME } from './config.mjs';
import { KNOWLEDGE, SCENE_JS } from './page-scene.mjs';

export const esc = s =>
  String(s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
// Read at render time: the school settings come from the Worker's vars (config.mjs).
const accent = () => (/^#[0-9a-f]{6}$/i.test(ACCENT_COLOR) ? ACCENT_COLOR : '#4f5bd5');
// Without a school name (it is optional) the title has its own wording: some languages can't just
// leave a gap where the name goes.
const authTitle = lang =>
  SCHOOL_NAME ? t(lang, 'auth_title', { school: SCHOOL_NAME }) : t(lang, 'auth_title_plain');

const icon = {
  alert:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 7.5v5.5M12 16.2v.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

const css = () => `
:root{--accent:${accent()};--gold:#e6c88f;--ink:#f6eedf;--text:#d6ccbb;--muted:#8d8473;--line:rgba(231,201,143,.3);--ok:#a6dcb2;--warn:#e9b86a;--bad:#ff9f80;--serif:"Iowan Old Style","Palatino Linotype",Palatino,"Times New Roman","Songti SC","Noto Serif CJK SC","Hiragino Mincho ProN","Noto Serif Devanagari",serif;--bx:66%;--by:44%;color-scheme:dark}
::selection{background:color-mix(in srgb,var(--accent) 60%,transparent);color:#fff}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;background:#040302}
body{margin:0;min-height:100vh;background:#040302;color:var(--text);font:15px/1.65 system-ui,-apple-system,"Segoe UI","PingFang SC","Hiragino Sans","Noto Sans Devanagari","Noto Sans CJK SC","Noto Sans JP",sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:var(--gold)}
.sky{position:fixed;inset:0;z-index:0;background:radial-gradient(circle at var(--bx) var(--by),#000 0 8vmin,rgba(255,246,228,.95) 8.4vmin,rgba(236,198,132,.45) 9.6vmin,rgba(160,112,58,.12) 15vmin,transparent 26vmin),radial-gradient(ellipse 56vmin 4vmin at var(--bx) var(--by),rgba(236,196,128,.35),transparent 72%),#040302}
canvas.scene{position:fixed;inset:0;z-index:1;width:100%;height:100%;display:block;touch-action:none}
.no-gl canvas.scene{display:none}
.ui{position:relative;z-index:2;min-height:100vh;display:flex;flex-direction:column;opacity:0;animation:reveal .5s 1.2s forwards;pointer-events:none}
.ui::after{content:"";position:fixed;left:0;right:0;bottom:0;height:60vh;z-index:-1;background:linear-gradient(to top,rgba(4,3,2,.97),rgba(4,3,2,.82) 40%,rgba(4,3,2,.35) 72%,transparent);pointer-events:none}
.ready .ui{opacity:1;animation:none}
@keyframes reveal{to{opacity:1}}
.top,.foot,.main a,.main button,.main input,.main label,.main code,details{pointer-events:auto}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px clamp(18px,3vw,42px);font-size:11.5px;letter-spacing:.24em;text-transform:uppercase}
.brand{color:var(--ink)}
.brand small{font-size:inherit;color:var(--muted)}
.brand small::before{content:" · "}
.steps{display:none;gap:clamp(12px,2.4vw,30px);margin:0;padding:0;list-style:none;color:var(--muted);white-space:nowrap}
.steps li{transition:color .8s}
.steps li::before{content:"( "}
.steps li::after{content:" )"}
.steps li.done{color:var(--text)}
.steps li.now{color:var(--gold)}
details.lang{position:relative}
details.lang summary{list-style:none;cursor:pointer;color:var(--text)}
details.lang summary::-webkit-details-marker{display:none}
details.lang summary::after{content:" ↓";color:var(--muted)}
.menu{position:absolute;right:0;top:calc(100% + 10px);padding:6px 0;background:rgba(8,6,4,.94);border-radius:10px;z-index:5;letter-spacing:.06em;text-transform:none}
.menu a{display:block;padding:7px 18px;color:var(--text);text-decoration:none;font-size:13.5px;white-space:nowrap}
.menu a:hover,.menu a[aria-current]{color:var(--gold)}
.main{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:34px;width:100%;max-width:560px;margin-left:clamp(0px,6vw,110px);padding:24px clamp(18px,3vw,24px) 8vh}
.card{text-shadow:0 1px 16px #000}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(30px,3.6vw,46px);line-height:1.12;letter-spacing:-.005em;margin:8px 0 12px;color:var(--ink)}
h2{font-family:var(--serif);font-weight:400;font-size:20px;line-height:1.3;margin:22px 0 8px;color:var(--ink)}
.lead{margin:0 0 14px;font-size:15.5px}
.badge,.site,.kicker{margin:0;color:var(--gold);font-size:11.5px;letter-spacing:.24em;text-transform:uppercase}
.site{color:var(--muted)}
.status{display:inline-flex;align-items:center;gap:9px;font-size:13px;color:var(--text)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--warn);box-shadow:0 0 12px var(--warn)}
.dot.ok{background:var(--ok);box-shadow:0 0 12px var(--ok)}
.row{display:flex;gap:12px;font-size:13px;margin-top:4px}
.row span:first-child{color:var(--muted)}
.row span:last-child{color:var(--ink);word-break:break-all}
.rows{margin-top:14px}
.chips{display:flex;flex-wrap:wrap;justify-content:inherit;gap:3px 20px;margin:0;padding:0;list-style:none;font-size:13.5px;color:var(--text)}
.code{display:inline-block;margin-top:4px;padding:4px 0;color:var(--gold);border-bottom:1px solid var(--line);font:15px/1.5 ui-monospace,"SF Mono",Menlo,Consolas,monospace;word-break:break-all;user-select:all}
.note{margin:16px 0 0;color:var(--muted);font-size:12.5px}
label.field{display:block;font-family:var(--serif);font-size:26px;line-height:1.25;color:var(--ink)}
.help{margin:6px 0 0;color:var(--muted);font-size:13.5px}
.open{display:inline-block;margin-top:8px;font-size:13px;letter-spacing:.06em;text-decoration:none;border-bottom:1px solid var(--line)}
.open:hover{border-color:var(--gold)}
input[type=password]{display:block;width:100%;margin:18px 0 6px;padding:10px 2px;font:17px/1.4 ui-monospace,"SF Mono",Menlo,Consolas,monospace;letter-spacing:.06em;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--line);border-radius:0;outline:none;transition:border-color .3s,box-shadow .4s}
input[type=password]::placeholder{color:#6d6556;font-family:system-ui,sans-serif;letter-spacing:.04em}
input[type=password]:focus{border-color:var(--gold);box-shadow:0 14px 24px -18px rgba(231,190,110,.9)}
input[type=password].good{border-color:var(--ok);box-shadow:0 14px 24px -18px rgba(166,220,178,.9)}
.got{display:none;margin:0;color:var(--ok);font-size:12px;letter-spacing:.2em;text-transform:uppercase}
.got.on{display:block}
.consent{display:flex;gap:12px;align-items:flex-start;margin:16px 0 0;font-size:15px;color:var(--ink);cursor:pointer;text-align:left}
.consent input{width:18px;height:18px;margin-top:3px;accent-color:#d9b46e;flex:none}
button,.btn{appearance:none;display:inline-block;margin:0;padding:10px 2px;font:inherit;font-size:12.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold);background:none;border:0;cursor:pointer;text-decoration:none;transition:color .3s,opacity .4s,text-shadow .3s}
button::before,.btn::before{content:"( "}
button::after,.btn::after{content:" )"}
button:hover,.btn:hover{color:var(--ink);text-shadow:0 0 16px rgba(231,190,110,.8)}
button:disabled{opacity:.3;cursor:default;text-shadow:none;color:var(--gold)}
button.ghost{color:var(--muted)}
.go{display:block;width:100%;margin:18px 0 0;font-family:var(--serif);font-size:34px;letter-spacing:.18em;text-transform:none;color:var(--ink);text-shadow:0 0 24px rgba(231,190,110,.55)}
.go::before,.go::after{content:none}
.go:hover{text-shadow:0 0 34px rgba(255,220,160,.95)}
.nav{display:none;justify-content:space-between;gap:16px;margin-top:14px}
.nav button:only-child{margin:0 auto}
[data-stage=token] .nav button:only-child{margin:0 0 0 auto}
.state{color:var(--bad);margin-bottom:6px}
.state svg{width:30px;height:30px}
.detail{margin:0;font:12.5px/1.5 ui-monospace,Menlo,monospace;color:var(--muted);word-break:break-word}
.foot{display:flex;justify-content:space-between;gap:16px;padding:18px clamp(18px,3vw,42px);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
.flow-only,.thanks,.skip,.ticker{display:none}
@media (max-width:759px),(max-aspect-ratio:1/1){:root{--bx:50%;--by:24%}.main{margin:0 auto;padding-top:42vh}.top{letter-spacing:.16em}}

/* the step-by-step authorization (the script adds .flow) */
.flow body{overflow:hidden}
.flow .top{position:fixed;top:0;left:0;right:0;z-index:4}
.flow .steps{display:flex}
.flow .foot{position:fixed;left:0;right:0;bottom:0;z-index:3}
.flow .main{position:fixed;inset:0;margin:0;max-width:none;padding:0}
.flow .flow-only{display:block}
.flow .chips.flow-only{display:flex}
.flow .no-flow,.flow .intro .badge,.flow .intro .lead,.flow .intro .site,.flow .intro h2,.flow .intro .chips,.flow .intro .rows{display:none}
.flow .nav{display:flex}
.flow [data-stage]{visibility:hidden;opacity:0;filter:blur(6px);transform:translateY(12px);transition:opacity .7s ease,filter .7s ease,transform .9s cubic-bezier(.2,.7,.2,1),visibility 0s .9s}
.flow [data-stage].on{visibility:visible;opacity:1;filter:none;transform:none;transition:opacity 1.2s ease .5s,filter 1.2s ease .5s,transform 1.4s cubic-bezier(.2,.7,.2,1) .45s,visibility 0s}
.flow .intro.on{transition-delay:1.4s}
.flow .intro,.flow .connect{position:fixed;left:0;right:0;bottom:clamp(60px,11vh,120px);width:min(560px,calc(100% - 40px));margin:0 auto;text-align:center}
.flow .intro{pointer-events:none}
.flow .intro h1{font-size:clamp(36px,5.4vw,74px);line-height:1.05;margin:0;background:linear-gradient(180deg,#fff8ea 15%,#e6c88f 70%,#a98550);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none}
.flow .ticker{display:block;min-height:1.6em;margin:18px 0 0;color:var(--gold);font-size:12.5px;letter-spacing:.32em;text-transform:uppercase}
.ticker.tick{animation:tick .44s ease both}
.ticker.rest{animation:rest .9s ease both}
@keyframes tick{0%{opacity:0;filter:blur(4px)}30%,70%{opacity:1;filter:none}100%{opacity:0;filter:blur(3px)}}
@keyframes rest{from{opacity:0}to{opacity:1}}
.flow .connect{display:grid}
.flow .connect>section{grid-area:1/1;align-self:end}
.flow .connect>section.on{pointer-events:auto}
.flow .connect .chips{justify-content:center;color:var(--muted);font-size:12.5px}
.flow .consent{justify-content:center;text-align:left}
.flow input[type=password]{text-align:center}
.flow .dest{margin:6px 0 0;color:var(--muted);font-size:11.5px;letter-spacing:.06em;word-break:break-all}
.flow .thanks{display:block;position:fixed;left:0;right:0;bottom:clamp(70px,13vh,140px);text-align:center;pointer-events:none;padding:0 20px}
.thanks h2{font-size:clamp(46px,7vw,96px);line-height:1;margin:0 0 18px;color:var(--ink);text-shadow:0 0 50px rgba(255,220,160,.6)}
.thanks p{margin:0;color:var(--gold);font-size:12px;letter-spacing:.3em;text-transform:uppercase}
.flow .skip{display:inline-block;position:fixed;z-index:4;right:clamp(18px,3vw,42px);bottom:clamp(46px,7vh,70px);color:var(--muted);opacity:0;visibility:hidden;transition:opacity .6s,visibility 0s .6s}
.flow .skip.on{opacity:1;visibility:visible;transition:opacity .8s 2s,visibility 0s}
@media (max-width:759px),(max-aspect-ratio:1/1){
.ui::after{height:66vh}
.flow .steps li span{display:none}
.flow .foot{display:none}
.flow .intro,.flow .connect{bottom:max(26px,env(safe-area-inset-bottom))}
.flow .skip{bottom:auto;top:58px}
label.field{font-size:22px}
}
@media (max-width:420px){.steps{display:none!important}}
@media (prefers-reduced-motion:reduce){.flow [data-stage],.flow [data-stage].on{filter:none;transition:opacity .3s,visibility 0s}}
`;

function langSwitcher(lang, url) {
  const links = LANGS.map(l => {
    const u = new URL(url);
    u.searchParams.set('lang', l);
    return `<a href="${esc(u.pathname + u.search)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${esc(LANG_NAMES[l])}</a>`;
  }).join('');
  return `<details class="lang"><summary aria-label="${esc(t(lang, 'language'))}">${esc(LANG_NAMES[lang])}</summary><nav class="menu">${links}</nav></details>`;
}

// The data the scene reads: the knowledge that orbits in, plus this language's subject names and
// Canvas areas. JSON inside <script type="application/json"> is never run; "<" is escaped so the
// text cannot close the tag.
const sceneData = (lang, mode) =>
  JSON.stringify({
    mode,
    knowledge: KNOWLEDGE,
    local: [...t(lang, 'subjects').split('|'), ...t(lang, 'scopes').split('|')],
  }).replace(/</g, '\\u003c');

export function layout(lang, url, title, body, { mode = 'idle', steps = '' } = {}) {
  const product = t(lang, 'product');
  const tabTitle = title === product ? product : `${title} · ${product}`; // home: not "X · X"
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#040302"><title>${esc(tabTitle)}</title><style>${css()}</style><noscript><style>.ui{opacity:1;animation:none}</style></noscript></head><body class="${mode}"><div class="sky" aria-hidden="true"></div><canvas class="scene" aria-hidden="true"></canvas><div class="ui"><header class="top"><div class="brand">${esc(product)}${SCHOOL_NAME ? `<small>${esc(SCHOOL_NAME)}</small>` : ''}</div>${steps}${langSwitcher(lang, url)}</header><main class="main">${body}</main><footer class="foot"><span>${esc(t(lang, 'footer'))}</span>${CANVAS_HOST ? `<span>${esc(CANVAS_HOST)}</span>` : ''}</footer></div><script type="application/json" id="scene-data">${sceneData(lang, mode)}</script><script id="scene">${SCENE_JS}</script></body></html>`;
}

export function homePage(lang, url, { bound, version }) {
  const origin = new URL(url).origin;
  return layout(
    lang,
    url,
    t(lang, 'product'),
    `<section class="card">
<p class="badge">${esc(t(lang, 'read_only'))}</p>
<h1>${esc(t(lang, 'tagline'))}</h1>
<p class="status"><span class="dot${bound ? ' ok' : ''}"></span>${esc(t(lang, bound ? 'status_bound' : 'status_unbound'))}</p>
<h2>${esc(t(lang, 'home_add_title'))}</h2>
<code class="code">${esc(origin)}/mcp</code>
<div class="rows"><div class="row"><span>${esc(t(lang, 'canvas_site'))}</span><span>${esc(CANVAS_HOST || t(lang, 'not_configured'))}</span></div>
${version ? `<div class="row"><span>${esc(t(lang, 'version_label'))}</span><span>${esc(version)}</span></div>` : ''}</div>
</section>`,
  );
}

// Intro → paste the token → agree → authorize → thank you. The script shows one step at a time;
// without it they all show, top to bottom, as one form (with the longer explanations).
export function authorizePage(lang, url, { csrf, returnTo }) {
  const chips = t(lang, 'scopes')
    .split('|')
    .map(s => `<li>${esc(s)}</li>`)
    .join('');
  const back = to =>
    `<button type="button" class="ghost" data-back="${to}">${esc(t(lang, 'back'))}</button>`;
  const steps = `<ol class="steps" aria-hidden="true"><li data-for="token">01<span> ${esc(t(lang, 'step_token'))}</span></li><li data-for="consent">02<span> ${esc(t(lang, 'step_consent'))}</span></li><li data-for="authorize">03<span> ${esc(t(lang, 'step_authorize'))}</span></li></ol>`;
  return layout(
    lang,
    url,
    authTitle(lang),
    `<section class="intro card" data-stage="intro">
<p class="badge">${esc(t(lang, 'read_only'))}</p>
<h1>${esc(authTitle(lang))}</h1>
<p class="lead">${esc(t(lang, 'auth_lead'))}</p>
<h2>${esc(t(lang, 'scopes_title'))}</h2>
<ul class="chips">${chips}</ul>
<div class="rows"><div class="row"><span>${esc(t(lang, 'canvas_site'))}</span><span>${esc(CANVAS_HOST || t(lang, 'not_configured'))}</span></div><div class="row"><span>${esc(t(lang, 'returning_to'))}</span><span>${esc(returnTo)}</span></div></div>
<p class="ticker" aria-hidden="true" data-rest="${esc(t(lang, 'read_only'))}"></p>
</section>
<form method="post" class="connect card">
<input type="hidden" name="csrf" value="${esc(csrf)}">
<section data-stage="token">
<label class="field" for="token">${esc(t(lang, 'token_label'))}</label>
<p class="help no-flow">${esc(t(lang, 'token_how'))}</p>
<p class="help flow-only">${esc(t(lang, 'token_path'))}</p>
${CANVAS_HOST ? `<a class="open" href="https://${esc(CANVAS_HOST)}/profile/settings" target="_blank" rel="noopener noreferrer">${esc(t(lang, 'token_open'))} ↗</a>` : ''}
<input type="password" id="token" name="token" required autocomplete="off" spellcheck="false" maxlength="512" placeholder="${esc(t(lang, 'token_placeholder'))}">
<p class="got" aria-live="polite">${esc(t(lang, 'token_got'))}</p>
<p class="note no-flow">${esc(t(lang, 'token_privacy'))}</p>
<div class="nav"><button type="button" data-next="token" disabled>${esc(t(lang, 'next'))}</button></div>
</section>
<section data-stage="consent">
<ul class="chips flow-only">${chips}</ul>
<label class="consent"><input type="checkbox" name="consent" value="yes" required><span>${esc(t(lang, 'consent'))}</span></label>
<div class="nav">${back('token')}<button type="button" data-next="consent" disabled>${esc(t(lang, 'next'))}</button></div>
</section>
<section data-stage="authorize">
<button type="submit" class="go">${esc(t(lang, 'submit'))}</button>
<p class="dest flow-only">${esc(t(lang, 'returning_to'))} · ${esc(returnTo)}</p>
<div class="nav">${back('consent')}</div>
</section>
</form>
<div class="thanks" data-stage="thanks" aria-live="polite"><h2>${esc(t(lang, 'thanks_title'))}</h2><p>${esc(t(lang, 'thanks_body'))}</p></div>
<button type="button" class="skip ghost">${esc(t(lang, 'skip'))}</button>`,
    { mode: 'auth', steps },
  );
}

export function messagePage(lang, url, { titleKey, bodyKey, detail, backHref }) {
  return layout(
    lang,
    url,
    t(lang, titleKey),
    `<section class="card">
<div class="state">${icon.alert}</div>
<h1>${esc(t(lang, titleKey))}</h1>
<p class="lead">${esc(t(lang, bodyKey))}</p>
${detail ? `<p class="detail">${esc(detail)}</p>` : ''}
${backHref ? `<a class="btn" href="${esc(backHref)}">${esc(t(lang, 'back'))}</a>` : ''}
</section>`,
  );
}
