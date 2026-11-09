import test from'node:test';
import assert from'node:assert/strict';
import vm from'node:vm';
import{readFile}from'node:fs/promises';
const source=await readFile(new URL('../public/admin/init.js',import.meta.url),'utf8');
const origin='https://casadelbrigadier.netlify.app';
const config=JSON.parse(await readFile(new URL('../public/admin/config.yml',import.meta.url),'utf8'));
async function boot(repo){
 const status={textContent:'',hidden:false};let loaded,initialized;
 const window={};const document={getElementById:()=>status,createElement:()=>({}),head:{appendChild:script=>{assert.equal(window.CMS_MANUAL_INIT,true);loaded=script.src;window.CMS={init:options=>{initialized=options;}};script.onload();}}};
 await vm.runInNewContext(source,{window,document,location:{origin},fetch:async()=>({ok:true,json:async()=>({...config,backend:{...config.backend,repo,base_url:origin}})})});
 return{status,loaded,initialized};
}
test('admin loads the pinned real Decap app with the configured GitHub backend',async()=>{
 const r=await boot('owner/repo');assert.equal(r.loaded,'https://cdn.jsdelivr.net/npm/decap-cms@3.17.3/dist/decap-cms.js');assert.equal(r.initialized.config.backend.name,'github');assert.equal(r.initialized.config.backend.repo,'owner/repo');assert.equal(r.initialized.config.load_config_file,false);assert.equal(r.status.hidden,true);
});
test('an unconfigured admin explains the missing setup instead of simulating login or publication',async()=>{
 const r=await boot('CONFIGURAR/REPOSITORIO');assert.equal(r.loaded,undefined);assert.equal(r.initialized,undefined);assert.match(r.status.textContent,/GITHUB_REPOSITORY/);
});
