import { moduleFile, fileOriginal } from './module-file.mjs';

// Resource URIs returned by canvas_module_file / canvas_file_original. They name the Canvas
// source and the SHA-256 of the bytes; no download URL or credential is ever embedded.
//   canvas-file://module/<course>/<module>/<item>/<sha256>/<name>
//   canvas-file://file/<file_id>/<sha256>/<name>
export function fileResourceURI(args,metadata){
 const tail=`${metadata.sha256}/${encodeURIComponent(metadata.name)}`;
 return args.file_id!==undefined?`canvas-file://file/${args.file_id}/${tail}`:`canvas-file://module/${args.course_id}/${args.module_id}/${args.item_id}/${tail}`;
}
export function parseFileResourceURI(uri){
 const m=typeof uri==='string'&&(uri.match(/^canvas-file:\/\/module\/([1-9]\d*)\/([1-9]\d*)\/([1-9]\d*)\/([a-f0-9]{64})\/([^/?#]+)$/)||uri.match(/^canvas-file:\/\/file\/([1-9]\d*)\/([a-f0-9]{64})\/([^/?#]+)$/));
 if(!m)throw new Error('Canvas file: invalid resource URI.');
 const isFile=uri.startsWith('canvas-file://file/');
 const args=isFile?{file_id:Number(m[1])}:{course_id:Number(m[1]),module_id:Number(m[2]),item_id:Number(m[3])};
 if(Object.values(args).some(x=>!Number.isSafeInteger(x)))throw new Error('Canvas file: invalid resource IDs.');
 let name;try{name=decodeURIComponent(isFile?m[3]:m[5]);}catch{throw new Error('Canvas file: invalid filename.');}
 return {kind:isFile?'file':'module',args,sha256:isFile?m[2]:m[4],name};
}
export async function readFileResource(uri,token,apiFetch,options){
 const expected=parseFileResourceURI(uri);
 // Recheck current Canvas access and the source on every authenticated resource read.
 const fetchIt=expected.kind==='file'?fileOriginal:moduleFile;
 const result=await fetchIt(expected.args,token,apiFetch,options);
 if(result.structuredContent.sha256!==expected.sha256||result.structuredContent.name!==expected.name)throw new Error('Canvas file: resource changed; fetch the file again.');
 return {contents:[{...result.content[1].resource,uri}]};
}
