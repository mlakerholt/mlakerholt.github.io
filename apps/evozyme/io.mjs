export const MAX_IMPORT_BYTES=10*1024*1024;
import {SCHEMA_VERSION,migrateCampaign} from './migration.mjs';
export {SCHEMA_VERSION};
export {saveCampaign,loadCampaign,listCampaigns,getActive,setActive} from './storage.mjs';
export const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeHref(value){const text=String(value||'');return /^(https?:\/\/|downloads\/)[^\s]*$/i.test(text)?text:'#';}
export function parseCSV(text,name='CSV',delimiter=','){
  if(![',',';','\t'].includes(delimiter))throw new Error('Unsupported CSV separator.');
  if(typeof text!=='string')throw new Error(`${name}: expected text.`);
  const rows=[];let row=[],cell='',quoted=false,afterQuote=false,line=1,startLine=1;
  text=text.replace(/^\uFEFF/,'');
  const finishCell=()=>{row.push(cell);cell='';afterQuote=false;};
  const finishRow=()=>{finishCell();if(row.some(c=>c!==''))rows.push({cells:row,line:startLine});row=[];startLine=line+1;};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else{cell+=c;if(c==='\n')line++;}continue;}
    if(afterQuote&&!['\r','\n',delimiter].includes(c))throw new Error(`${name}, row ${line}: unexpected text after a quoted field.`);
    if(c==='"'){if(cell!=='')throw new Error(`${name}, row ${line}: quote inside an unquoted field.`);quoted=true;}
    else if(c===delimiter)finishCell();else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;finishRow();line++;}else cell+=c;
  }
  if(quoted)throw new Error(`${name}, row ${startLine}: unterminated quoted field.`);
  if(cell!==''||row.length||afterQuote)finishRow();
  if(!rows.length)throw new Error(`${name}: file is empty.`);
  const headers=rows.shift().cells.map(h=>h.trim());
  if(headers.some(h=>!h||['__proto__','constructor','prototype','_line'].includes(h))||new Set(headers).size!==headers.length)throw new Error(`${name}: headers must be nonempty and unique.`);
  return rows.map(({cells,line})=>{if(cells.length!==headers.length)throw new Error(`${name}, row ${line}: expected ${headers.length} columns, found ${cells.length}.`);const result=Object.fromEntries(headers.map((h,i)=>[h,cells[i].trim()]));result._line=line;return result;});
}
export function toCSV(rows,headers=Object.keys(rows[0]||{}).filter(k=>k!=='_line')){
  const cell=v=>{if(v===null||v===undefined)return'';let s=typeof v==='object'?JSON.stringify(v):String(v);if(typeof v==='string'&&/^[\s]*[=+@-]/.test(s))s="'"+s;return/[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  return[headers.map(cell).join(','),...rows.map(r=>headers.map(h=>cell(r[h])).join(','))].join('\r\n')+'\r\n';
}
export function download(name,content,type='text/plain;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-zA-Z0-9._-]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function readFile(file){if(file.size>MAX_IMPORT_BYTES)throw new Error(`${file.name}: maximum import size is 10 MB.`);return await file.text();}
export async function fingerprint(text){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
export function validateBackup(value){
  const fail=m=>{throw new Error('Backup: '+m);};
  if(!value||typeof value!=='object'||Array.isArray(value))fail('expected a campaign object.');
  if(![1,SCHEMA_VERSION].includes(value.schemaVersion))fail(`unsupported format version ${value.schemaVersion??'missing'}. This app supports version ${SCHEMA_VERSION}.`);
  for(const key of ['id','name','createdAt','updatedAt','activeRoundId'])if(typeof value[key]!=='string'||value[key].length>1000)fail(`invalid ${key}.`);
  if(!/^[\w-]{1,100}$/.test(value.id))fail('invalid campaign ID.');
  if(!['user','synthetic'].includes(value.origin)||!['NOK','EUR','USD','GBP','SEK','DKK'].includes(value.currency))fail('invalid data origin or currency.');
  const strings=(o,keys)=>{for(const key of keys)if(typeof o[key]!=='string')fail(`invalid text field ${key}.`);};
  const fileRecord=(name,f)=>{if(!f||typeof f.text!=='string'||typeof f.sha256!=='string'||typeof f.name!=='string'||f.text.length>MAX_IMPORT_BYTES)fail(`invalid file ${name}.`);};
  const recipeCheck=recipe=>{if(!recipe||recipe.version!==1||!Array.isArray(recipe.sources)||!['long','wide'].includes(recipe.layout)||!['seconds','minutes','milliseconds'].includes(recipe.timeUnit)||!['.',','].includes(recipe.decimal))fail('invalid mapping recipe.');for(const source of recipe.sources)if(!source||typeof source.name!=='string'||!['unused','map','register','measurements','settings'].includes(source.role)||![',',';','\t'].includes(source.delimiter)||!source.columns||typeof source.columns!=='object'||Object.values(source.columns).some(x=>typeof x!=='string'))fail('invalid source mapping.');for(const key of ['mapOverride','registerOverride'])if(recipe[key]!==null&&(!Array.isArray(recipe[key])||recipe[key].some(r=>!r||typeof r!=='object')))fail('invalid map override.');};
  const provenanceCheck=p=>{if(!p)return;if(p.version!==1||!Array.isArray(p.originals)||!p.originals.length)fail('invalid original export provenance.');p.originals.forEach(f=>fileRecord('original export',f));recipeCheck(p.recipe);};
  if(!Array.isArray(value.rounds)||!value.rounds.length||value.rounds.length>1000)fail('expected 1–1000 rounds.');
  const ids=new Set();for(const r of value.rounds){
    if(!r||typeof r.id!=='string'||ids.has(r.id))fail('round IDs must be present and unique.');ids.add(r.id);
    for(const key of ['brief','assay','library','budget','review'])if(!r[key]||typeof r[key]!=='object'||Array.isArray(r[key]))fail(`round ${r.id} is missing ${key}.`);
    for(const key of ['equipment','software','analyses','confirmation','evidence','budgetScenarios'])if(!Array.isArray(r[key]))fail(`round ${r.id}: ${key} must be an array.`);
    if(!r.files||typeof r.files!=='object'||Array.isArray(r.files))fail('missing raw-file collection.');
    provenanceCheck(r.importProvenance);for(const a of r.analyses)provenanceCheck(a?.importProvenance);
    for(const [name,f]of Object.entries(r.files))fileRecord(name,f);
    strings(r.brief,['parent','parentCloneId','sequenceReference','reaction','objective','metric','units','conditions','secondary','stockPlan','backupLocation']);
    strings(r.assay,['run_id','assay_id','data_origin','signal_unit','fit_times']);
    strings(r.library,['model','strategy','custom']);strings(r.review,['parentCloneId','normalization','action','rationale','chosenClone']);
    if(!['nnk','uniform','custom'].includes(r.library.model))fail('unsupported probability model.');
    for(const key of Object.keys(r.budget))if(r.budget[key]!==null&&typeof r.budget[key]!=='number')fail(`invalid budget value ${key}.`);
    if(r.equipment.some(e=>!e||typeof e.name!=='string'||typeof e.access!=='string'))fail('invalid equipment record.');
    if(r.software.some(s=>!s||typeof s.name!=='string'))fail('invalid software record.');
    if(r.analyses.some(a=>!a||typeof a.id!=='string'||!a.result||!Array.isArray(a.result.candidates)||!Array.isArray(a.result.wells)||!a.result.quality))fail('invalid saved analysis.');
    if(r.confirmation.some(c=>!c||typeof c.clone_id!=='string'||typeof c.prep_id!=='string'))fail('invalid confirmation record.');
    if(r.evidence.some(e=>!e||typeof e.clone_id!=='string'))fail('invalid evidence record.');
    for(const a of r.analyses){if(!a.inputFiles||!a.result.config||!Array.isArray(a.result.config.fit_times_s)||!Array.isArray(a.result.dataOrigins)||!a.result.counts)fail('incomplete saved analysis.');for(const [name,f]of Object.entries(a.inputFiles))fileRecord(name,f);if(a.result.candidates.some(c=>!c||typeof c.clone_id!=='string'||typeof c.flags!=='string')||a.result.wells.some(w=>!w||!Array.isArray(w.flags)||!Array.isArray(w.points)))fail('invalid analysis measurements.');}
    if(r.confirmationSource)fileRecord('confirmation',r.confirmationSource);for(const f of r.confirmationHistory||[])fileRecord('confirmation history',f);
  }
  if(!ids.has(value.activeRoundId))fail('active round does not exist.');
  const walk=(o,depth=0)=>{if(depth>30)fail('nested data is too deep.');if(o&&typeof o==='object')for(const[k,v]of Object.entries(o)){if(['__proto__','constructor','prototype'].includes(k))fail('unsupported object key.');walk(v,depth+1);}};walk(value);
  const migrated=migrateCampaign(value);
  if(!Number.isSafeInteger(migrated.revision)||migrated.revision<0)fail('invalid revision.');
  if(typeof migrated.guided!=='boolean'||!Array.isArray(migrated.mappingPresets))fail('invalid interface or mapping preferences.');
  for(const preset of migrated.mappingPresets){if(!preset||preset.version!==1||typeof preset.name!=='string')fail('invalid mapping preset.');recipeCheck(preset.recipe);}
  for(const r of migrated.rounds){
    if(typeof r.assay.reference_parent_id!=='string'||typeof r.review.referenceReason!=='string')fail('invalid reference identity.');
    const review=r.assay.reviewRecord;
    if(review!==null&&(!review||typeof review.key!=='string'||typeof review.sha256!=='string'||typeof review.reviewedAt!=='string'))fail('invalid settings review.');
    if(!r.criteria||typeof r.criteria!=='object'||typeof r.criteria.enabled!=='boolean'||!['product','enzyme'].includes(r.criteria.normalization)||!['at_least','at_most'].includes(r.criteria.direction)||typeof r.criteria.assayId!=='string'||typeof r.criteria.notes!=='string'||(r.criteria.fold!==null&&(typeof r.criteria.fold!=='number'||!Number.isFinite(r.criteria.fold)||r.criteria.fold<0)))fail('invalid campaign criteria.');
  }
  return migrated;
}
export function safeName(name){return String(name||'campaign').replace(/[^a-z0-9_-]/gi,'_').slice(0,70);}
