import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
const COOKIE='brigadier_oauth';
const AGE=600;
export function getConfig(env=process.env){
 let settings={};try{settings=JSON.parse(readFileSync(new URL('../../cms/settings.json',import.meta.url),'utf8'));}catch{}
 const site=new URL(env.CMS_SITE_URL||settings.site_url||'https://casadelbrigadier.netlify.app');
 if(site.protocol!=='https:'||site.pathname!=='/'||site.search||site.hash||site.username||site.password)throw new Error('CMS_SITE_URL debe ser un origen HTTPS sin rutas.');
 const origin=site.origin;
 const repo=(env.GITHUB_REPOSITORY||settings.repo||'').trim();
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('Falta configurar GITHUB_REPOSITORY.');
 if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)throw new Error('Faltan GITHUB_CLIENT_ID y GITHUB_CLIENT_SECRET en las variables de Functions.');
 const scope=env.GITHUB_OAUTH_SCOPE||settings.oauth_scope||'repo';
 if(!['repo','public_repo'].includes(scope))throw new Error('GITHUB_OAUTH_SCOPE no es válido.');
 return {origin,repo,scope,clientId:env.GITHUB_CLIENT_ID,secret:env.GITHUB_CLIENT_SECRET};
}
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function seal(value,secret){const data=Buffer.from(JSON.stringify(value)).toString('base64url');return data+'.'+createHmac('sha256',secret).update(data).digest('base64url');}
function unseal(value,secret){
 if(!value||value.length>4096)throw new Error('Estado de autenticación no válido.');
 const[data,sig,...rest]=value.split('.');
 if(rest.length||!sig||!equal(sig,createHmac('sha256',secret).update(data).digest('base64url')))throw new Error('Estado de autenticación no válido.');
 return JSON.parse(Buffer.from(data,'base64url').toString('utf8'));
}
function cookie(value,maxAge=AGE){return `${COOKIE}=${value}; Path=/api/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;}
export const clearCookie=()=>cookie('',0);
const headers={'Cache-Control':'no-store','Pragma':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
function text(message,status=400){return new Response(message,{status,headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}});}
function validRequest(request,cfg){return new URL(request.url).origin===cfg.origin;}
export async function authorize(request,{env=process.env,now=Date.now}={}){
 if(request.method!=='GET')return text('Método no permitido.',405);
 let cfg;try{cfg=getConfig(env);}catch(e){return text(e.message,503);}
 if(!validRequest(request,cfg))return text('Dominio no autorizado.',403);
 const url=new URL(request.url);
 if(url.searchParams.has('provider')&&url.searchParams.get('provider')!=='github')return text('Proveedor no autorizado.');
 const state=randomBytes(32).toString('base64url');const verifier=randomBytes(48).toString('base64url');
 const challenge=createHash('sha256').update(verifier).digest('base64url');
 const stored=seal({state,verifier,issued:now(),origin:cfg.origin},cfg.secret);
 const github=new URL('https://github.com/login/oauth/authorize');
 for(const[k,v]of Object.entries({client_id:cfg.clientId,redirect_uri:cfg.origin+'/api/callback',scope:cfg.scope,state,code_challenge:challenge,code_challenge_method:'S256'}))github.searchParams.set(k,v);
 return new Response(null,{status:302,headers:{...headers,Location:github.href,'Set-Cookie':cookie(stored)}});
}
export function popup(payload,origin,{error=false}={}){
 const nonce=randomBytes(18).toString('base64url');
 const safe=value=>JSON.stringify(value).replace(/</g,'\\u003c');
 const message='authorization:github:'+(error?'error:':'success:')+JSON.stringify(payload);
 const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Acceso a Decap CMS</title></head><body><p>Completando el acceso al editor. Esta ventana se cerrará automáticamente.</p><script nonce="${nonce}">const target=${safe(origin)};const result=${safe(message)};function receive(event){if(event.origin!==target||event.source!==window.opener||event.data!=='authorizing:github')return;window.removeEventListener('message',receive);window.opener.postMessage(result,target);}if(window.opener){window.addEventListener('message',receive);window.opener.postMessage('authorizing:github',target);}else{document.querySelector('p').textContent='Abrí el acceso desde /admin/ y volvé a intentarlo.';}</script></body></html>`;
 return new Response(html,{status:200,headers:{...headers,'Content-Type':'text/html; charset=utf-8','Set-Cookie':clearCookie(),'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`}});
}
export async function callback(request,{env=process.env,fetcher=fetch,now=Date.now}={}){
 if(request.method!=='GET')return text('Método no permitido.',405);
 let cfg;try{cfg=getConfig(env);}catch(e){return text(e.message,503);}
 if(!validRequest(request,cfg))return text('Dominio no autorizado.',403);
 const url=new URL(request.url);
 let stored;
 try{
  const raw=request.headers.get('cookie')||'';
  const value=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  stored=unseal(value,cfg.secret);
  if(!equal(stored.state,url.searchParams.get('state'))||stored.origin!==cfg.origin||typeof stored.issued!=='number'||now()-stored.issued>AGE*1000||now()<stored.issued)throw new Error();
 }catch{return new Response('La sesión de acceso venció o no es válida. Cerrá esta ventana y volvé a entrar desde /admin/.',{status:400,headers:{...headers,'Set-Cookie':clearCookie()}});}
 if(url.searchParams.has('error')||!url.searchParams.get('code'))return popup({message:'GitHub no autorizó el acceso. Volvé a intentarlo desde el editor.'},cfg.origin,{error:true});
 try{
  const response=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.secret,code:url.searchParams.get('code'),redirect_uri:cfg.origin+'/api/callback',code_verifier:stored.verifier}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('exchange');
  const result=await response.json();
  if(typeof result.access_token!=='string'||!result.access_token||result.error)throw new Error('exchange');
  const permission=await fetcher('https://api.github.com/repos/'+cfg.repo,{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+result.access_token,'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(12000)});
  const repo=permission.ok?await permission.json():{};
  if(!permission.ok||!(repo.permissions?.push||repo.permissions?.admin))return popup({message:'Tu cuenta de GitHub necesita permiso de escritura en el repositorio de este sitio.'},cfg.origin,{error:true});
  return popup({token:result.access_token,provider:'github'},cfg.origin);
 }catch{return popup({message:'No se pudo completar el acceso con GitHub. Revisá la configuración OAuth e intentá nuevamente.'},cfg.origin,{error:true});}
}
