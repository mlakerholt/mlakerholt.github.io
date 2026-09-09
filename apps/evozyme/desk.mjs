export const contextKey='evozyme-desk-context-v1';
const routeKeys=['campaign','round','analysis','plate','well','filter','search','brief'];
export function readRoute(search){const p=new URLSearchParams(search),out={};for(const k of routeKeys)if(p.has(k))out[k]=p.get(k).slice(0,500);return out;}
export function routeSearch(c,r,ui){const p=new URLSearchParams({campaign:c.id,round:r.id});for(const [key,value] of Object.entries({analysis:ui.analysisId,plate:ui.plate,well:ui.well,filter:ui.filter,search:ui.search,brief:ui.setupStep||1}))if(value)p.set(key,value);return '?'+p;}
export function getContext(){try{const c=JSON.parse(sessionStorage.getItem(contextKey));return c&&typeof c.url==='string'&&/^planner\.html\?/.test(c.url)&&typeof c.name==='string'&&typeof c.campaign==='string'?c:null;}catch{return null;}}
export function rememberContext(c,r,ui,stage){const url='planner.html'+routeSearch(c,r,ui)+'#'+stage;try{sessionStorage.setItem(contextKey,JSON.stringify({url,campaign:c.id,name:c.name,round:r.number,clone:ui.clone||'',stage}));}catch{}return url;}
export function header(base='./',current='Workflow'){return `<header class="desk-header"><div class="site-crumb"><a href="/">Magnus Lian Akerholt</a><span>/</span><a href="/apps/">Apps</a><span>/</span><span>Evozyme</span></div><div class="desk-masthead"><a class="wordmark" href="${base}">Evozyme<span>.</span></a><p>A research desk for directed evolution</p><label class="appearance">Appearance <select id="appearance"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label></div><nav class="destinations" aria-label="Application">${[['Workflow',base],['Campaign',base+'planner.html#campaign'],['Screening',base+'planner.html#screen'],['Handbook',base+'guide/index.html'],['Files',base+'files.html']].map(([name,href])=>`<a href="${href}" data-destination="${name}" ${current===name?'aria-current="page"':''}>${name}</a>`).join('')}</nav></header>`;}
export function syncNavigation(){
  const context=getContext();
  for(const a of document.querySelectorAll('[data-destination]')){const dest=a.dataset.destination;if(context&&['Campaign','Screening'].includes(dest)){const url=new URL(a.href);url.search=new URL(context.url,location.href).search;url.hash=dest==='Screening'?'screen':(['campaign','assay','equipment','library','budget'].includes(context.stage)?context.stage:'campaign');a.href=url.href;}}
  const back=document.querySelector('#context-return');if(back){const url=new URL('planner.html',new URL('.',import.meta.url));back.href=context?new URL(context.url,url).href:url.href;back.textContent=context?'← Return to '+(context.clone||context.name)+' · round '+context.round:'← Open your campaign';back.hidden=false;document.querySelector('#context-loading')?.remove();}
}
if(typeof document!=='undefined'){
  const preference=document.querySelector('#appearance');let mode='system';try{mode=localStorage.getItem('evozyme-appearance')||mode;}catch{}
  const apply=value=>{document.documentElement.style.colorScheme=value==='system'?'light dark':value;};
  apply(mode);if(preference){preference.value=mode;preference.addEventListener('change',()=>{apply(preference.value);try{localStorage.setItem('evozyme-appearance',preference.value);}catch{}});}
  syncNavigation();
}
