import test from 'node:test';import assert from 'node:assert/strict';
import {moduleFile,downloadOriginal,safeURL,publicAddress,resolvePublic} from './module-file.mjs';
const args={course_id:41051,module_id:545828,item_id:3555793};
const pdf=Buffer.from('%PDF-1.7\noriginal-binary\x00\xff');
const external={id:args.item_id,module_id:args.module_id,type:'ExternalUrl',external_url:'https://www.dropbox.com/scl/fi/id/5-volumes.pdf?rlkey=key&dl=0'};
const resolver=async()=>{};
test('external module file returns identical original bytes in MCP resource',async()=>{
 let urls=[];const r=await moduleFile(args,'secret',async(u,o)=>{assert.equal(new Headers(o.headers).get('Authorization'),'Bearer secret');return Response.json(external);},{resolve:resolver,fetcher:async(u,o)=>{urls.push(u);assert.equal(new Headers(o.headers).has('Authorization'),false);assert.equal(o.redirect,'manual');return new Response(pdf,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="5-volumes.pdf"'}});}});
 assert.match(urls[0],/dl=1/);assert.equal(r.structuredContent.name,'5-volumes.pdf');assert.deepEqual(Buffer.from(r.content[1].resource.blob,'base64'),pdf);assert.equal(r.structuredContent.sha256.length,64);
});
test('internal File follows metadata without forwarding credentials',async()=>{
 const r=await moduleFile(args,'secret',async(u)=>Response.json(new URL(u).pathname.endsWith('/files/1')?{id:1,url:'https://files.inscloudgate.net/a',filename:'test.pdf'}:{...external,type:'File',content_id:1}),{resolve:resolver,fetcher:async(u,o)=>{assert.equal(new Headers(o.headers).has('authorization'),false);return new Response(pdf);}});assert.equal(r.structuredContent.name,'test.pdf');
});
test('does not accept arbitrary URL or mismatched/locked item',async()=>{
 await assert.rejects(moduleFile({...args,url:'https://example.com'},'',()=>{}));
 for(const item of [{...external,id:2},{...external,locked_for_user:true},{...external,type:'Page'}])await assert.rejects(moduleFile(args,'',async()=>Response.json(item)));
});
test('blocks private IPs, credentials, non-HTTPS and redirect destinations',async()=>{
 for(const u of ['http://example.com/a','https://127.0.0.1/a','https://2130706433/a','https://[::1]/a','https://name.local/a','https://user:pass@example.com/a','https://example.com:444/a'])assert.throws(()=>safeURL(u));
 for(const ip of ['127.0.0.1','10.2.3.4','169.254.169.254','100.64.0.1','192.168.1.1','::1','fc00::1','::ffff:127.0.0.1','2001:db8::1'])assert.equal(publicAddress(ip),false,ip);
 await assert.rejects(downloadOriginal('https://public.example.org/a',{resolve:resolver,fetcher:async()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1/'}})}));
 await assert.rejects(resolvePublic('public.example.org',async()=>Response.json({Status:0,Answer:[{type:1,data:'10.0.0.1'}]})));
});
test('checks each redirect DNS and rejects oversize/chunked and HTML',async()=>{
 let hosts=[];let n=0;await downloadOriginal('https://one.example.org/a',{resolve:async h=>hosts.push(h),fetcher:async()=>n++?new Response(pdf):new Response(null,{status:302,headers:{location:'https://two.example.org/b'}})});assert.deepEqual(hosts,['one.example.org','two.example.org']);
 for(const response of [new Response(pdf,{headers:{'content-length':'999'}}),new Response(pdf),new Response('<html>login</html>',{headers:{'content-type':'text/html'}})])await assert.rejects(downloadOriginal('https://public.example.org/a',{resolve:resolver,maxBytes:10,fetcher:async()=>response}));
});

test('DNS requests use Workers-compatible manual redirects and refuse redirect responses',async()=>{
 await assert.rejects(resolvePublic('public.example.org',async(u,o)=>{assert.equal(o.redirect,'manual');return new Response(null,{status:302,headers:{location:'https://private.local'}});}));
});
test('cloud delivery stores exact bytes and returns a compact named resource link',async()=>{
 let stored;const r=await moduleFile(args,'secret',async()=>Response.json(external),{resolve:resolver,fetcher:async()=>new Response(pdf,{headers:{'content-type':'application/pdf'}}),store:async(bytes,metadata)=>{stored={bytes,metadata};return 'https://worker.example.org/module-files/random/5-volumes.pdf';}});
 assert.deepEqual(stored.bytes,pdf);assert.equal(r.content[1].type,'resource_link');assert.equal(r.content[1].name,'5-volumes.pdf');assert.equal(r.content[1].mimeType,'application/pdf');assert.ok(JSON.stringify(r).length<1600);assert.equal(r.content[1].size,pdf.length);assert.deepEqual(r.structuredContent.file_resource,r.content[1]);
});
