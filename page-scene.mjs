// The connector pages' one script: a black hole whose disk is made of university knowledge, and the
// step-by-step authorization (intro → token → consent → authorize → thank you).
//
// The pages allow this exact script and nothing else (by its hash, worker.mjs), and the same CSP
// keeps the page off the network (connect-src and img-src fall back to 'none'), so even this script
// could not send the token anywhere. It only checks how long the token is, to enable "Continue";
// the form is posted as before. Without JavaScript or WebGL the page still works: all steps show
// at once over a CSS picture of the black hole.
//
// The picture: your AI sits at the centre; what you can see in Canvas, and the knowledge of every
// subject, orbits in and falls into it. Light from behind the hole is bent around it (the
// point-lens equation, applied in screen space), the cursor swells and lights up the disk under it,
// and dragging (two fingers on a trackpad or a phone) turns the view.
//
// Kept as a plain string, not a function: the bundler may rewrite functions, which would break
// the hash. No template literals inside (this is a String.raw template).

// Formulas and lines from many university subjects (the language-specific subject names and the
// Canvas areas are added per page from i18n.mjs).
export const KNOWLEDGE = [
  // mathematics
  '∫₀^∞ e^(−x²) dx = √π / 2',
  'e^(iπ) + 1 = 0',
  'det(A − λI) = 0',
  'Σ 1/n² = π²/6',
  'lim(x→0) sin x / x = 1',
  'a² + b² = c²',
  'x = (−b ± √(b² − 4ac)) / 2a',
  '∮ F · dr = ∬ (∇ × F) · dS',
  '∀ε > 0 ∃δ > 0',
  'P(A|B) = P(B|A) P(A) / P(B)',
  '∂u/∂t = α ∇²u',
  'φ = (1 + √5) / 2',
  'A = U Σ Vᵀ',
  'n! ≈ √(2πn) (n/e)ⁿ',
  'ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ ⊂ ℂ',
  'f(x) = Σ f⁽ⁿ⁾(a) (x − a)ⁿ / n!',
  'dy/dx = ky',
  // physics
  'F = ma',
  'E = mc²',
  'iħ ∂ψ/∂t = Ĥψ',
  'PV = nRT',
  'G_μν + Λg_μν = 8πG T_μν / c⁴',
  'λ = h / p',
  'ΔS ≥ 0',
  'V = IR',
  'F = G m₁m₂ / r²',
  '∇ · E = ρ / ε₀',
  '∇ × B = μ₀J + μ₀ε₀ ∂E/∂t',
  'E = hν',
  'Δx Δp ≥ ħ/2',
  'T = 2π √(L/g)',
  'r_s = 2GM / c²',
  // chemistry
  '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
  'pH = −log[H⁺]',
  'ΔG = ΔH − TΔS',
  'N₂ + 3H₂ ⇌ 2NH₃',
  'CH₄ + 2O₂ → CO₂ + 2H₂O',
  'Kₐ = [H⁺][A⁻] / [HA]',
  'C₈H₁₀N₄O₂',
  '1s² 2s² 2p⁶',
  'rate = k[A]ᵐ[B]ⁿ',
  // biology
  'DNA → RNA → protein',
  'ATP → ADP + Pᵢ',
  '5′-ATG GCC TAA-3′',
  'p² + 2pq + q² = 1',
  'dN/dt = rN (1 − N/K)',
  'Homo sapiens',
  'prophase → metaphase → anaphase',
  'CRISPR-Cas9',
  // computer science
  'O(n log n)',
  'for i in range(n):',
  'SELECT * FROM courses;',
  'git commit -m "final"',
  'λx. x',
  'P = NP ?',
  'T(n) = 2T(n/2) + n',
  'int main(void)',
  'HTTP/1.1 200 OK',
  'σ(z) = 1 / (1 + e⁻ᶻ)',
  'softmax(QKᵀ / √d) V',
  'while (true) { }',
  // economics and statistics
  'GDP = C + I + G + (X − M)',
  'MR = MC',
  'MV = PQ',
  'NPV = Σ CFₜ / (1 + r)ᵗ',
  'ceteris paribus',
  'p < 0.05',
  'μ ± 2σ',
  'H₀: μ₁ = μ₂',
  'ŷ = β₀ + β₁x',
  'χ² = Σ (O − E)² / E',
  'σ² = E[(X − μ)²]',
  // humanities, languages, arts
  'Cogito, ergo sum',
  'To be, or not to be',
  'Veni, vidi, vici',
  'Γνῶθι σεαυτόν',
  'tabula rasa',
  'Magna Carta, 1215',
  'iambic pentameter',
  'habeas corpus',
  'Zeitgeist',
  'ars longa, vita brevis',
  'in medias res',
  '学而时习之',
  'S → NP VP',
  '/ˈkæn.vəs/',
  '♩ = 120',
  'ii – V – I',
  // a student's Canvas
  'Syllabus',
  'Midterm',
  'Lecture 7.pdf',
  'Week 5',
  'Due 11:59 PM',
  'Quiz 3',
  'Problem Set 4',
  'Office hours',
  'Final project',
  'Lab report',
  'Reading: ch. 3',
];

