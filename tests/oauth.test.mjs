import test from'node:test';
import assert from'node:assert/strict';
import vm from'node:vm';
import{createHash}from'node:crypto';
import{authorize,callback,popup,getConfig}from'../netlify/lib/oauth.mjs';
const origin='https://casadelbrigadier.netlify.app';
const env={CMS_SITE_URL:origin,GITHUB_REPOSITORY:'owner/repo',GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret-only'};
async function flow(){const res=await authorize(new Request(origin+'/api/auth?provider=github'),{env,now:()=>1000});const location=new URL(res.headers.get('location'));return{res,location,state:location.searchParams.get('state'),cookie:res.headers.get('set-cookie').split(';')[0]};}
const req=(f,extra='')=>new Request(origin+'/api/callback?state='+f.state+'&code=test-code'+extra,{headers:{cookie:f.cookie}});
test('OAuth start requests GitHub directly, with state, PKCE and a protected server cookie',async()=>{
 const f=await flow();assert.equal(f.res.status,302);assert.equal(f.location.origin,'https://github.com');assert.equal(f.location.searchParams.get('redirect_uri'),origin+'/api/callback');assert.equal(f.location.searchParams.get('code_challenge_method'),'S256');assert.equal(f.location.searchParams.get('scope'),'repo');assert.ok(f.state.length>=40);assert.match(f.res.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);assert.equal(f.res.headers.get('cache-control'),'no-store');assert.ok(!f.res.headers.get('location').includes(env.GITHUB_CLIENT_SECRET));
});
test('wrong state, expired state and altered cookies are rejected before calling GitHub',async()=>{
 const f=await flow();let calls=0;const fetcher=async()=>{calls++;throw new Error('must not run');};
 assert.equal((await callback(new Request(origin+'/api/callback?state=wrong&code=a',{headers:{cookie:f.cookie}}),{env,fetcher,now:()=>2000})).status,400);
 assert.equal((await callback(req(f),{env,fetcher,now:()=>602000})).status,400);
 assert.equal((await callback(new Request(origin+'/api/callback?state='+f.state+'&code=a',{headers:{cookie:f.cookie+'tampered'}}),{env,fetcher,now:()=>2000})).status,400);
 assert.equal((await callback(new Request(origin+'/api/callback?state='+f.state+'&code=a'),{env,fetcher,now:()=>2000})).status,400);
 assert.equal(calls,0);
});
test('authorized callback exchanges the code with PKCE and verifies repository write access',async()=>{
 const f=await flow();let calls=0;
 const fetcher=async(url,options)=>{calls++;if(calls===1){assert.equal(url,'https://github.com/login/oauth/access_token');assert.equal(options.body.get('client_secret'),env.GITHUB_CLIENT_SECRET);assert.equal(createHash('sha256').update(options.body.get('code_verifier')).digest('base64url'),f.location.searchParams.get('code_challenge'));return Response.json({access_token:'test-browser-token'});}assert.equal(url,'https://api.github.com/repos/owner/repo');assert.equal(options.headers.Authorization,'Bearer test-browser-token');return Response.json({permissions:{push:true}});};
 const response=await callback(req(f),{env,fetcher,now:()=>2000}),body=await response.text();assert.equal(response.status,200);assert.equal(calls,2);assert.match(body,/authorization:github:success:/);assert.match(body,/test-browser-token/);assert.doesNotMatch(body,/test-secret-only/);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);assert.match(response.headers.get('content-security-policy'),/nonce-/);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('GitHub denial and users without repository write access never receive a token',async()=>{
 const f=await flow();const denied=await callback(req(f,'&error=access_denied'),{env,now:()=>2000});assert.match(await denied.text(),/authorization:github:error:/);
 let calls=0;const fetcher=async()=>++calls===1?Response.json({access_token:'must-not-leak'}):Response.json({permissions:{push:false}});
 const result=await callback(req(f),{env,fetcher,now:()=>2000});const text=await result.text();assert.match(text,/authorization:github:error:/);assert.doesNotMatch(text,/must-not-leak/);
});
test('provider failures do not disclose exchange response, token or secrets',async()=>{
 const f=await flow();const result=await callback(req(f),{env,now:()=>2000,fetcher:async()=>{throw Error('private-provider-detail '+env.GITHUB_CLIENT_SECRET);}});const html=await result.text();assert.match(html,/authorization:github:error:/);assert.doesNotMatch(html,/private-provider-detail|test-secret-only/);
});
test('popup follows the actual Decap GitHub handshake and ignores wrong origin / sender / message',async()=>{
 const response=popup({token:'test-browser-token',provider:'github'},origin),html=await response.text(),code=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
 let listener;const sent=[];const opener={postMessage:(...args)=>sent.push(args)};const window={opener,addEventListener:(_name,fn)=>{listener=fn;},removeEventListener:()=>{}};
 vm.runInNewContext(code,{window,document:{querySelector:()=>({})}});
 assert.deepEqual(sent[0],['authorizing:github',origin]);
 listener({origin:'https://evil.example',source:opener,data:'authorizing:github'});
 listener({origin,source:{},data:'authorizing:github'});
 listener({origin,source:opener,data:'wrong'});assert.equal(sent.length,1);
 listener({origin,source:opener,data:'authorizing:github'});assert.equal(sent.length,2);assert.match(sent[1][0],/^authorization:github:success:/);assert.equal(sent[1][1],origin);
});
test('unconfigured functions, invalid origin and non-GET requests fail closed',async()=>{
 assert.equal((await authorize(new Request(origin+'/api/auth'),{env:{}})).status,503);
 assert.equal((await authorize(new Request('https://evil.example/api/auth'),{env})).status,403);
 assert.equal((await authorize(new Request(origin+'/api/auth?provider=gitlab'),{env})).status,400);
 assert.equal((await authorize(new Request(origin+'/api/auth',{method:'POST'}),{env})).status,405);
 assert.equal((await callback(new Request(origin+'/api/callback',{method:'POST'}),{env})).status,405);
 assert.throws(()=>getConfig({...env,CMS_SITE_URL:origin+'/casa/'}),/sin rutas/);
});
