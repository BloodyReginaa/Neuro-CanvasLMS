// Parse wrangler.jsonc (comments + trailing commas) without extra dependencies.
export function parseJsonc(text) {
  let out = '';
  for (let i = 0; i < text.length;) {
    if (text[i] === '"') {
      const m = /^"(?:\\.|[^"\\])*"/.exec(text.slice(i));
      out += m[0];
      i += m[0].length;
    } else if (text.startsWith('//', i))
      i = text.indexOf('\n', i) === -1 ? text.length : text.indexOf('\n', i);
    else if (text.startsWith('/*', i)) i = text.indexOf('*/', i) + 2;
    else out += text[i++];
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}
