import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,cp,rm,mkdir}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{createHash}from'node:crypto';
import{build,ROOT,ROUTES,render,configuration}from'../scripts/build.mjs';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const env={GITHUB_REPOSITORY:'ejemplo/casa-del-brigadier',CMS_SITE_URL:'https://casadelbrigadier.netlify.app'};
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),'brigadier-cms-'));try{for(const name of ['public','templates','content','cms'])await cp(join(ROOT,name),join(dir,name),{recursive:true});return await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('five pages and /casa/ are real static documents, with no layout stylesheet changes',async()=>fixture(async root=>{
 await build({root,env});
 const expected=await json(join(ROOT,'tests/baseline-styles.json'));
 for(const[file,sha]of Object.entries(expected)){const data=await readFile(join(root,'dist',file));assert.equal(createHash('sha256').update(data).digest('hex'),sha,file);}
 for(const route of Object.values(ROUTES)){const html=await readFile(join(root,'dist',route),'utf8');assert.match(html,/<h1>/);assert.match(html,/class="brand-silhouette"/);assert.match(html,/class="arrow-icon"/);assert.match(html,/href="\/casa\/"/);assert.doesNotMatch(html,/\{\{\s*page\./);assert.doesNotMatch(html,/chatgpt\.site/);}
 const config=await json(join(root,'dist/admin/config.yml'));
 assert.equal(config.backend.name,'github');assert.equal(config.backend.repo,env.GITHUB_REPOSITORY);assert.equal(config.backend.auth_endpoint,'api/auth');assert.equal(config.backend.branch,'main');assert.equal(config.media_folder,'public/assets');assert.equal(config.public_folder,'/assets');
 assert.deepEqual(config.collections[0].files.map(x=>x.name),Object.keys(ROUTES));
}));
test('published title, paragraph and image edits in every CMS page reach generated HTML',async()=>fixture(async root=>{
 await mkdir(join(root,'public/assets/uploads'),{recursive:true});await cp(join(root,'public/assets/patio.jpg'),join(root,'public/assets/uploads/prueba.jpg'));
 for(const slug of Object.keys(ROUTES)){
  const path=join(root,'content/pages',slug+'.json'),data=await json(path);
  const hero=data.secciones.inicio;
  const title=Object.keys(hero.textos).find(x=>x.startsWith('titulo_'));
  const paragraph=Object.keys(hero.textos).find(x=>x.startsWith('parrafo_'));
  hero.textos[title]='Título editado '+slug;hero.textos[paragraph]='Párrafo publicado '+slug;
  hero.imagenes.imagen_1.archivo='/assets/uploads/prueba.jpg';hero.imagenes.imagen_1.alternativo='Imagen editada '+slug;
  await writeFile(path,JSON.stringify(data));
 }
 await build({root,env});
 for(const[slug,route]of Object.entries(ROUTES)){
  const html=await readFile(join(root,'dist',route),'utf8');assert.ok(html.includes('Título editado '+slug));assert.ok(html.includes('Párrafo publicado '+slug));assert.ok(html.includes('src="/assets/uploads/prueba.jpg"'));assert.ok(html.includes('alt="Imagen editada '+slug+'"'));
  if(['historia','casa','patrimonio'].includes(slug))assert.ok(html.includes('data-photo="/assets/uploads/prueba.jpg"'));
 }
 await readFile(join(root,'dist/assets/uploads/prueba.jpg'));
}));
test('timeline text has one source for first paint and interactive changes',async()=>fixture(async root=>{
 const file=join(root,'content/pages/inicio.json'),data=await json(file);data.cronologia[0]={anio:'1800',titulo:'Primer título editado',texto:'Descripción editada de la cronología'};await writeFile(file,JSON.stringify(data));
 await build({root,env});const html=await readFile(join(root,'dist/index.html'),'utf8');assert.match(html,/data-year="1800"/);assert.match(html,/id="story-year"[^>]*>1800</);assert.ok(html.includes('Primer título editado'));
 const script=html.match(/id="timeline-data">([^<]*)<\/script>/)[1];assert.deepEqual(JSON.parse(script)['1800'],['Primer título editado','Descripción editada de la cronología']);
 const app=await readFile(join(root,'dist/app.js'),'utf8');assert.doesNotMatch(app,/const stories=\s*\{/);assert.match(app,/timeline-data/);
}));
test('shared header and footer edits propagate to all five pages',async()=>fixture(async root=>{
 const file=join(root,'content/site.json'),data=await json(file),key=Object.keys(data.cabecera).find(k=>data.cabecera[k]==='Casa del Brigadier');assert.ok(key);data.cabecera[key]='Nombre editado';await writeFile(file,JSON.stringify(data));await build({root,env});
 for(const route of Object.values(ROUTES))assert.ok((await readFile(join(root,'dist',route),'utf8')).includes('Nombre editado'));
}));
test('template rendering escapes authored text and refuses missing / unsafe fields',()=>{
 assert.equal(render('<h1>{{ page.title }}</h1>',{page:{title:'<script>alert("x")</script>'}}),'<h1>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</h1>');
 assert.throws(()=>render('{{ page.missing }}',{page:{}}),/faltante/);
 assert.throws(()=>render('{{ page.__proto__.x }}',{page:{}}),/faltante/);
});
test('invalid image and duplicate timeline years stop publication instead of deploying broken content',async()=>fixture(async root=>{
 const file=join(root,'content/pages/inicio.json'),data=await json(file);data.cronologia[1].anio=data.cronologia[0].anio;await writeFile(file,JSON.stringify(data));await assert.rejects(build({root,env}),/únicos/);
 data.cronologia[1].anio='1819';data.secciones.inicio.imagenes.imagen_1.archivo='/assets/ausente.jpg';await writeFile(file,JSON.stringify(data));await assert.rejects(build({root,env}),/ENOENT/);
}));
test('configuration distinguishes the root site origin from the preserved /casa/ route',()=>{
 const defaults={site_url:env.CMS_SITE_URL,repo:'',branch:'main'};
 assert.throws(()=>configuration(defaults,{NETLIFY:'true'}),/GITHUB_REPOSITORY/);
 assert.throws(()=>configuration(defaults,{...env,CMS_SITE_URL:env.CMS_SITE_URL+'/casa/'}),/sin \/casa\//);
 assert.throws(()=>configuration(defaults,{...env,GITHUB_REPOSITORY:'https://github.com/a/b'}),/formato/);
 assert.equal(configuration(defaults,env).origin,env.CMS_SITE_URL);
});
test('CMS fields cover exactly the structured JSON and no fields exist only in the UI',async()=>{
 const config=await json(join(ROOT,'public/admin/config.yml'));
 function visit(fields,data,path){for(const field of fields){assert.ok(Object.hasOwn(data,field.name),path+'.'+field.name);const value=data[field.name];if(field.widget==='object')visit(field.fields,value,path+'.'+field.name);if(field.widget==='list')for(const row of value)visit(field.fields,row,path+'.'+field.name);}}
 for(const collection of config.collections)for(const file of collection.files)visit(file.fields,await json(join(ROOT,file.file)),file.file);
});
test('the initial generated body preserves the original markup and visible content on all five routes',async()=>fixture(async root=>{
 const{normalizeBody}=await import('./html-snapshot.mjs');const expected=await json(join(ROOT,'tests/baseline-dom.json'));await build({root,env});
 for(const[route,hash]of Object.entries(expected)){const html=await readFile(join(root,'dist',route),'utf8');assert.equal(createHash('sha256').update(normalizeBody(html)).digest('hex'),hash,route);}
}));
test('optional fields cleared by the CMS remain valid empty text instead of breaking publication',async()=>fixture(async root=>{
 const path=join(root,'content/pages/historia.json'),data=await json(path);delete data.secciones.inicio.imagenes.imagen_1.epigrafe;const key=Object.keys(data.secciones.inicio.textos).find(k=>k.startsWith('parrafo_'));delete data.secciones.inicio.textos[key];await writeFile(path,JSON.stringify(data));await build({root,env});assert.ok((await readFile(join(root,'dist/historia/index.html'),'utf8')).includes('data-caption=""'));
}));
