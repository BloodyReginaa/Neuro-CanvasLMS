// HTML from Canvas (assignment descriptions, pages, announcements, the syllabus) → compact text for
// the AI. It keeps what carries meaning (links, images, headings, lists, tables, emphasis, code,
// formulas) and drops the markup that only styles, which is most of the bytes.
// Course content is untrusted, so this is ONE forward pass over the string: no DOM, no regular
// expression that can backtrack over the input, and every stack has a fixed maximum depth.

// The named entities that occur in real course content. Unknown names are left as written.
const ENTITIES = new Map(
  Object.entries({
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    ensp: ' ',
    emsp: ' ',
    thinsp: ' ',
    shy: '',
    zwnj: '',
    zwj: '',
    ndash: '–',
    mdash: '—',
    hellip: '…',
    lsquo: '‘',
    rsquo: '’',
    sbquo: '‚',
    ldquo: '“',
    rdquo: '”',
    bdquo: '„',
    laquo: '«',
    raquo: '»',
    bull: '•',
    middot: '·',
    copy: '©',
    reg: '®',
    trade: '™',
    deg: '°',
    plusmn: '±',
    times: '×',
    divide: '÷',
    minus: '−',
    micro: 'µ',
    para: '¶',
    sect: '§',
    frac12: '½',
    frac14: '¼',
    frac34: '¾',
    sup1: '¹',
    sup2: '²',
    sup3: '³',
    euro: '€',
    pound: '£',
    yen: '¥',
    cent: '¢',
    le: '≤',
    ge: '≥',
    ne: '≠',
    asymp: '≈',
    equiv: '≡',
    infin: '∞',
    sum: '∑',
    prod: '∏',
    radic: '√',
    part: '∂',
    int: '∫',
    nabla: '∇',
    isin: '∈',
    notin: '∉',
    cap: '∩',
    cup: '∪',
    sub: '⊂',
    sup: '⊃',
    sube: '⊆',
    supe: '⊇',
    and: '∧',
    or: '∨',
    not: '¬',
    forall: '∀',
    exist: '∃',
    empty: '∅',
    prime: '′',
    Prime: '″',
    lowast: '∗',
    sdot: '⋅',
    oplus: '⊕',
    otimes: '⊗',
    perp: '⊥',
    ang: '∠',
    there4: '∴',
    larr: '←',
    rarr: '→',
    uarr: '↑',
    darr: '↓',
    harr: '↔',
    lArr: '⇐',
    rArr: '⇒',
    hArr: '⇔',
    alpha: 'α',
    beta: 'β',
    gamma: 'γ',
    delta: 'δ',
    epsilon: 'ε',
    zeta: 'ζ',
    eta: 'η',
    theta: 'θ',
    iota: 'ι',
    kappa: 'κ',
    lambda: 'λ',
    mu: 'μ',
    nu: 'ν',
    xi: 'ξ',
    pi: 'π',
    rho: 'ρ',
    sigma: 'σ',
    tau: 'τ',
    upsilon: 'υ',
    phi: 'φ',
    chi: 'χ',
    psi: 'ψ',
    omega: 'ω',
    Gamma: 'Γ',
    Delta: 'Δ',
    Theta: 'Θ',
    Lambda: 'Λ',
    Xi: 'Ξ',
    Pi: 'Π',
    Sigma: 'Σ',
    Phi: 'Φ',
    Psi: 'Ψ',
    Omega: 'Ω',
    iexcl: '¡',
    iquest: '¿',
    szlig: 'ß',
    ccedil: 'ç',
    Ccedil: 'Ç',
    ntilde: 'ñ',
    Ntilde: 'Ñ',
    aacute: 'á',
    eacute: 'é',
    iacute: 'í',
    oacute: 'ó',
    uacute: 'ú',
    Aacute: 'Á',
    Eacute: 'É',
    Iacute: 'Í',
    Oacute: 'Ó',
    Uacute: 'Ú',
    agrave: 'à',
    egrave: 'è',
    igrave: 'ì',
    ograve: 'ò',
    ugrave: 'ù',
    acirc: 'â',
    ecirc: 'ê',
    icirc: 'î',
    ocirc: 'ô',
    ucirc: 'û',
    auml: 'ä',
    euml: 'ë',
    iuml: 'ï',
    ouml: 'ö',
    uuml: 'ü',
    Auml: 'Ä',
    Ouml: 'Ö',
    Uuml: 'Ü',
    atilde: 'ã',
    otilde: 'õ',
    aring: 'å',
    Aring: 'Å',
    oslash: 'ø',
    Oslash: 'Ø',
    aelig: 'æ',
    AElig: 'Æ',
  }),
);
const ANY_CASE = new Set(['amp', 'lt', 'gt', 'quot', 'apos', 'nbsp']); // &AMP; and friends
export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,9});/gi, (m, e) => {
    if (e[0] !== '#') {
      const low = e.toLowerCase();
      return ENTITIES.get(e) ?? (ANY_CASE.has(low) ? ENTITIES.get(low) : m);
    }
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
  });
}