export const SCENE_JS = String.raw`(() => {
'use strict';
const root = document.documentElement;
root.classList.add('ready');
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.prototype.slice.call((el || document).querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let data = {};
try { data = JSON.parse($('#scene-data').textContent); } catch (e) {}
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const wide = () => innerWidth >= 760 && innerWidth > innerHeight;
// Where the black hole sits so text never covers it: in the space above the text (or beside it,
// for a side column), with the camera pulled back when that space is small.
// Returns [shift x, shift y, distance factor].
const around = (rect, side) => {
  const W = innerWidth, H = innerHeight;
  if (!rect) return [0, 0, 1];
  if (side && wide()) return [(rect.right + W) / W - 1, 0, clamp(620 / Math.max(1, W - rect.right), 1, 1.7)];
  const top = 60, room = Math.max(rect.top, H * 0.32) - top;
  return [0, 1 - (2 * (top + room / 2)) / H, clamp((0.62 * H) / room, 0.95, 2)];
};

let scene = null;
try { scene = makeScene($('canvas.scene')); } catch (e) { scene = null; }
if (!scene) root.classList.add('no-gl');
if (data.mode === 'auth') {
  try { startFlow(); } catch (e) { root.classList.remove('flow'); }
} else if (scene) {
  const block = $('.card');
  const place = () => scene.shot('idle', around(block && block.getBoundingClientRect(), true));
  scene.begin(true);
  place();
  addEventListener('resize', place);
}

// ---------------------------------------------------------------- the step-by-step authorization
function startFlow() {
  const body = document.body;
  const form = $('form.connect');
  const token = $('#token');
  const consent = form && $('input[name=consent]', form);
  if (!form || !token || !consent) return;
  const stages = $$('[data-stage]');
  const order = ['intro', 'token', 'consent', 'authorize', 'thanks'];
  const nextToken = $('[data-next=token]');
  const nextConsent = $('[data-next=consent]');
  const got = $('.got');
  const skip = $('.skip');
  const ticker = $('.ticker');
  let at = '';
  let timers = [];
  let submitting = false;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const stop = () => { timers.forEach(clearTimeout); timers = []; };
  // The server checks the token with Canvas; here only its length decides whether to go on.
  const ready = () => token.value.trim().length >= 20;
  const stageEl = name => stages.filter(s => s.dataset.stage === name)[0];
  const placeFor = name => (name === 'thanks' ? [0, 0.06, 1] : around(stageEl(name).getBoundingClientRect(), false));

  root.classList.add('flow');

  function go(name) {
    stop(); // whatever was scheduled for the previous step no longer applies
    at = name;
    body.dataset.at = name;
    const n = order.indexOf(name);
    stages.forEach(el => el.classList.toggle('on', el.dataset.stage === name));
    $$('.steps li').forEach(li => {
      const i = order.indexOf(li.dataset.for);
      li.classList.toggle('now', i === n);
      li.classList.toggle('done', i < n);
    });
    if (skip) skip.classList.toggle('on', name === 'intro');
    if (scene) scene.shot(name, placeFor(name));
    const focus = { token: token, consent: consent, authorize: $('button[type=submit]', form) }[name];
    if (focus && fine) later(() => at === name && focus.focus({ preventScroll: true }), reduce ? 50 : 1000);
  }

  function toToken() {
    stop();
    go('token');
  }

  // The intro: the ring lights up, the disk forms, the title comes in, and what the AI will be
  // able to read passes under it one by one.
  function intro() {
    let seen = false;
    try { seen = sessionStorage.getItem('nclms-intro') === '1'; sessionStorage.setItem('nclms-intro', '1'); } catch (e) {}
    const quick = seen || reduce;
    if (scene) scene.begin(quick);
    go('intro');
    if (quick || !ticker) {
      if (ticker) ticker.textContent = ticker.dataset.rest || '';
      later(toToken, reduce ? 700 : 1600);
      return;
    }
    const names = $$('.intro .chips li').map(li => li.textContent.trim());
    const show = (text, cls) => {
      ticker.textContent = text;
      ticker.classList.remove('tick', 'rest');
      void ticker.offsetWidth;
      ticker.classList.add(cls);
    };
    const t0 = 2700, gap = 440;
    names.forEach((t, i) => later(() => show(t, 'tick'), t0 + i * gap));
    later(() => show(ticker.dataset.rest || '', 'rest'), t0 + names.length * gap);
    later(toToken, t0 + names.length * gap + 1500);
  }

  const check = () => {
    const ok = ready();
    if (nextToken) nextToken.disabled = !ok;
    if (got) got.classList.toggle('on', ok);
    token.classList.toggle('good', ok);
    return ok;
  };
  token.addEventListener('input', check);
  token.addEventListener('paste', () => setTimeout(() => {
    if (check() && at === 'token') {
      if (scene) scene.pulse();
      later(() => at === 'token' && ready() && go('consent'), 900);
    }
  }, 30));
  token.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (check()) go('consent');
  });
  if (nextToken) nextToken.addEventListener('click', () => check() && go('consent'));
  consent.addEventListener('change', () => {
    if (nextConsent) nextConsent.disabled = !consent.checked;
    if (!consent.checked) return;
    if (scene) scene.pulse();
    later(() => at === 'consent' && consent.checked && go('authorize'), 750);
  });
  if (nextConsent) nextConsent.addEventListener('click', () => consent.checked && go('authorize'));
  $$('[data-back]').forEach(b => b.addEventListener('click', () => { stop(); go(b.dataset.back); }));
  if (skip) skip.addEventListener('click', toToken);
  form.addEventListener('submit', e => {
    if (submitting) return;
    e.preventDefault();
    if (!ready()) return go('token');
    if (!consent.checked) return go('consent');
    submitting = true;
    const button = $('button[type=submit]', form);
    if (button) button.disabled = true;
    stop();
    go('thanks');
    if (scene) scene.finale();
    setTimeout(() => form.submit(), reduce ? 150 : 1900);
  });
  addEventListener('resize', () => { if (scene && at) scene.reshift(placeFor(at)); });
  // Back from the AI app's page: start over (the form's one-time key is used up).
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  check();
  intro();
}

// ---------------------------------------------------------------- the black hole
function makeScene(canvas) {
  if (!canvas) return null;
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
  if (!gl) return null;
  const small = Math.min(screen.width, screen.height) < 700;
  const N = small ? 1000 : 2000;
  const RIN = 3.0, RBASE = 22, ROUT = 55, WARP = 5, SEG = 16, NS = small ? 600 : 900;
  const NR = small ? 56 : 96, NA = small ? 240 : 360;
  const SHOTS = {
    start: { d: 130, az: -0.75, el: 0.22 },
    intro: { d: 54, az: -0.2, el: 0.2 },
    token: { d: 48, az: 0.35, el: 0.17 },
    consent: { d: 44, az: 1.05, el: 0.26 },
    authorize: { d: 42, az: 1.75, el: 0.12 },
    thanks: { d: 34, az: 2.3, el: 0.4 },
    idle: { d: 50, az: 0.3, el: 0.18 },
  };
  const DUR = { intro: 7.6, token: 2.6, consent: 2.4, authorize: 2.4, thanks: 1.9, idle: 3 };

  const HEAD = '#version 300 es\nprecision highp float;\n';
  // the point-lens equation, θ± = (θ ± √(θ² + 4θE²)) / 2 with θE² ∝ D_ls / (D_l D_s), and the
  // cursor, which swells and lights up what is under it
  const LENS = [
    'uniform mat4 uView; uniform mat4 uProj; uniform vec2 uShift; uniform float uAspect; uniform vec3 uMouse;',
    'vec2 screenOf(vec4 c) { vec2 n = c.xy / c.w + uShift; return vec2(n.x * uAspect, n.y); }',
    'vec4 hide() { return vec4(0.0, 0.0, 2.0, 1.0); }',
    'float warpAt(float r, float p, float rout, float warp) { float k = r / rout; return warp * k * k * (sin(p + 0.6) + 0.45 * k * sin(2.0 * p + 1.7)); }',
    'vec2 lens(vec4 clip, vec4 bh, float pass, out float bright) {',
    '  vec2 q = screenOf(clip), qb = screenOf(bh), d = q - qb;',
    '  float th = max(length(d), 1e-4), f = uProj[1][1];',
    '  float e2 = 2.0 * f * f * max(clip.w - bh.w, 0.0) / (bh.w * max(clip.w, 1e-3));',
    '  float root = sqrt(th * th + 4.0 * e2);',
    '  bright = 1.0;',
    '  if (pass < 0.5) q = qb + d / th * 0.5 * (th + root);',
    '  else if (pass < 1.5) { float tm = 0.5 * (th - root), tp = 0.5 * (th + root); q = qb + d / th * tm; float m = -tm / tp; bright = m * m * 1.5; }',
    '  vec2 dm = q - uMouse.xy;',
    '  float g = uMouse.z * exp(-dot(dm, dm) / 0.04);',
    '  bright *= 1.0 + 2.2 * g;',
    '  return uMouse.xy + dm * (1.0 + 0.55 * g);',
    '}',
    'vec4 place(vec2 q, vec4 clip) { return vec4(vec2(q.x / uAspect, q.y) * clip.w, clip.z, clip.w); }',
  ].join('\n') + '\n';

  const DISK_VS = HEAD + LENS + [
    'layout(location=0) in vec2 aRP;',
    'uniform vec3 uCam; uniform float uPass; uniform float uRout; uniform float uWarp;',
    'out float vR; out float vA; out float vW; out float vDop;',
    'void main() {',
    '  float r = aRP.x, p = aRP.y;',
    '  vec3 world = vec3(r * cos(p), warpAt(r, p, uRout, uWarp), r * sin(p));',
    '  mat4 vp = uProj * uView;',
    '  vec4 clip = vp * vec4(world, 1.0), bh = vp * vec4(0.0, 0.0, 0.0, 1.0);',
    '  float wb = smoothstep(-0.8, 0.8, clip.w - bh.w);',
    '  float b;',
    '  vec2 q = lens(clip, bh, uPass, b);',
    '  vW = (uPass < 1.5 ? wb : 1.0 - wb) * b;',
    '  vR = r; vA = p;',
    '  vDop = dot(vec3(-sin(p), 0.0, cos(p)), normalize(uCam - world));',
    '  gl_Position = place(q, clip);',
    '}',
  ].join('\n');
  const DISK_FS = HEAD + [
    'in float vR; in float vA; in float vW; in float vDop;',
    'uniform float uTime; uniform float uRin; uniform float uRbase; uniform float uGlow; uniform float uOcc;',
    'out vec4 o;',
    'float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
    'float noise(vec3 x) {',
    '  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),',
    '             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);',
    '}',
    'void main() {',
    '  if (vW < 0.002) discard;',
    '  float fall = pow(uRin / vR, 2.3);',
    '  float inner = smoothstep(uRin * 0.97, uRin * 1.1, vR);',
    '  float outer = 1.0 - smoothstep(uRbase * 0.35, uRbase, vR);',
    // the gas in front is not transparent: it hides the ring and whatever is behind it
    "  if (uOcc > 0.5) { o = vec4(0.0, 0.0, 0.0, min(vW, 1.0) * inner * outer * (0.3 + 0.6 * clamp(pow(uRin * 1.6 / vR, 1.5), 0.0, 1.0))); return; }",
    // co-rotating with the gas (Kepler), so the streaks stream around; thin in radius, long in angle
    '  float a = vA - 0.95 * pow(uRin / vR, 1.5) * uTime;',
    '  vec3 c = vec3(cos(a) * 1.3, sin(a) * 1.3, vR * 26.0);',
    '  float s = 0.62 * noise(c) + 0.38 * noise(c * vec3(2.6, 2.6, 2.9) + 5.3);',
    '  s = pow(s, 3.2) * 4.0;',
    '  float b = inner * outer * (0.12 + s) * (0.1 + 1.4 * fall);',
    '  float dop = pow(clamp(1.0 + 0.6 * vDop, 0.25, 1.8), 2.4);',
    '  vec3 col = mix(vec3(0.55, 0.36, 0.18), vec3(1.0, 0.93, 0.8), clamp(fall * 1.5, 0.0, 1.0));',
    '  o = vec4(col * b * dop * vW * uGlow, 1.0);',
    '}',
  ].join('\n');

  const TEXT_VS = HEAD + LENS + [
    'layout(location=0) in vec2 aCorner;',
    'layout(location=1) in vec4 aDyn;',
    'layout(location=2) in vec4 aUv;',
    'layout(location=3) in vec4 aShape;',
    'uniform vec3 uCam; uniform float uPass; uniform float uRin; uniform float uRout; uniform float uWarp; uniform float uGlow;',
    'out vec2 vUv; out vec3 vCol; out float vBias;',
    'void main() {',
    '  float r0 = aDyn.x, p0 = aDyn.y;',
    '  float hgt = aShape.y * r0;',
    '  float wid = hgt * aShape.x;',
    // the line of text follows its orbit, its top towards the centre
    '  float tilt = mix(0.0, 0.22, smoothstep(uRin * 2.5, uRout * 0.8, r0));',
    '  float p = p0 - (aCorner.x - 0.5) * wid / r0;',
    '  float r = r0 - (aCorner.y - 0.5) * hgt * cos(tilt);',
    '  vec3 world = vec3(r * cos(p), aDyn.z + warpAt(r0, p, uRout, uWarp) + (aCorner.y - 0.5) * hgt * sin(tilt), r * sin(p));',
    '  vec3 center = vec3(r0 * cos(p0), aDyn.z + warpAt(r0, p0, uRout, uWarp), r0 * sin(p0));',
    '  mat4 vp = uProj * uView;',
    '  vec4 clip = vp * vec4(world, 1.0), cc = vp * vec4(center, 1.0), bh = vp * vec4(0.0, 0.0, 0.0, 1.0);',
    '  bool behind = cc.w > bh.w;',
    '  vUv = vec2(0.0); vCol = vec3(0.0); vBias = 0.0;',
    '  if ((uPass < 1.5) != behind || cc.w < 0.6 || aDyn.w < 0.003) { gl_Position = hide(); return; }',
    '  float b;',
    '  vec2 q = lens(clip, bh, uPass, b);',
    '  float heat = clamp(pow(uRin * 1.6 / r0, 1.3), 0.0, 1.0);',
    '  float dop = dot(vec3(-sin(p0), 0.0, cos(p0)), normalize(uCam - center));',
    '  b *= clamp(1.0 + 0.6 * dop * (0.3 + 0.7 * heat), 0.3, 1.8);',
    '  float hot = aShape.w;',
    '  float big = hgt * uProj[1][1] / cc.w;',
    // depth of field: what is right in front of the camera goes soft, then fades
    '  float near = 1.0 - smoothstep(0.22, 0.45, big);',
    '  vBias = 2.4 * smoothstep(0.1, 0.38, big);',
    '  vCol = mix(vec3(0.68, 0.53, 0.34), vec3(1.0, 0.93, 0.8), clamp(heat + 0.2 * hot, 0.0, 1.0)) * aDyn.w * b * near * (0.62 + 0.38 * heat + 0.15 * hot) * uGlow;',
    '  vUv = vec2(mix(aUv.x, aUv.z, aCorner.x), mix(aUv.w, aUv.y, aCorner.y));',
    '  gl_Position = place(q, clip);',
    '}',
  ].join('\n');
  const TEXT_FS = HEAD + [
    'in vec2 vUv; in vec3 vCol; in float vBias; uniform sampler2D uAtlas; out vec4 o;',
    'void main() { o = vec4(vCol * texture(uAtlas, vUv, vBias).a, 1.0); }',
  ].join('\n');

  const STAR_VS = HEAD + LENS + [
    'layout(location=0) in vec4 aStar;',
    'uniform float uDpr; uniform float uTime; uniform float uGlow;',
    'out vec3 vCol;',
    'void main() {',
    '  mat4 vp = uProj * uView;',
    '  vec4 clip = vp * vec4(aStar.xyz * 600.0, 1.0), bh = vp * vec4(0.0, 0.0, 0.0, 1.0);',
    '  vCol = vec3(0.0);',
    '  if (clip.w < 0.25) { gl_Position = hide(); return; }',
    '  vec2 q = screenOf(clip), qb = screenOf(bh), d = q - qb;',
    '  float th = max(length(d), 1e-4), f = uProj[1][1];',
    '  q = qb + d / th * 0.5 * (th + sqrt(th * th + 8.0 * f * f / bh.w));',
    '  float s = aStar.w;',
    '  float tw = 0.7 + 0.3 * sin(uTime * (0.5 + fract(s * 13.0) * 2.0) + s * 40.0);',
    '  vec3 tint = fract(s * 7.0) > 0.6 ? vec3(1.0, 0.85, 0.62) : vec3(0.72, 0.84, 1.0);',
    '  vCol = tint * s * tw * uGlow;',
    '  gl_PointSize = (1.0 + 3.0 * s * s) * uDpr;',
    '  gl_Position = vec4(q.x / uAspect, q.y, 0.0, 1.0);',
    '}',
  ].join('\n');
  const STAR_FS = HEAD + [
    'in vec3 vCol; out vec4 o;',
    'void main() { vec2 p = gl_PointCoord * 2.0 - 1.0; float a = max(0.0, 1.0 - dot(p, p)); o = vec4(vCol * a * a, 1.0); }',
  ].join('\n');
  const HOLE_VS = HEAD + [
    'layout(location=0) in vec2 aCorner;',
    'uniform vec2 uCenter; uniform float uSize; uniform float uAspect;',
    'out vec2 vP;',
    'void main() { vP = aCorner; vec2 q = uCenter + aCorner * uSize; gl_Position = vec4(q.x / uAspect, q.y, 0.0, 1.0); }',
  ].join('\n');
  const HOLE_FS = HEAD + [
    'in vec2 vP; uniform float uMode; uniform float uScale; uniform vec2 uApproach; uniform float uGlow; uniform float uTime; out vec4 o;',
    'float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }',
    'void main() {',
    '  float rho = length(vP) * uScale;',
    '  if (uMode < 0.5) { o = vec4(0.0, 0.0, 0.0, 1.0 - smoothstep(0.99, 1.012, rho)); return; }',
    '  vec2 dir = normalize(vP + 1e-5);',
    '  float side = 1.0 + 0.45 * dot(dir, uApproach);',
    '  float x = rho - 1.0;',
    '  float ang = atan(dir.y, dir.x) - uTime * 0.22;',
    '  vec2 q = vec2(cos(ang), sin(ang)) * 3.0;',
    '  float flow = 0.6 * n2(q + vec2(rho * 30.0, 0.0)) + 0.4 * n2(q * 2.7 + vec2(0.0, rho * 70.0));',
    '  float threads = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(rho * 190.0 + flow * 10.0), 2.5);',
    '  float band = smoothstep(-0.004, 0.012, x) * exp(-max(x, 0.0) / 0.16);',
    '  float edge = exp(-pow(x / 0.012, 2.0)) * 2.1;',
    '  float ring = (band * threads * (0.75 + 1.1 * flow) + edge) * side;',
    '  float halo = exp(-max(x, 0.0) * 2.0) * 0.3 * smoothstep(0.99, 1.04, rho) * side;',
    '  float haze = exp(-max(x, 0.0) * 0.55) * 0.05 * smoothstep(0.99, 1.1, rho);',
    '  o = vec4((vec3(1.0, 0.94, 0.84) * ring + vec3(0.95, 0.7, 0.42) * (halo + haze)) * uGlow, 1.0);',
    '}',
  ].join('\n');

  const program = (vs, fs) => {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(pair => {
      const s = gl.createShader(pair[0]);
      gl.shaderSource(s, pair[1]);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      gl.attachShader(p, s);
    });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p: p, u: u };
  };
  const Dp = program(DISK_VS, DISK_FS), T = program(TEXT_VS, TEXT_FS), S = program(STAR_VS, STAR_FS), Hp = program(HOLE_VS, HOLE_FS);

  // the words, drawn once into a texture
  const list = [];
  (data.knowledge || []).forEach(s => list.push({ s: s, kind: 0 }));
  (data.local || []).forEach(s => list.push({ s: s, kind: 1 }));
  const atlas = buildAtlas(list);
  const items = atlas.items;
  if (!items.length) throw new Error('no words');
  const idx = [[], []];
  items.forEach((it, i) => idx[it.kind].push(i));
  const pick = () => {
    const l = idx[1].length && (Math.random() < 0.2 || !idx[0].length) ? idx[1] : idx[0];
    return items[l[(Math.random() * l.length) | 0]];
  };
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const an = gl.getExtension('EXT_texture_filter_anisotropic');
  if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));

  // the glowing disk: a fine ring mesh, its streaks drawn in the fragment shader
  const diskVao = gl.createVertexArray();
  gl.bindVertexArray(diskVao);
  const rp = [];
  for (let i = 0; i <= NR; i++) {
    const r = RIN * 0.96 + (RBASE - RIN * 0.96) * Math.pow(i / NR, 1.7);
    for (let j = 0; j <= NA; j++) rp.push(r, (j / NA) * 6.283185307);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rp), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tri = [];
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) {
    const a = i * (NA + 1) + j, b = a + NA + 1;
    tri.push(a, b, a + 1, a + 1, b, b + 1);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tri), gl.STATIC_DRAW);
  const DISK_INDICES = tri.length;

  // the words: each has its own radius, angle, height, size and brightness. Most are small and dim
  // (they read as texture), some medium, a few large; the sheet thickens and flares outward, turns
  // at Kepler speed and contracts into the hole, slowly far out and fast close to it.
  const K = 0.011, R0 = RIN * 1.15, LOGR = Math.log(ROUT / R0);
  const R = new Float32Array(N), PH = new Float32Array(N), Z = new Float32Array(N), A = new Float32Array(N);
  const stat = new Float32Array(N * 8), dyn = new Float32Array(N * 4);
  let dirty = true;
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 0.577;
  const fallRate = r => K * r * Math.pow(r / RIN, 0.25) + 0.9 * Math.max(0, RIN * 1.7 - r);
  const spawn = (i, outer) => {
    const it = pick();
    let r = ROUT * (0.94 + 0.06 * Math.random());
    // spread like the steady flow: fewer words further out (they move in faster there)
    if (!outer) do r = R0 * Math.exp(Math.random() * LOGR); while (Math.random() > Math.pow(R0 / r, 0.25));
    R[i] = r;
    PH[i] = Math.random() * 6.2832;
    Z[i] = gauss() * (Math.random() < 0.05 ? 3 : 1);
    const k = Math.random();
    const m = k < 0.72 ? 0.25 + 0.3 * Math.random() : k < 0.95 ? 0.7 + 0.6 * Math.random() : 1.8 + 1.4 * Math.random();
    A[i] = k < 0.72 ? 0.42 + 0.3 * Math.random() : 0.7 + 0.3 * Math.random();
    const o = i * 8;
    stat[o] = it.u0; stat[o + 1] = it.v0; stat[o + 2] = it.u1; stat[o + 3] = it.v1;
    stat[o + 4] = it.aspect; stat[o + 5] = 0.034 * m; stat[o + 6] = Math.random(); stat[o + 7] = it.kind;
    dirty = true;
  };
  for (let i = 0; i < N; i++) spawn(i, false);

  const textVao = gl.createVertexArray();
  gl.bindVertexArray(textVao);
  const strip = [];
  for (let i = 0; i <= SEG; i++) strip.push(i / SEG, 0, i / SEG, 1);
  const VERTS = (SEG + 1) * 2;
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(strip), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const dynBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf);
  gl.bufferData(gl.ARRAY_BUFFER, dyn.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(1, 1);
  const statBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, statBuf);
  gl.bufferData(gl.ARRAY_BUFFER, stat, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0);
  gl.vertexAttribDivisor(2, 1);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 16);
  gl.vertexAttribDivisor(3, 1);

  const starVao = gl.createVertexArray();
  gl.bindVertexArray(starVao);
  const stars = new Float32Array(NS * 4);
  for (let i = 0; i < NS; i++) {
    const z = Math.random() * 2 - 1, t = Math.random() * 6.2832, rr = Math.sqrt(1 - z * z);
    stars.set([rr * Math.cos(t), z, rr * Math.sin(t), 0.08 + 0.92 * Math.pow(Math.random(), 3)], i * 4);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, stars, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);

  const holeVao = gl.createVertexArray();
  gl.bindVertexArray(holeVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // camera, light and their animations
  const cam = { d: SHOTS.idle.d, az: SHOTS.idle.az, el: SHOTS.idle.el, sx: 0, sy: 0, k: 1 };
  const fx = { ring: 1, disk: 1, text: 1, speed: 1, pulse: 0 };
  const user = { az: 0, el: 0, zoom: 1 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, on: 0, ton: 0, at: 0 };
  const hole = { x: innerWidth / 2, y: innerHeight / 2 };
  let tweens = [];
  let quickIntro = false;
  const tween = (obj, to, sec, delay) => {
    const keys = Object.keys(to);
    tweens.forEach(tw => { if (tw.obj === obj) tw.keys = tw.keys.filter(k => keys.indexOf(k) < 0); });
    tweens.push({ obj: obj, from: null, to: to, keys: keys, t: reduce ? 0 : -(delay || 0), sec: reduce ? 0.001 : Math.max(sec, 0.001) });
  };
  const stepTweens = dt => {
    tweens = tweens.filter(tw => {
      tw.t += dt;
      if (tw.t < 0) return tw.keys.length > 0;
      if (!tw.from) { tw.from = {}; tw.keys.forEach(k => { tw.from[k] = tw.obj[k]; }); }
      const k = clamp(tw.t / tw.sec, 0, 1), e = ease(k);
      tw.keys.forEach(key => { tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e; });
      return k < 1 && tw.keys.length > 0;
    });
  };

  // input: the cursor bends the disk; dragging (or two fingers / a trackpad) turns the view
  addEventListener('pointermove', e => {
    mouse.tx = (e.clientX / innerWidth * 2 - 1) * (innerWidth / innerHeight);
    mouse.ty = 1 - e.clientY / innerHeight * 2;
    if (mouse.on < 0.01) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    mouse.ton = 1;
    mouse.at = performance.now();
  }, { passive: true });
  root.addEventListener('mouseleave', () => { mouse.ton = 0; });
  const pts = new Map();
  canvas.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const k = 1 / pts.size;
    user.az -= (e.clientX - p.x) * 0.006 * k;
    user.el = clamp(user.el + (e.clientY - p.y) * 0.004 * k, -0.4, 0.9);
    p.x = e.clientX;
    p.y = e.clientY;
  });
  const lift = e => pts.delete(e.pointerId);
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', lift);
  canvas.addEventListener('wheel', e => {
    // leave real page scrolling alone
    if (root.scrollHeight > innerHeight + 2 && !root.classList.contains('flow')) return;
    e.preventDefault();
    if (e.ctrlKey) user.zoom = clamp(user.zoom * Math.exp(e.deltaY * 0.01), 0.6, 1.6);
    else { user.az -= e.deltaX * 0.003; user.el = clamp(user.el + e.deltaY * 0.002, -0.4, 0.9); }
  }, { passive: false });

  // matrices (column-major)
  const perspective = (fovy, aspect, near, far) => {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  };
  const lookAt = e => {
    let zx = e[0], zy = e[1], zz = e[2], l = Math.hypot(zx, zy, zz);
    zx /= l; zy /= l; zz /= l;
    let xx = zz, xz = -zx;
    l = Math.hypot(xx, xz) || 1;
    xx /= l; xz /= l;
    const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
    return new Float32Array([xx, yx, zx, 0, 0, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  };
  const xf = (m, x, y, z) => [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
    m[3] * x + m[7] * y + m[11] * z + m[15],
  ];
  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  };

  const update = dt => {
    for (let i = 0; i < N; i++) {
      let r = R[i];
      PH[i] += 0.95 * Math.pow(RIN / r, 1.5) * dt;
      r -= fallRate(r) * dt;
      if (r < RIN * 0.95) {
        spawn(i, true);
        r = R[i];
      } else R[i] = r;
      const t = r / ROUT, o = i * 4;
      dyn[o] = r;
      dyn[o + 1] = PH[i];
      dyn[o + 2] = Z[i] * (0.04 + 1.6 * t * t);
      dyn[o + 3] = A[i] * smooth(RIN * 0.95, RIN * 1.6, r) * (1 - smooth(ROUT * 0.93, ROUT * 1.01, r));
    }
    if (dirty) {
      gl.bindBuffer(gl.ARRAY_BUFFER, statBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, stat);
      dirty = false;
    }
  };

  let last = performance.now(), time = 0, lost = false;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; root.classList.add('no-gl'); });
  const frame = now => {
    if (lost) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += dt;
    stepTweens(dt);
    const sim = dt * fx.speed * (reduce ? 0.25 : 1);
    update(sim);
    fx.pulse *= Math.exp(-dt * 2.2);
    if (now - mouse.at > 2600) mouse.ton = 0;
    const km = 1 - Math.exp(-dt * 9);
    mouse.x += (mouse.tx - mouse.x) * km;
    mouse.y += (mouse.ty - mouse.y) * km;
    mouse.on += (mouse.ton - mouse.on) * (1 - Math.exp(-dt * 3));

    const dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);
    const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const aspect = W / H;
    const sway = reduce ? 0 : 1;
    const az = cam.az + user.az + sway * (time * 0.01 + 0.035 * Math.sin(time * 0.071) + 0.04 * mouse.x * mouse.on);
    const el = clamp(cam.el + user.el + sway * (0.012 * Math.sin(time * 0.053) - 0.025 * mouse.y * mouse.on), -0.12, 0.95);
    const d = cam.d * cam.k * user.zoom * (1 + sway * 0.012 * Math.sin(time * 0.043));
    const eye = [d * Math.cos(el) * Math.sin(az), d * Math.sin(el), d * Math.cos(el) * Math.cos(az)];
    const view = lookAt(eye), proj = perspective(0.7, aspect, 0.1, 3000), vp = mul(proj, view);
    const c = xf(vp, 0, 0, 0);
    const qbx = (c[0] / c[3] + cam.sx) * aspect, qby = c[1] / c[3] + cam.sy;
    const shadow = 2.6 * proj[5] / c[3];
    const ap = xf(vp, Math.cos(-az) * 4, 0, Math.sin(-az) * 4);
    let ax = (ap[0] / ap[3] + cam.sx) * aspect - qbx, ay = ap[1] / ap[3] + cam.sy - qby;
    const al = Math.hypot(ax, ay) || 1;
    ax /= al;
    ay /= al;
    hole.x = (qbx / aspect + 1) / 2 * innerWidth;
    hole.y = (1 - qby) / 2 * innerHeight;
    const boost = 1 + fx.pulse;

    gl.viewport(0, 0, W, H);
    gl.clearColor(0.016, 0.013, 0.01, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const common = prog => {
      gl.useProgram(prog.p);
      gl.uniformMatrix4fv(prog.u.uView, false, view);
      gl.uniformMatrix4fv(prog.u.uProj, false, proj);
      gl.uniform2f(prog.u.uShift, cam.sx, cam.sy);
      gl.uniform1f(prog.u.uAspect, aspect);
      if (prog.u.uMouse) gl.uniform3f(prog.u.uMouse, mouse.x, mouse.y, mouse.on);
      if (prog.u.uCam) gl.uniform3f(prog.u.uCam, eye[0], eye[1], eye[2]);
    };

    common(S);
    gl.uniform1f(S.u.uDpr, dpr);
    gl.uniform1f(S.u.uTime, time);
    gl.uniform1f(S.u.uGlow, Math.min(1.3, 0.3 + 0.7 * Math.max(fx.ring, fx.disk)));
    gl.bindVertexArray(starVao);
    gl.drawArrays(gl.POINTS, 0, NS);

    const disk = (pass, occ) => {
      common(Dp);
      gl.uniform1f(Dp.u.uPass, pass);
      gl.uniform1f(Dp.u.uOcc, occ ? 1 : 0);
      gl.uniform1f(Dp.u.uRout, ROUT);
      gl.uniform1f(Dp.u.uWarp, WARP);
      gl.uniform1f(Dp.u.uTime, time);
      gl.uniform1f(Dp.u.uRin, RIN);
      gl.uniform1f(Dp.u.uRbase, RBASE);
      gl.uniform1f(Dp.u.uGlow, fx.disk * boost);
      gl.bindVertexArray(diskVao);
      gl.drawElements(gl.TRIANGLES, DISK_INDICES, gl.UNSIGNED_SHORT, 0);
    };
    const words = pass => {
      common(T);
      gl.uniform1f(T.u.uPass, pass);
      gl.uniform1f(T.u.uRin, RIN);
      gl.uniform1f(T.u.uRout, ROUT);
      gl.uniform1f(T.u.uWarp, WARP);
      gl.uniform1f(T.u.uGlow, fx.text * boost);
      gl.uniform1i(T.u.uAtlas, 0);
      gl.bindVertexArray(textVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, VERTS, N);
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dyn);
    disk(0);
    disk(1);
    words(0);
    words(1);

    gl.useProgram(Hp.p);
    gl.bindVertexArray(holeVao);
    gl.uniform2f(Hp.u.uCenter, qbx, qby);
    gl.uniform1f(Hp.u.uSize, shadow * 7);
    gl.uniform1f(Hp.u.uScale, 7);
    gl.uniform1f(Hp.u.uAspect, aspect);
    gl.uniform2f(Hp.u.uApproach, ax, ay);
    gl.uniform1f(Hp.u.uGlow, fx.ring * boost);
    gl.uniform1f(Hp.u.uTime, time);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(Hp.u.uMode, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(Hp.u.uMode, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
    disk(2, true);
    gl.blendFunc(gl.ONE, gl.ONE);
    disk(2);
    words(2);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  root.classList.add('gl');

  return {
    shot: (name, shift) => {
      const s = SHOTS[name] || SHOTS.idle;
      const sec = name === 'intro' && quickIntro ? 1.6 : DUR[name] || 2;
      tween(cam, { d: s.d, az: s.az, el: s.el, sx: shift[0], sy: shift[1], k: shift[2] || 1 }, sec);
    },
    reshift: shift => tween(cam, { sx: shift[0], sy: shift[1], k: shift[2] || 1 }, 0.6),
    // darkness → the ring lights up → the disk forms → the words arrive
    begin: quick => {
      quickIntro = quick;
      Object.assign(cam, SHOTS.start);
      fx.ring = 0;
      fx.disk = 0;
      fx.text = 0;
      tween(fx, { ring: 1 }, quick ? 0.8 : 1.6, quick ? 0 : 0.3);
      tween(fx, { disk: 1 }, quick ? 1 : 3, quick ? 0.1 : 0.9);
      tween(fx, { text: 1 }, quick ? 1.2 : 3.6, quick ? 0.2 : 2);
    },
    pulse: () => { fx.pulse = Math.min(fx.pulse + 0.3, 0.8); },
    finale: () => tween(fx, { speed: 4, ring: 2.4, disk: 1.8, text: 0.35 }, 1.6),
    hole: () => hole,
  };
}

function buildAtlas(list) {
  const S = 2048, H = 72, F = 50;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.textBaseline = 'middle';
  const SERIF = '"Times New Roman", Times, "Songti SC", STSong, "Noto Serif CJK SC", "Hiragino Mincho ProN", "Noto Serif Devanagari", "Kohinoor Devanagari", serif';
  const MATH = '"STIX Two Math", "Cambria Math", "Latin Modern Math", ' + SERIF;
  const MONO = 'Menlo, "SF Mono", Consolas, "Liberation Mono", monospace';
  const font = w => {
    const weight = w.bold ? '600 ' : '';
    if (/[{}();]|SELECT|git |int |HTTP|for i|while|λx/.test(w.s)) return weight + Math.round(F * 0.84) + 'px ' + MONO;
    if (/[=→⇌≥≈±∫Σ∂∇√∮∀]/.test(w.s)) return 'italic ' + weight + F + 'px ' + MATH;
    return (Math.random() < 0.3 ? 'italic ' : '') + weight + F + 'px ' + SERIF;
  };
  const queue = list.map(w => ({ s: w.s, kind: w.kind, bold: Math.random() < 0.15 }));
  list.forEach(w => { if (!w.kind && /[=→∫Σ∂∇]/.test(w.s)) queue.push({ s: w.s, kind: 0, bold: true }); });
  let x = 4, y = 0;
  const items = [];
  for (let i = 0; i < queue.length; i++) {
    const w = queue[i];
    g.font = font(w);
    const tw = Math.min(S - 8, Math.ceil(g.measureText(w.s).width) + 14);
    if (x + tw > S) { x = 4; y += H; }
    if (y + H > S) break;
    g.fillText(w.s, x + 7, y + H / 2, tw - 14);
    items.push({ u0: x / S, v0: y / S, u1: (x + tw) / S, v1: (y + H) / S, aspect: tw / H, kind: w.kind });
    x += tw + 10;
  }
  return { canvas: c, items: items };
}
})();`;

let hash;
// For the Content-Security-Policy: 'sha256-…' of exactly the script above.
export function sceneScriptHash() {
  hash ??= crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(SCENE_JS))
    .then(d => 'sha256-' + btoa(String.fromCharCode(...new Uint8Array(d))));
  return hash;
}
