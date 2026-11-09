'use strict';
const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menú');}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motionPreference.matches;
// Prepare staggered groups before the existing reveal observer starts.
document.querySelector('.brigadier-divider')?.classList.add('reveal');
document.querySelectorAll('.collection,.space-side,.catalogue-grid,.detail-gallery-grid,.activity-list').forEach(group=>{
 [...group.children].forEach((item,index)=>{if(item.classList.contains('reveal'))item.style.setProperty('--reveal-delay',Math.min(index*100,240)+'ms');});
});
motionPreference.addEventListener('change',event=>{
 reduced=event.matches;
 if(reduced){document.body.classList.remove('motion-ready');document.getAnimations().forEach(animation=>animation.cancel());document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));}
});
if('IntersectionObserver' in window){
 if(!reduced){document.body.classList.add('motion-ready');const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObserver.unobserve(e.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));}

}
window.addEventListener('scroll',()=>document.querySelector('.header').classList.toggle('scrolled',window.scrollY>20),{passive:true});
const stories=JSON.parse(document.querySelector('#timeline-data')?.textContent||'{}');
document.querySelectorAll('[data-year]').forEach(button=>button.addEventListener('click',()=>{const year=button.dataset.year;document.querySelectorAll('[data-year]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});document.querySelector('#story-year').textContent=year;document.querySelector('#story-title').textContent=stories[year][0];document.querySelector('#story-text').textContent=stories[year][1];if(!reduced&&document.querySelector('.timeline-story').animate)document.querySelector('.timeline-story').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:300});}));
const activities=[...document.querySelectorAll('.activity-details details')];
activities.forEach(detail=>detail.addEventListener('toggle',()=>{if(!detail.open)return;activities.forEach(d=>{if(d!==detail)d.open=false;});const img=document.querySelector('#activity-image');img.src='/assets/'+detail.dataset.image;img.alt=detail.dataset.alt;}));
const photos=[...document.querySelectorAll('[data-photo]')];const dialog=document.querySelector('.lightbox');let currentPhoto=0;
function showPhoto(i){currentPhoto=(i+photos.length)%photos.length;const photo=photos[currentPhoto];document.querySelector('#lightbox-image').src=(photo.dataset.photo.startsWith('/')||/^https:\/\//.test(photo.dataset.photo)?photo.dataset.photo:'/assets/'+photo.dataset.photo);document.querySelector('#lightbox-image').alt=(photo.querySelector('img')?.alt||photo.dataset.alt||'Fotografía de la Casa del Brigadier');document.querySelector('#lightbox-caption').textContent=photo.dataset.caption;document.querySelector('.lightbox-count').textContent=String(currentPhoto+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0');}
photos.forEach((photo,i)=>photo.addEventListener('click',()=>{showPhoto(i);dialog.showModal();document.body.style.overflow='hidden';}));
let closingPhoto=false;
function closePhoto(){
 if(!dialog.open||closingPhoto)return;
 if(reduced||!dialog.animate){dialog.close();return;}
 closingPhoto=true;
 const finish=()=>{closingPhoto=false;dialog.close();};
 dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(10px) scale(.985)'}],{duration:180,easing:'ease-in'}).finished.then(finish,finish);
}
dialog.addEventListener('cancel',event=>{if(!reduced){event.preventDefault();closePhoto();}});
document.querySelector('.close-lightbox').addEventListener('click',closePhoto);
dialog.addEventListener('close',()=>{document.body.style.overflow='';});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePhoto();}});
document.querySelector('.photo-prev').addEventListener('click',()=>showPhoto(currentPhoto-1));document.querySelector('.photo-next').addEventListener('click',()=>showPhoto(currentPhoto+1));
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(currentPhoto-1);}if(e.key==='ArrowRight'){e.preventDefault();showPhoto(currentPhoto+1);}});

// Page navigation reflects the current document, independently of scroll position.
const currentPath=location.pathname.replace(/\/$/,'')||'/';
nav.querySelectorAll('a').forEach(a=>{const path=new URL(a.href,location.href).pathname.replace(/\/$/,'')||'/';const active=path===currentPath;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
const progress=document.querySelector('.reading-progress');
if(progress){let scheduled=false;const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.transform='scaleX('+(max>0?Math.min(1,Math.max(0,scrollY/max)):0)+')';scheduled=false;};addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});addEventListener('resize',update);update();}
const jump=document.querySelector('.page-jump');
if(jump&&'IntersectionObserver' in window){const jumpObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)jump.querySelectorAll('a').forEach(a=>{const active=a.hash==='#'+e.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}),{rootMargin:'-24% 0px -55% 0px'});jump.querySelectorAll('a').forEach(a=>{const target=document.querySelector(a.hash);if(target)jumpObserver.observe(target);});}

// Animate the route through the homepage timeline as the visitor selects a date.
const timeline=document.querySelector('.timeline');
if(timeline){const dates=[...timeline.querySelectorAll('[data-year]')];dates.forEach((button,index)=>{button.addEventListener('click',()=>{timeline.style.setProperty('--timeline-progress',(index/(dates.length-1)*100)+'%');if(!reduced){const year=document.querySelector('#story-year');if(year&&year.animate)year.animate([{opacity:.25,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'});}});button.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(index+1)%dates.length;else if(e.key==='ArrowLeft')next=(index+dates.length-1)%dates.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=dates.length-1;else return;e.preventDefault();dates[next].focus();dates[next].click();});});}

// Keep image transitions tied to loading, including keyboard gallery navigation.
const galleryImage=document.querySelector('#lightbox-image');
galleryImage?.addEventListener('load',()=>{
 if(reduced||!dialog.open||!galleryImage.animate)return;
 galleryImage.getAnimations().forEach(animation=>animation.cancel());
 galleryImage.animate([{opacity:.25,transform:'translateX(14px) scale(.985)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:360,easing:'cubic-bezier(.16,1,.3,1)'});
});
// Expand explanatory text without changing native disclosure or keyboard behavior.
document.querySelectorAll('.read-more').forEach(detail=>detail.addEventListener('toggle',()=>{
 const content=detail.querySelector(':scope > div');
 if(detail.open&&!reduced&&content?.animate){content.getAnimations().forEach(animation=>animation.cancel());content.animate([{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'});}
}));
