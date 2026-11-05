import { extraSpecs } from './read-tools.mjs';
import { readFileContent } from './file-content.mjs';
import { CANVAS_HOST } from './config.mjs';
export const ORIGIN = 'https://' + CANVAS_HOST;
const id = {type:'integer',minimum:1};
const page = {type:'integer',minimum:1,maximum:1000};
const def = (name,description,properties={},required=[]) => ({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}});
export const tools = [
 def('canvas_profile','Read the connected Canvas profile.'),
 def('canvas_courses','List enrolled courses; use returned course IDs.',{page}),
 def('canvas_assignments','List course assignments including your submission status. Results are paginated.',{course_id:id,page},['course_id']),
 def('canvas_assignment','Read one assignment, rubric and your submission status.',{course_id:id,assignment_id:id},['course_id','assignment_id']),
 def('canvas_announcements','Read course announcements.',{course_id:id,page},['course_id']),
 def('canvas_modules','List course modules.',{course_id:id,page},['course_id']),
 def('canvas_module_items','List the contents of a course module.',{course_id:id,module_id:id,page},['course_id','module_id']),
 def('canvas_page','Read a course page by page_url from a module item.',{course_id:id,page_url:{type:'string',minLength:1,maxLength:250}},['course_id','page_url']),
 def('canvas_planner','Read upcoming planner items over a date range (YYYY-MM-DD). Includes due dates and completion information.',{start_date:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},end_date:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},page},['start_date','end_date'])
];
for(const s of extraSpecs)tools.push(def(s.name,s.description,{...s.properties,page},s.required));
function validate(p,v,k){
 if(p.type==='integer'&&(!Number.isSafeInteger(v)||v<p.minimum||v>(p.maximum??Number.MAX_SAFE_INTEGER)))throw new Error('Invalid '+k);
 if(p.type==='string'&&(typeof v!=='string'||v.length>(p.maxLength??100)||v.length<(p.minLength??0)||p.pattern&&!new RegExp(p.pattern).test(v)||p.enum&&!p.enum.includes(v)))throw new Error('Invalid '+k);
 if(p.type==='array'){if(!Array.isArray(v)||v.length<p.minItems||v.length>p.maxItems)throw new Error('Invalid '+k);for(const x of v)validate(p.items,x,k);}
}
export function endpoint(name,args={}) {
 const tool=tools.find(t=>t.name===name); if(!tool) throw new Error('Unknown tool');
 const schema=tool.inputSchema;
 for(const k of Object.keys(args)) if(!schema.properties[k]) throw new Error('Unexpected argument');
 for(const k of schema.required) if(args[k]===undefined) throw new Error('Missing argument: '+k);
 for(const [k,v] of Object.entries(args))validate(schema.properties[k],v,k);
 const extra=extraSpecs.find(s=>s.name===name);
 if(extra){
  if(['canvas_files','canvas_folders'].includes(name)&&args.context_type!=='user'&&!args.context_id)throw new Error('Missing context_id');
  const path=typeof extra.route==='function'?extra.route(args):extra.route;
  const u=new URL('/api/v1'+path,ORIGIN);
  const query=typeof extra.query==='function'?extra.query(args):extra.query;
  for(const [key,value] of Object.entries(query))if(value!==undefined)for(const x of Array.isArray(value)?value:[value])u.searchParams.append(key,String(x));
  u.searchParams.set('per_page','50');u.searchParams.set('page',String(args.page??1));
  return u;
 }
 const c=args.course_id, a=args.assignment_id, m=args.module_id;
 const routes={canvas_profile:'/users/self/profile',canvas_courses:'/courses',canvas_assignments:`/courses/${c}/assignments`,canvas_assignment:`/courses/${c}/assignments/${a}`,canvas_announcements:`/courses/${c}/discussion_topics`,canvas_modules:`/courses/${c}/modules`,canvas_module_items:`/courses/${c}/modules/${m}/items`,canvas_page:`/courses/${c}/pages/${encodeURIComponent(args.page_url??'')}`,canvas_planner:'/planner/items'};
 const u=new URL('/api/v1'+routes[name],ORIGIN);
 u.searchParams.set('per_page','50');u.searchParams.set('page',String(args.page??1));
 if(name==='canvas_courses') {u.searchParams.set('enrollment_state','active');u.searchParams.append('include[]','total_scores');}
 if(name==='canvas_assignments'||name==='canvas_assignment') u.searchParams.append('include[]','submission');
 if(name==='canvas_announcements') u.searchParams.set('only_announcements','true');
 if(name==='canvas_planner'){u.searchParams.set('start_date',args.start_date);u.searchParams.set('end_date',args.end_date);}
 return u;
}
export async function callCanvas(name,args,token,fetcher=fetch){
 const u=endpoint(name,args);
 const r=await fetcher(u,{method:'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'CanvasAIConnector/1.0 (read-only personal integration)'},redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(r.status===406){
  const body=(await r.text()).slice(0,16000);
  const markers=['Not Acceptable','Apache','ModSecurity','mod_security','Cloudflare','cloudflare','challenge','blocked','Access Denied','Request Rejected'].filter(x=>body.includes(x));
  const ray=r.headers.get('cf-ray')??'';
  const host=body.match(/Apache Server at ([a-z0-9.-]+) Port [0-9]+/i)?.[1]?.toLowerCase();
  const safeHost=host&&/^(?:[a-z0-9-]+\.)*(?:canvaslms\.com|instructure\.com)$/.test(host)?host:'unavailable';
  const negotiation=body.includes('An appropriate representation of the requested resource could not be found');
  throw new Error('Canvas returned HTTP 406 ('+(r.headers.get('content-type')??'unknown').split(';')[0]+'; '+(r.headers.get('server')??'unknown')+'); response markers: '+markers.join(', ')+'; upstream host: '+safeHost+'; negotiation page: '+negotiation+'; ray: '+(/^[a-f0-9]{16,32}-[A-Z]{3}$/.test(ray)?ray:'unavailable'));
 }
 if(!r.ok)throw new Error(r.status===401?'Canvas authorization expired; reconnect.':`Canvas returned HTTP ${r.status} (${(r.headers.get('content-type')??'unknown').split(';')[0]}; ${r.headers.get('server')??'unknown'})`);
 const data=await r.json();
 if(name==='canvas_file_content')return readFileContent(data,args,fetcher);
 const next=/<[^>]+>;\s*rel="next"/.test(r.headers.get('link')??'');
 return {data,has_more:next,next_page:next?(args.page??1)+1:null,source_url:u.href};
}
