'use strict';
(async()=>{
 const status=document.getElementById('cms-status');
 try{
  const response=await fetch('/admin/config.yml',{cache:'no-store'});
  if(!response.ok)throw new Error('No se encontró /admin/config.yml. Ejecutá npm run build.');
  const config=await response.json();
  if(config.backend.repo==='CONFIGURAR/REPOSITORIO')throw new Error('Falta configurar GITHUB_REPOSITORY en Netlify y volver a desplegar. Seguí la guía INTEGRACION-CMS.md del proyecto.');
  if(location.origin!==config.backend.base_url)throw new Error('Para editar el contenido abrí '+config.backend.base_url+'/admin/. La autenticación está vinculada al dominio principal.');
  window.CMS_MANUAL_INIT=true;
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/decap-cms@3.17.3/dist/decap-cms.js';
  script.onload=()=>{
   if(!window.CMS){status.textContent='No se pudo iniciar Decap CMS.';return;}
   window.CMS.init({config:{...config,load_config_file:false}});
   status.hidden=true;
  };
  script.onerror=()=>{status.textContent='No se pudo descargar Decap CMS. Revisá la conexión e intentá nuevamente.';};
  document.head.appendChild(script);
 }catch(error){status.textContent=error.message;}
})();
