import test from 'node:test';
import assert from 'node:assert/strict';
import { fileResourceURI, parseFileResourceURI, readFileResource } from './file-resource.mjs';
import { Buffer } from 'node:buffer';
const bytes = Buffer.from('%PDF-1.4 original bytes');
const args = { course_id: 1234, module_id: 5555, item_id: 6666 };
const sha256 = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex');
const uri = fileResourceURI(args, { sha256, name: '5-volumes.pdf' });
const options = {
  resolve: async () => {},
  fetcher: async () => new Response(bytes, { headers: { 'content-type': 'application/pdf' } }),
};
const api = async () =>
  Response.json({
    id: args.item_id,
    module_id: args.module_id,
    type: 'ExternalUrl',
    external_url: 'https://www.dropbox.com/scl/fi/example/5-volumes.pdf',
  });
test('resource URI accepts only module IDs, hash and encoded filename', () => {
  assert.deepEqual(parseFileResourceURI(uri), {
    kind: 'module',
    args,
    sha256,
    name: '5-volumes.pdf',
  });
  for (const bad of [
    'https://example.org/a',
    uri + '?url=https://example.org',
    uri.replace('/1234/', '/0/'),
    uri.replace('/1234/', '/99999999999999999999/'),
  ])
    assert.throws(() => parseFileResourceURI(bad));
});
test('resource read returns exact binary via authenticated Canvas source', async () => {
  const result = await readFileResource(uri, 'secret', api, options);
  assert.equal(result.contents[0].uri, uri);
  assert.equal(result.contents[0].mimeType, 'application/pdf');
  assert.deepEqual(Buffer.from(result.contents[0].blob, 'base64'), bytes);
});
test('resource read rejects changed file and lost Canvas access', async () => {
  await assert.rejects(
    readFileResource(uri.replace(sha256, 'a'.repeat(64)), 'secret', api, options),
    /changed/,
  );
  await assert.rejects(
    readFileResource(uri, 'secret', async () => new Response('', { status: 403 }), options),
  );
});

test('file_id resources round-trip and re-check Canvas on every read', async () => {
  const furi = fileResourceURI({ file_id: 7777 }, { sha256, name: '12 Notes.pdf' });
  assert.equal(furi, `canvas-file://file/7777/${sha256}/12%20Notes.pdf`);
  assert.deepEqual(parseFileResourceURI(furi), {
    kind: 'file',
    args: { file_id: 7777 },
    sha256,
    name: '12 Notes.pdf',
  });
  for (const bad of [furi.replace('/7777/', '/0/'), furi + '/x', 'canvas-file://file/1/' + sha256])
    assert.throws(() => parseFileResourceURI(bad));
  let apiCalls = 0;
  const fileApi = async u => {
    apiCalls++;
    return Response.json({
      id: 7777,
      display_name: '12 Notes.pdf',
      size: bytes.length,
      url: 'https://files.example.org/x.pdf',
    });
  };
  const r = await readFileResource(furi, 'secret', fileApi, options);
  assert.equal(apiCalls, 1);
  assert.deepEqual(Buffer.from(r.contents[0].blob, 'base64'), bytes);
  await assert.rejects(
    readFileResource(
      furi,
      'secret',
      async () =>
        Response.json({ id: 1, locked_for_user: true, url: 'https://files.example.org/x.pdf' }),
      options,
    ),
    /locked/,
  );
});
