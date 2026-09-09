// Revision comparison and replacement happen in the same IndexedDB transaction.
export class SaveConflict extends Error {
  constructor(expected, actual) {
    super('Another tab saved a newer version of this campaign. Your draft has not replaced it.');
    this.name = 'SaveConflict'; this.expected = expected; this.actual = actual;
  }
}

export function createCampaignStore({factory=globalThis.indexedDB,name='evozyme-campaigns',status=()=>{}}={}) {
  let opening;
  function open() {
    if (!opening) opening = new Promise((resolve,reject) => {
      if (!factory) { reject(new Error('Browser storage is unavailable.')); return; }
      const request=factory.open(name,2);
      request.onblocked=()=>status('blocked','Close older Evozyme tabs to finish the update. Export any unsaved work in those tabs first.');
      request.onupgradeneeded=event=>{
        const db=request.result,tx=request.transaction;
        for(const store of ['campaigns','preferences','drafts','legacyCampaigns']) {
          if(!db.objectStoreNames.contains(store))db.createObjectStore(store,store==='preferences'?undefined:{keyPath:store==='drafts'?'key':'id'});
        }
        if(event.oldVersion===1){
          const cursor=tx.objectStore('campaigns').openCursor();
          cursor.onsuccess=()=>{const row=cursor.result;if(row){tx.objectStore('legacyCampaigns').put(row.value);row.continue();}};
        }
      };
      request.onerror=()=>{opening=undefined;reject(request.error);};
      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>{db.close();opening=undefined;status('outdated','A newer Evozyme update is available. Export your draft and reload this tab.');};
        db.onclose=()=>{opening=undefined;};status('ready','');resolve(db);
      };
    });
    return opening;
  }
  async function operation(store,mode,fn) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,mode),request=fn(tx.objectStore(store));
      tx.oncomplete=()=>resolve(request?.result);
      tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Save interrupted.'));
    });
  }
  async function save(campaign,expectedRevision=campaign.revision??0) {
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new Error('Invalid expected campaign revision.');
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),request=store.get(campaign.id);
      let conflict;
      request.onsuccess=()=>{
        const actual=request.result?.revision??0;
        if(actual!==expectedRevision){conflict=new SaveConflict(expectedRevision,actual);tx.abort();return;}
        store.put({...campaign,revision:actual+1});
      };
      tx.oncomplete=()=>resolve(expectedRevision+1);
      tx.onabort=()=>reject(conflict||tx.error||new Error('Save interrupted.'));
      tx.onerror=()=>reject(tx.error);
    });
  }
  return {
    open,save,
    load:id=>operation('campaigns','readonly',s=>s.get(id)),
    list:()=>operation('campaigns','readonly',s=>s.getAll()),
    getActive:()=>operation('preferences','readonly',s=>s.get('active')),
    setActive:id=>operation('preferences','readwrite',s=>s.put(id,'active')),
    saveDraft:draft=>operation('drafts','readwrite',s=>s.put(draft)),
    listDrafts:()=>operation('drafts','readonly',s=>s.getAll()),
    removeDraft:key=>operation('drafts','readwrite',s=>s.delete(key)),
    legacy:id=>operation('legacyCampaigns','readonly',s=>s.get(id)),
    close:async()=>{if(opening)(await opening).close();opening=undefined;}
  };
}

const store=createCampaignStore({status:(kind,message)=>globalThis.dispatchEvent?.(new CustomEvent('evozyme-storage',{detail:{kind,message}}))});
export const saveCampaign=(c,revision)=>store.save(c,revision);
export const loadCampaign=id=>store.load(id);
export const listCampaigns=()=>store.list();
export const getActive=()=>store.getActive();
export const setActive=id=>store.setActive(id);
export const saveDraft=draft=>store.saveDraft(draft);
export const listDrafts=()=>store.listDrafts();
export const removeDraft=key=>store.removeDraft(key);
export const loadLegacyCampaign=id=>store.legacy(id);
