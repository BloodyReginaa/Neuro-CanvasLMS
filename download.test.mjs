import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileContent, DOWNLOAD_UA, loginRedirect } from './file-content.mjs';
import { downloadOriginal } from './module-file.mjs';
import { CANVAS_HOST as H } from './config.mjs';

test('Canvas file downloads send a User-Agent (UMass answers 403 without one) and no credentials', async () => {
  const seen = [];
  const fetcher = async (u, opt) => {
    seen.push(new Headers(opt.headers));
    return new Response('hello', { headers: { 'content-type': 'text/plain' } });
  };
  const r = await readFileContent(
    { id: 1, filename: 'a.md', url: `https://${H}/files/1/download?verifier=x`, size: 5 },
    {},
    fetcher,
  );
  assert.equal(r.text, 'hello');
  assert.equal(seen[0].get('user-agent'), DOWNLOAD_UA);
  assert.ok(DOWNLOAD_UA.length > 3);
  assert.equal(seen[0].has('authorization'), false);
});
test('a redirect to the Canvas login page is reported instead of returning the login HTML', async () => {
  const fetcher = async () =>
    new Response(null, { status: 302, headers: { location: `https://${H}/login` } });
  await assert.rejects(
    readFileContent(
      { id: 1, filename: 'a.md', url: `https://${H}/files/1/download`, size: 5 },
      {},
      fetcher,
    ),
    /login page/,
  );
  assert.equal(loginRedirect(`https://${H}/login/saml`), true);
  assert.equal(loginRedirect(`https://${H}/files/1/download`), false);
  assert.equal(loginRedirect('https://evil.example/login'), false);
});
test('original-file downloads also send the User-Agent', async () => {
  let ua;
  const fetcher = async (u, opt) => {
    ua = new Headers(opt.headers).get('user-agent');
    return new Response(new Uint8Array([37, 80, 68, 70, 45, 49]), {
      headers: { 'content-type': 'application/pdf' },
    });
  };
  await downloadOriginal('https://files.example.org/a.pdf', { fetcher, resolve: async () => {} });
  assert.equal(ua, DOWNLOAD_UA);
});

test('download User-Agent avoids strings known to be blocked by Canvas file storage', () => {
  assert.doesNotMatch(DOWNLOAD_UA, /umasscanvas/i);
  assert.match(DOWNLOAD_UA, /^[\x20-\x7e]+$/);
});

test('files shared "only with link" are read; only a lock stops a download', async () => {
  // Canvas's own answer for such a file (UMass, 2026-11-06): hidden from the Files list, not locked,
  // with a download URL. Students open it from the course page; every reader must too.
  const hiddenMeta = {
    id: 18454568,
    display_name: 'Programming Environment Setup.md',
    filename: 'setup.md',
    url: `https://${H}/files/18454568/download?download_frd=1&verifier=x`,
    size: 5,
    hidden: true,
    hidden_for_user: true,
    locked_for_user: false,
  };
  const text = async () => new Response('hello', { headers: { 'content-type': 'text/plain' } });
  assert.equal((await readFileContent(hiddenMeta, {}, text)).text, 'hello');
  await assert.rejects(
    readFileContent({ ...hiddenMeta, locked_for_user: true }, {}, text),
    /locked/,
  );
  const { fileOriginal } = await import('./module-file.mjs');
  const api = m => async () => Response.json(m);
  const options = { resolve: async () => {}, fetcher: text };
  const original = await fileOriginal({ file_id: 18454568 }, 't', api(hiddenMeta), options);
  assert.equal(original.structuredContent.size, 5);
  await assert.rejects(
    fileOriginal(
      { file_id: 18454568 },
      't',
      api({ ...hiddenMeta, locked_for_user: true }),
      options,
    ),
    /locked/,
  );
});
