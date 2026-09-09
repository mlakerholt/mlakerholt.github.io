import {createCampaignStore,SaveConflict} from '../storage.mjs';
const assert=(v,message)=>{if(!v)throw new Error(message);};
document.querySelector('#run').onclick=async()=>{
  const out=document.querySelector('#result'),notes=[];out.textContent='Running…';
  const name='evozyme-storage-test-'+crypto.randomUUID();let legacy;
  const stores=[];
  try{
    legacy=await new Promise((resolve,reject)=>{const q=indexedDB.open(name,1);q.onupgradeneeded=()=>{q.result.createObjectStore('campaigns',{keyPath:'id'});q.result.createObjectStore('preferences');};q.onerror=()=>reject(q.error);q.onsuccess=()=>resolve(q.result);});
    await new Promise((resolve,reject)=>{const tx=legacy.transaction('campaigns','readwrite');tx.objectStore('campaigns').put({id:'one',schemaVersion:1,name:'original'});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    let blocked=false;
    const a=createCampaignStore({name,status:kind=>{if(kind==='blocked'){blocked=true;legacy.close();legacy=null;}}});stores.push(a);
    await a.open();assert(blocked,'Version-one connection did not block migration');assert((await a.legacy('one')).name==='original','Legacy record not preserved');notes.push('PASS: old connection blocks upgrade; legacy record archived');
    const b=createCampaignStore({name});stores.push(b);
    const first={id:'one',schemaVersion:2,revision:0,name:'A'},second={...first,name:'B'};
    const results=await Promise.allSettled([a.save(first,0),b.save(second,0)]);
    assert(results.filter(r=>r.status==='fulfilled').length===1,'Concurrent saves both succeeded');assert(results.find(r=>r.status==='rejected')?.reason instanceof SaveConflict,'Missing conflict error');
    const saved=await a.load('one');assert(saved.revision===1,'Revision must advance once');notes.push('PASS: concurrent revisions cannot silently overwrite');
    await b.saveDraft({key:'one:draft',campaign:second,savedAt:'test'});assert((await a.listDrafts()).length===1,'Draft not retained');assert((await a.load('one')).name===saved.name,'Draft replaced saved record');notes.push('PASS: recovery draft is separate from saved campaign');
    try{await b.save({...second,revision:999},0);throw new Error('Stale restore unexpectedly succeeded');}catch(err){assert(err instanceof SaveConflict,'Wrong stale-restore error');}notes.push('PASS: imported revision cannot bypass expected revision');
    let outdated=false;const old=createCampaignStore({name,status:k=>{if(k==='outdated')outdated=true;}});stores.push(old);await old.open();
    const newer=await new Promise((resolve,reject)=>{const q=indexedDB.open(name,3);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});newer.close();assert(outdated,'Updated tab did not close its connection');notes.push('PASS: newer database closes older connections');
    out.textContent=notes.join('\n')+'\nAll 5 storage checks passed.';
  }catch(err){out.textContent=notes.join('\n')+'\nFAIL: '+err.message;}
  finally{legacy?.close();for(const s of stores)await s.close().catch(()=>{});indexedDB.deleteDatabase(name);}
};
