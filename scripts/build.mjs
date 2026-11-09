import { readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const ROUTES={inicio:'index.html',historia:'historia/index.html',casa:'casa/index.html',patrimonio:'patrimonio/index.html',visita:'visita/index.html'};
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function lookup(context,path){
 let value=context;
 for(const key of path.split('.')){
  if(['__proto__','prototype','constructor'].includes(key)||value==null||!Object.hasOwn(value,key))throw new Error('Contenido faltante: '+path);
  value=value[key];
 }
 if(typeof value!=='string')throw new Error('El campo debe ser texto: '+path);
 return value;
}
export function render(template,context){
 return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g,(_all,path)=>path==='timeline_json'?context.timeline_json:escapeHTML(lookup(context,path)));
}
const readJSON=async p=>JSON.parse(await readFile(p,'utf8'));
export function configuration(settings,env={}){
 const repo=(env.GITHUB_REPOSITORY||settings.repo||'').trim();
 if(repo&&!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('GITHUB_REPOSITORY debe tener formato usuario/repositorio.');
 const branch=(env.GITHUB_BRANCH||settings.branch||'main').trim();
 if(!branch||/[\s~^:?*\[\\]/.test(branch)||branch.includes('..'))throw new Error('GITHUB_BRANCH no es válido.');
 const url=new URL(env.CMS_SITE_URL||settings.site_url);
 if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw new Error('CMS_SITE_URL debe ser el origen HTTPS, sin /casa/ ni otra ruta.');
 if(env.NETLIFY==='true'&&!repo)throw new Error('Configurá GITHUB_REPOSITORY en Netlify antes de publicar el CMS.');
 return {repo,branch,origin:url.origin};
}
async function validatePage(page,publicDir){
 async function walk(value,path=''){
  if(value&&typeof value==='object'){
   for(const [k,v]of Object.entries(value))await walk(v,path?path+'.'+k:k);
  }else if(typeof value!=='string')throw new Error('Valor de contenido inválido: '+path);
  else if(path.endsWith('.archivo')){
   if(value.startsWith('/assets/')&&!value.includes('..'))await access(join(publicDir,value));
   else if(!/^https:\/\//.test(value))throw new Error('La imagen debe estar en /assets/ o usar HTTPS: '+path);
  }else if(path.includes('.enlaces.')&&!/^(https?:\/\/|mailto:|tel:)/i.test(value))throw new Error('Destino de enlace no válido: '+path);
 }
 await walk(page);
 if(page.cronologia){
  if(page.cronologia.length!==5)throw new Error('La línea de tiempo conserva cinco hitos.');
  const years=page.cronologia.map(x=>x.anio);
  if(years.some(y=>!/^\d{4}$/.test(y))||new Set(years).size!==years.length)throw new Error('Los años de la línea de tiempo deben ser únicos y tener cuatro dígitos.');
 }
}
export async function build({root=ROOT,out=join(root,'dist'),env=process.env}={}){
 const settings=await readJSON(join(root,'cms/settings.json'));
 const config=configuration(settings,env);
 const site=await readJSON(join(root,'content/site.json'));
 const cmsSource=await readJSON(join(root,'public/admin/config.yml'));
 const complete=(fields,data)=>{for(const field of fields){if(field.widget==='object'){data[field.name]??={};complete(field.fields,data[field.name]);}else if(field.widget==='list'){for(const row of data[field.name]||[])complete(field.fields,row);}else if(!Object.hasOwn(data,field.name)&&field.required===false)data[field.name]='';}};
 for(const collection of cmsSource.collections)for(const file of collection.files)if(file.file==='content/site.json')complete(file.fields,site);
 const publicDir=join(root,'public');
 const pages={};
 for(const slug of Object.keys(ROUTES)){pages[slug]=await readJSON(join(root,'content/pages',slug+'.json'));
  const entry=cmsSource.collections.flatMap(c=>c.files).find(f=>f.name===slug);complete(entry.fields,pages[slug]);await validatePage(pages[slug],publicDir);}
 // Validate everything before replacing a previous successful output.
 const compiled={};
 for(const[slug,route]of Object.entries(ROUTES)){
  const page=pages[slug];
  const firstImage=Object.values(page.secciones.inicio?.imagenes||{})[0]?.archivo||'/assets/fachada.png';
  const timeline=Object.fromEntries((page.cronologia||[]).map(item=>[item.anio,[item.titulo,item.texto]]));
  const context={page,site,canonical_url:config.origin+(slug==='inicio'?'/':'/'+slug+'/'),social_image_url:new URL(firstImage,config.origin).href,timeline_json:JSON.stringify(timeline).replace(/</g,'\\u003c')};
  compiled[route]=render(await readFile(join(root,'templates',route),'utf8'),context);
 }
 await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});await cp(publicDir,out,{recursive:true});
 for(const[route,html]of Object.entries(compiled)){await mkdir(dirname(join(out,route)),{recursive:true});await writeFile(join(out,route),html);}
 const collections=cmsSource.collections;
 const cms={backend:{name:'github',repo:config.repo||'CONFIGURAR/REPOSITORIO',branch:config.branch,base_url:config.origin,auth_endpoint:'api/auth'},locale:'es',site_url:config.origin,display_url:config.origin,media_folder:'public/assets',public_folder:'/assets',publish_mode:'simple',editor:{preview:false},collections};
 await mkdir(join(out,'admin'),{recursive:true});
 // JSON is a YAML subset; Decap reads this file through its standard config.yml loader.
 await writeFile(join(out,'admin/config.yml'),JSON.stringify(cms,null,2)+'\n');
 return {out,configured:!!config.repo,routes:Object.values(ROUTES)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 build().then(result=>console.log('Sitio construido: '+result.routes.length+' páginas. '+(result.configured?'Backend GitHub configurado.':'Falta indicar GITHUB_REPOSITORY para activar el acceso al CMS.'))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