// Is this string HTML (as opposed to plain text that happens to contain a "<")? Fields such as
// `description` are HTML on assignments but plain text on groups; only real markup is converted.
const MARKUP =
  /<\/?(?:p|div|span|a|br|ul|ol|li|h[1-6]|table|tr|td|th|img|strong|em|b|i|u|s|iframe|pre|code|blockquote|hr|sup|sub|font|section|figure|video|audio)(?:\s[^<>]*)?\/?>/i;
export const looksLikeHtml = s => typeof s === 'string' && s.includes('<') && MARKUP.test(s);

const SKIPPED = new Set(['script', 'style', 'head', 'template', 'noscript', 'svg']);
const BLOCKS = new Set(
  'p div section article header footer main aside nav figure figcaption details summary address form fieldset dl center'.split(
    ' ',
  ),
);
const HEADINGS = new Map([
  ['h1', '# '],
  ['h2', '## '],
  ['h3', '### '],
  ['h4', '#### '],
  ['h5', '#### '],
  ['h6', '#### '],
]);
const MARKS = new Map([
  ['strong', '**'],
  ['b', '**'],
  ['em', '*'],
  ['i', '*'],
  ['s', '~~'],
  ['del', '~~'],
  ['strike', '~~'],
  ['code', '`'],
]);
const TRACKING = /^(?:_gl|_ga|_gac|utm_[a-z_]+|fbclid|gclid|msclkid|mc_[ce]id)$/i;
const MAX_DEPTH = 64; // open lists, links and emphasis; deeper nesting is flattened

const isSpace = c => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';
const isNameChar = c =>
  (c >= 'a' && c <= 'z') ||
  (c >= 'A' && c <= 'Z') ||
  (c >= '0' && c <= '9') ||
  c === '-' ||
  c === ':';

// name="value" pairs of one tag. Only called for the few tags whose attributes matter.
function parseAttrs(a) {
  const o = new Map();
  const n = a.length;
  let i = 0;
  while (i < n) {
    while (i < n && (isSpace(a[i]) || a[i] === '/')) i++;
    let from = i;
    while (i < n && !isSpace(a[i]) && a[i] !== '=' && a[i] !== '/') i++;
    const name = a.slice(from, i).toLowerCase();
    if (!name) {
      i++;
      continue;
    }
    while (i < n && isSpace(a[i])) i++;
    let value = '';
    if (a[i] === '=') {
      i++;
      while (i < n && isSpace(a[i])) i++;
      if (a[i] === '"' || a[i] === "'") {
        const close = a.indexOf(a[i], i + 1);
        value = a.slice(i + 1, close < 0 ? n : close);
        i = close < 0 ? n : close + 1;
      } else {
        from = i;
        while (i < n && !isSpace(a[i])) i++;
        value = a.slice(from, i);
      }
    }
    if (!o.has(name)) o.set(name, value);
  }
  return o;
}

