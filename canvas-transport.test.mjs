import { CANVAS_HOST as H } from './config.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createCanvasTransport,parseCanvasResponse } from './canvas-transport.mjs';
import { callCanvas } from './canvas.mjs';
const enc=new TextEncoder();
const wire=(head,body='')=>new Uint8Array(Buffer.concat([Buffer.from(head+'\r\n\r\n'),Buffer.from(body)]));
function fixture(bytes){
 let request='',closes=0,connection;
 return {connect:(address,options)=>{
  connection={address,options};
  return {opened:Promise.resolve(),closed:Promise.resolve(),close:async()=>{closes++},
   writable:new WritableStream({write:x=>{request+=new TextDecoder().decode(x)}}),
   readable:new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.subarray(i,i+7));c.close()}})};
 },get request(){return request},get closes(){return closes},get connection(){return connection}};
}
test('TLS transport retains same Canvas authentication and GET routing',async()=>{
 const f=fixture(wire(`HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 2\r\nLink: <https://${H}/api/v1/courses?page=2>; rel="next"`,'[]'));
 const result=await callCanvas('canvas_courses',{},'test-token',createCanvasTransport(f.connect));
 assert.deepEqual(result.data,[]);assert.equal(result.next_page,2);
 assert.deepEqual(f.connection,{address:{hostname:`${H}`,port:443},options:{secureTransport:'on'}});
 assert.match(f.request,/^GET \/api\/v1\/courses\?/);assert.match(f.request,/authorization: Bearer test-token\r\n/);assert.doesNotMatch(f.request,/CF-Worker:/i);assert.equal(f.closes,1);
});
test('chunked JSON is reconstructed across split socket reads and trailers',async()=>{
 const f=fixture(wire('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked','3\r\n{"a\r\n4;test=value\r\n":1}\r\n0\r\nX-Trace: ignored\r\n\r\n'));
 const r=await createCanvasTransport(f.connect)(`https://${H}/api/v1/test`,{method:'GET',redirect:'manual'});
 assert.deepEqual(await r.json(),{a:1});assert.equal(r.headers.get('transfer-encoding'),null);
});
test('interim responses and gzip responses are decoded',async()=>{
 const zipped=gzipSync('[1,2]');const r=await parseCanvasResponse(wire(`HTTP/1.1 103 Early Hints\r\n\r\nHTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\nContent-Length: ${zipped.length}`,zipped));
 assert.deepEqual(await r.json(),[1,2]);assert.equal(r.headers.get('content-encoding'),null);
});
test('truncated, ambiguous and oversized responses fail closed',async()=>{
 for(const bytes of [wire('HTTP/1.1 200 OK\r\nContent-Length: 5','[]'),wire('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 2','[]'),wire('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked','1000001\r\n'),wire('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked','2\r\n[]\r\n'),wire('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked','0\r\n\r\nextra'),enc.encode('HTTP/1.1 200 OK\r\nX: '+'x'.repeat(40000)+'\r\n\r\n')])await assert.rejects(parseCanvasResponse(bytes));
});
test('redirect responses never initiate another request or send credentials onward',async()=>{
 const f=fixture(wire('HTTP/1.1 302 Found\r\nLocation: https://other.test\r\nContent-Length: 0'));
 await assert.rejects(callCanvas('canvas_profile',{},'private',createCanvasTransport(f.connect)),/HTTP 302/);assert.equal(f.closes,1);
});
test('credentials cannot leave the fixed API and writes or injected headers are rejected',async()=>{
 const client=createCanvasTransport(()=>{throw new Error('must not connect')},()=>{throw new Error('must not fallback')});
 for(const url of ['https://evil.test/api/v1/test',`http://${H}/api/v1/test`,`https://${H}/files/1`,`https://user@${H}/api/v1/test`])await assert.rejects(client(url,{method:'GET',redirect:'manual',headers:{Authorization:'Bearer private'}}));
 for(const opt of [{method:'POST',redirect:'manual'},{method:'GET',redirect:'follow'},{method:'GET',redirect:'manual',headers:{Host:'evil.test'}},{method:'GET',redirect:'manual',headers:{Authorization:'Bearer private\r\nX: evil'}}])await assert.rejects(client(`https://${H}/api/v1/test`,opt));
});
test('file downloads use the existing fetch path without Authorization',async()=>{
 let calls=0;const client=createCanvasTransport(()=>{throw new Error('unexpected TLS')},async(u,opt)=>{calls++;assert.equal(new Headers(opt.headers).has('authorization'),false);return new Response('file')});
 assert.equal(await (await client('https://files.inscloudgate.net/file',{method:'GET',redirect:'manual',headers:{Accept:'*/*'}})).text(),'file');assert.equal(calls,1);
});
test('already aborted requests do not connect',async()=>{
 let called=false;const client=createCanvasTransport(()=>{called=true});
 await assert.rejects(client(`https://${H}/api/v1/test`,{method:'GET',redirect:'manual',signal:AbortSignal.abort()}));assert.equal(called,false);
});
