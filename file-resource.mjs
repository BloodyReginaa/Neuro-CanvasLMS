import { moduleFile } from './module-file.mjs';
export function fileResourceURI(args,metadata){return `canvas-file://module/${args.course_id}/${args.module_id}/${args.item_id}/${metadata.sha256}/${encodeURIComponent(metadata.name)}`;}
export function parseFileResourceURI(uri){
 const m=typeof uri==='string'&&uri.match(/^canvas-file:\/\/module\/([1-9]\d*)\/([1-9]\d*)\/([1-9]\d*)\/([a-f0-9]{64})\/([^/?#]+)$/);
 if(!m)throw new Error('Canvas file: invalid resource URI.');
 const args={course_id:Number(m[1]),module_id:Number(m[2]),item_id:Number(m[3])};
 if(Object.values(args).some(x=>!Number.isSafeInteger(x)))throw new Error('Canvas file: invalid resource IDs.');
 let name;try{name=decodeURIComponent(m[5]);}catch{throw new Error('Canvas file: invalid filename.');}
 return {args,sha256:m[4],name};
}
export async function readFileResource(uri,token,apiFetch,options){
 const expected=parseFileResourceURI(uri);
 // Recheck current Canvas access and source on every authenticated resource read.
 const result=await moduleFile(expected.args,token,apiFetch,options);
 if(result.structuredContent.sha256!==expected.sha256||result.structuredContent.name!==expected.name)throw new Error('Canvas file: resource changed; call canvas_module_file again.');
 return {contents:[{...result.content[1].resource,uri}]};
}