export function htmlToText(html, base = 'https://canvas.invalid') {
  const s = String(html);
  const parts = [];
  let last2 = ''; // the last two characters written
  let gap = false; // whitespace since the last text: one space goes before the next text
  let pre = 0; // inside <pre>: text is copied as written
  let cell = 0; // inside a table cell: line breaks become spaces, so a row stays one line
  let cells = 0; // cells written in the current row
  let quotesTrusted = true; // false once a tag had an unclosed quote: then ">" alone ends a tag
  let lower; // lower-cased copy, made only if a <script>/<style> has to be skipped
  let markerAt = -1; // parts.length right after a list marker or "> ": no line break may follow
  const lists = []; // open lists: { ordered, n }
  const open = []; // open links and emphasis: { name, at, mark | href }

  const write = t => {
    if (!t) return;
    parts.push(t);
    last2 = (last2 + t).slice(-2);
  };
  const cut = at => {
    const removed = parts.splice(at).join('');
    last2 = parts.slice(-2).join('').slice(-2);
    return removed;
  };
  const lineStart = () => parts.length === 0 || last2.endsWith('\n');
  // Write the pending space, if text follows on the same line.
  const lead = () => {
    if (gap && !lineStart() && !last2.endsWith(' ')) write(' ');
    gap = false;
  };
  const line = () => {
    if (parts.length === markerAt) return; // <li><p>text: the text stays on the marker's line
    if (cell) return void (gap = true);
    gap = false;
    if (!lineStart()) write('\n');
  };
  const block = () => {
    if (parts.length === markerAt) return;
    if (cell) return void (gap = true);
    gap = false;
    if (parts.length === 0 || last2 === '\n\n') return;
    write(last2.endsWith('\n') ? '\n' : '\n\n');
  };
  const text = raw => {
    const t = decodeEntities(raw);
    if (pre) return write(t);
    const flat = t.replace(/\s+/g, ' ');
    const core = flat.trim();
    if (!core) return void (flat && (gap = true));
    if ((gap || flat[0] === ' ') && !lineStart() && !last2.endsWith(' ')) write(' ');
    write(core);
    gap = flat.endsWith(' ');
  };
  // A link target the user can open: absolute, and never a script or an embedded data blob.
  const link = raw => {
    const href = decodeEntities(raw ?? '').trim();
    if (!href || href[0] === '#' || /^(?:javascript|vbscript|data|blob):/i.test(href)) return '';
    try {
      const u = new URL(href, base);
      // Click-tracking parameters (Google Analytics _gl, utm_*, …) are long and mean nothing.
      for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
      return u.href;
    } catch {
      return '';
    }
  };
  const flatten = t =>
    decodeEntities(t ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  const lastOpen = name => {
    for (let i = open.length - 1; i >= 0; i--) if (open[i].name === name) return i;
    return -1;
  };

  function tag(name, closing, attrs) {
    if (HEADINGS.has(name)) {
      block();
      if (!closing) write(HEADINGS.get(name));
      return;
    }
    if (BLOCKS.has(name)) return lists.length ? line() : block(); // a paragraph in a list item
    switch (name) {
      case 'br':
        if (cell) gap = true;
        else if (pre) write('\n');
        else if (parts.length && last2 !== '\n\n') {
          gap = false;
          write('\n');
        }
        return;
      case 'hr':
        block();
        if (!closing) {
          write('---');
          block();
        }
        return;
      case 'ul':
      case 'ol':
        if (closing) lists.pop();
        if (lists.length) line();
        else block();
        if (!closing && lists.length < MAX_DEPTH) {
          const start = name === 'ol' ? Number(parseAttrs(attrs).get('start')) : NaN;
          lists.push({ ordered: name === 'ol', n: Number.isInteger(start) ? start - 1 : 0 });
        }
        return;
      case 'li': {
        if (closing) return;
        line();
        lead();
        const l = lists[lists.length - 1];
        write('  '.repeat(Math.max(0, lists.length - 1)) + (l?.ordered ? `${++l.n}. ` : '- '));
        markerAt = parts.length;
        return;
      }
      case 'dt':
      case 'dd':
      case 'caption':
        return line();
      case 'table':
        cell = 0;
        return block();
      case 'tr':
        cell = 0;
        cells = 0;
        return line();
      case 'td':
      case 'th':
        if (closing) cell = Math.max(0, cell - 1);
        else {
          if (cells++ > 0) {
            gap = false;
            write(' | ');
          }
          cell++;
        }
        return;
      case 'blockquote':
        block();
        if (!closing) {
          write('> ');
          markerAt = parts.length;
        }
        return;
      case 'pre':
        if (!closing) {
          block();
          write('```\n');
          pre++;
        } else if (pre) {
          pre--;
          if (!lineStart()) write('\n');
          write('```');
          block();
        }
        return;
      case 'a': {
        if (!closing) {
          if (open.length >= MAX_DEPTH) return;
          lead();
          open.push({
            name,
            at: parts.length,
            href: pre ? '' : link(parseAttrs(attrs).get('href')),
          });
          return;
        }
        const i = lastOpen('a');
        if (i < 0) return;
        const { at, href } = open[i];
        open.length = i; // anything opened inside the link and never closed ends with it
        if (!href) return;
        const label = cut(at).replace(/\s+/g, ' ').trim();
        const bare = u => u.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!label) return;
        if (href.startsWith('mailto:') && href.slice(7).split('?')[0] === label) write(label);
        else if (bare(label) === bare(href)) write(href);
        else write(`[${label}](${href})`);
        return;
      }
      case 'img': {
        if (closing) return;
        const a = parseAttrs(attrs);
        lead();
        // Canvas renders formulas as images and keeps the LaTeX next to them.
        const tex =
          flatten(a.get('data-equation-content')) ||
          (/(?:^|\s)equation_image(?:\s|$)/.test(a.get('class') ?? '')
            ? flatten(a.get('alt')).replace(/^LaTeX:\s*/i, '')
            : '');
        if (tex) return write(`$${tex}$`);
        const alt = flatten(a.get('alt')) || flatten(a.get('title'));
        const src = link(a.get('src'));
        if (src) write(`![${alt}](${src})`);
        else if (alt) write(`[image: ${alt}]`);
        return;
      }
      case 'iframe':
      case 'video':
      case 'audio':
      case 'source':
      case 'embed':
      case 'object': {
        if (closing) return;
        const a = parseAttrs(attrs);
        const src = link(a.get('src') ?? a.get('data'));
        if (!src) return;
        lead();
        write(`[embedded${a.get('title') ? ': ' + flatten(a.get('title')) : ''}](${src})`);
        return;
      }
      case 'sup':
      case 'sub':
        if (!closing && !pre) {
          lead();
          write(name === 'sup' ? '^' : '_');
        }
        return;
    }
    const mark = MARKS.get(name);
    if (!mark || pre) return;
    if (!closing) {
      if (open.length >= MAX_DEPTH) return;
      lead();
      open.push({ name, at: parts.length, mark });
      return write(mark);
    }
    const i = lastOpen(name);
    if (i < 0) return;
    const { at } = open[i];
    open.splice(i, 1);
    if (parts.length === at + 1)
      cut(at); // nothing inside: no empty "****"
    else write(mark);
  }

  let i = 0;
  const n = s.length;
  const lastGt = s.lastIndexOf('>'); // past it no tag can end: the rest is text
  while (i < n) {
    const lt = s.indexOf('<', i);
    if (lt < 0) {
      text(s.slice(i));
      break;
    }
    if (lt > i) text(s.slice(i, lt));
    if (s.startsWith('<!--', lt)) {
      const e = s.indexOf('-->', lt + 4);
      i = e < 0 ? n : e + 3;
      continue;
    }
    let j = lt + 1;
    if (s[j] === '!' || s[j] === '?') {
      const e = s.indexOf('>', j);
      i = e < 0 ? n : e + 1;
      continue;
    }
    const closing = s[j] === '/';
    if (closing) j++;
    const nameFrom = j;
    while (j < n && isNameChar(s[j])) j++;
    const first = s[nameFrom] ?? '';
    if (j === nameFrom || !((first >= 'a' && first <= 'z') || (first >= 'A' && first <= 'Z'))) {
      text('<'); // "a < b": a literal character, not a tag
      i = lt + 1;
      continue;
    }
    if (j > lastGt) {
      text(s.slice(lt));
      break;
    }
    const name = s.slice(nameFrom, j).toLowerCase();
    // The tag ends at the first ">" outside quotes (a title may contain ">").
    let e = -1;
    if (quotesTrusted) {
      let quote = '';
      for (let k = j; k < n; k++) {
        const c = s[k];
        if (quote) {
          if (c === quote) quote = '';
        } else if (c === '"' || c === "'") quote = c;
        else if (c === '>') {
          e = k;
          break;
        }
      }
      if (e < 0) quotesTrusted = false;
    }
    if (e < 0) e = s.indexOf('>', j);
    if (e < 0) {
      text('<');
      i = lt + 1;
      continue;
    }
    i = e + 1;
    if (!closing && SKIPPED.has(name)) {
      lower ??= s.toLowerCase();
      const close = lower.indexOf('</' + name, i);
      const after = close < 0 ? -1 : s.indexOf('>', close);
      i = after < 0 ? n : after + 1;
      continue;
    }
    tag(name, closing, s.slice(j, e));
  }
  return parts
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
