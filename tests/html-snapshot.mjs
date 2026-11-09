export function normalizeBody(html){
 return html.match(/<body[\s\S]*<\/body>/)[0]
  .replace(/<script type="application\/json" id="timeline-data">[\s\S]*?<\/script>/,'')
  .replace(/\bdata-photo="(?!\/|https:)/g,'data-photo="/assets/')
  .replace(/\b(src|data-photo)="\/?assets\//g,'$1="/assets/')
  .replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"')
  .replace(/>\s+</g,'><').trim();
}
