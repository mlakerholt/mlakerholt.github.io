import{budget,equipmentTotal,confirmationSummary,validateAssay}from'./core.mjs';
import{parseCSV,toCSV,download,readFile,fingerprint,saveCampaign,loadCampaign,listCampaigns,getActive,setActive,validateBackup,safeName,MAX_IMPORT_BYTES}from'./io.mjs';
import{newCampaign,nextRound,activeRound,assayConfig,stages,uid,configurations}from'./data.mjs';
import{campaignView,assayView,equipmentView,libraryView,budgetView,libraryProbabilities}from'./planner.mjs';
import{screenView,selectedAnalysis}from'./screen.mjs';
import{reviewView,reportHTML,confirmationReady}from'./review.mjs';
import{e,num,date}from'./ui.mjs';
import{SaveConflict,saveDraft,listDrafts,removeDraft,loadLegacyCampaign}from'./storage.mjs';
import{configKey,hasReviewed,workflowIssues,analysisIssues}from'./workflow.mjs';
import{issueList,controlProposal}from'./workflow-ui.mjs';
const $=s=>document.querySelector(s);
let campaign=newCampaign(),stage=0,saveTimer,saveQueue=Promise.resolve(),storageOK=true,dirty=false;
let booting=true,saveProblem=null,editSerial=0;
const tabId=uid(),revisions=new Map(),channel=typeof BroadcastChannel==='function'?new BroadcastChannel('evozyme-revisions-v2'):null;
const draftKey=id=>id+':'+tabId;
function saveAlert(){const p=saveProblem;$('#save-alert').innerHTML=p?`<div class="callout warning"><strong>${p.kind==='conflict'?'Newer saved version found':'Save needs attention'}</strong><p>${e(p.message)}</p>${p.draftSaved?'<p>A recovery copy of this draft is retained in this browser.</p>':''}${booting?'':`<div class="actions"><button data-action="draft-export">Export this draft</button><button data-action="save-copy">Save as separate campaign</button>${p.kind==='conflict'?'<button data-action="load-latest">Load latest saved version</button>':'<button data-action="retry-save">Retry saving</button>'}</div>`}</div>`:'';}
window.addEventListener('evozyme-storage',({detail})=>{if(detail.kind!=='ready'){saveProblem={kind:detail.kind,message:detail.message};saveAlert();}else if(booting){saveProblem=null;saveAlert();}});
if(channel)channel.onmessage=({data})=>{if(data.id===campaign.id&&data.revision>(revisions.get(campaign.id)??campaign.revision)){saveProblem={kind:'conflict',message:'Another tab saved changes. Keep this draft separately or load the latest saved version.'};saveAlert();}};
const ui={pending:null,importError:'',analysisId:null,plate:null,well:null,filter:'all',search:'',analyzing:false};
const round=()=>activeRound(campaign);
const views=[campaignView,assayView,equipmentView,libraryView,budgetView,screenView,reviewView];
const notice=(message,kind='info')=>{$('#notice').innerHTML=message?`<div class="callout ${kind}">${e(message)}</div>`:'';};
function renderSummary(){
  const r=round();let b=null;try{b=budget(r.budget);}catch{}
  const missing=workflowIssues(r);
  $('#summary').innerHTML=`<section class="panel"><h3>Campaign summary</h3><dl class="summary-list"><dt>Campaign</dt><dd>${e(campaign.name)}</dd><dt>Parent</dt><dd>${e(r.brief.parent||'Not defined')}</dd><dt>Round</dt><dd>${r.number} of ${campaign.rounds.length}</dd><dt>Primary slots</dt><dd>${num(b?.slots,0)}</dd><dt>Expected usable</dt><dd>${num(b?.usable,1)}</dd><dt>Round cost</dt><dd>${num(b?.total)} ${e(campaign.currency)}</dd><dt>Saved analyses</dt><dd>${r.analyses.length}</dd></dl></section><section class="panel"><h3>Next useful actions</h3>${issueList(r)}<small>Record completeness does not establish experimental validity.</small></section><section class="panel"><h3>Keep a second copy</h3><p>${storageOK&&!saveProblem?'Browser copy available.':'Browser save needs attention.'} Export a backup after important changes.</p><small>Last export: ${e(date(campaign.lastExportAt))}</small><div class="actions"><button type="button" data-action="export">Export backup</button><button type="button" data-action="recovery">Recovery drafts</button></div><a href="guide/index.html">Handbook &amp; worked examples →</a></section>`;
  if(stage===5){const run=selectedAnalysis(r,ui);if(run){const plate=ui.plate&&run.result.quality[ui.plate]?ui.plate:Object.keys(run.result.quality)[0],w=run.result.wells.find(x=>x.plate_id===plate&&x.well===ui.well)||run.result.wells.find(x=>x.plate_id===plate&&x.clone_id===run.result.candidates[0]?.clone_id);$('#summary').insertAdjacentHTML('afterbegin',`<section class="panel"><h3>Selected measurement</h3><dl class="summary-list"><dt>Plate</dt><dd>${e(plate)}</dd><dt>Well</dt><dd>${e(w?.well||'Choose a well')}</dd><dt>Clone</dt><dd>${e(w?.clone_id||w?.sample_type||'')}</dd><dt>Preparation</dt><dd class="wide">${e(w?.prep_id||'Control')}</dd><dt>Stock</dt><dd class="wide">${e(w?.stock_location||'Not applicable')}</dd></dl></section>`);}}
  $('#origin-label').textContent=campaign.origin==='synthetic'?'Synthetic teaching campaign · no laboratory experiment':'Your campaign · local browser data';
}
function render({focus=false}={}){
  stage=Math.max(0,stages.findIndex(s=>location.hash==='#'+s.toLowerCase()));
  $('#steps').innerHTML=stages.map((s,i)=>`<a href="#${s.toLowerCase()}" ${i===stage?'aria-current="step"':''}><span>${i+1}</span>${s}</a>`).join('');
  document.body.classList.toggle('stage-wide',stage>=5);
  try{$('#stage').innerHTML=views[stage](campaign,round(),ui);}catch(err){$('#stage').innerHTML=`<h2 id="stage-title">Unable to display this record</h2><p>${e(err.message)}</p><button data-action="export">Export backup</button>`;}
  $('#stage-count').textContent=`Stage ${stage+1} of 7`;$('#previous').disabled=stage===0;$('#next').disabled=stage===6;renderSummary();if(focus)$('#stage').focus();
  if(ui.analyzing||booting)document.querySelectorAll('#stage input,#stage select,#stage textarea,#stage button').forEach(input=>input.disabled=true);
  if(booting)document.querySelectorAll('.toolbar button,.toolbar input').forEach(input=>input.disabled=true);saveAlert();
}
function changed(){editSerial++;campaign.updatedAt=new Date().toISOString();dirty=true;$('#save-status').textContent='Unsaved changes…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist(),450);renderSummary();}
async function persist(){
  clearTimeout(saveTimer);
  if(booting)return false;
  if(saveProblem){
    if(saveProblem.kind==='conflict'&&dirty){try{await saveDraft({key:draftKey(campaign.id),savedAt:new Date().toISOString(),campaign:structuredClone(campaign)});saveProblem.draftSaved=true;saveAlert();}catch{}}
    return false;
  }
  if(!dirty&&revisions.has(campaign.id))return true;
  const snapshot=structuredClone(campaign),id=snapshot.id,serial=editSerial;
  let succeeded=false;
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{
    if(saveProblem)return;
    try{
      const revision=await saveCampaign(snapshot,revisions.get(id)??snapshot.revision??0);
      revisions.set(id,revision);if(campaign.id===id)campaign.revision=revision;
      await setActive(id);storageOK=true;succeeded=true;
      if(campaign.id===id&&editSerial===serial){dirty=false;$('#save-status').textContent='Saved in this browser · '+new Date().toLocaleTimeString('en-GB');}
      channel?.postMessage({id,revision});await removeDraft(draftKey(id)).catch(()=>{});
    }catch(err){
      storageOK=false;saveProblem={kind:err instanceof SaveConflict?'conflict':'storage',message:err.message||'Browser save failed. Export this draft to keep your work.'};
      try{await saveDraft({key:draftKey(id),savedAt:new Date().toISOString(),campaign:structuredClone(campaign)});saveProblem.draftSaved=true;}catch{}
      $('#save-status').textContent='Draft needs saving — review the message above.';saveAlert();
    }
  });await saveQueue;return succeeded;
}
async function ensureSaved(){if(!await persist())throw new Error('Keep or recover the current draft before switching records. Use the save message above.');}
async function switchCampaign(c){await ensureSaved();campaign=c;revisions.set(c.id,c.revision??0);resetUI();dirty=true;editSerial++;await persist();location.hash='#campaign';render();}
async function separateCopy(source=campaign){if(source!==campaign)await ensureSaved();const original=source.id,copy=structuredClone(source);copy.id=uid();copy.name+=' · recovered copy';copy.revision=0;copy.createdAt=new Date().toISOString();copy.updatedAt=copy.createdAt;copy.copiedFrom=original;campaign=copy;saveProblem=null;revisions.set(copy.id,0);resetUI();dirty=true;editSerial++;if(await persist()){await removeDraft(draftKey(original)).catch(()=>{});notice('Saved as a separate campaign. The earlier saved version is preserved.');}render();}
async function acknowledge(config){validateAssay(config);const key=configKey(config);return{key,sha256:await fingerprint(key),reviewedAt:new Date().toISOString()};}
function resetUI(){Object.assign(ui,{pending:null,importError:'',analysisId:null,plate:null,well:null,filter:'all',search:'',analyzing:false});}
function showDialog(content){$('#dialog-body').innerHTML=content;if(!$('#dialog').open)$('#dialog').showModal();}
function closeDialog(){$('#dialog').close();}
function requireIdle(){if(booting)throw new Error('Wait for saved records to load.');if(saveProblem)throw new Error('Resolve the save message before changing records. Your draft remains available to export.');if(ui.analyzing)throw new Error('Wait for the current analysis to finish before changing campaigns or rounds.');}
async function applyField(input){
  const path=input.dataset.field;if(!path)return;const parts=path.split('.');if(parts.some(p=>['__proto__','prototype','constructor'].includes(p)))throw new Error('Unsupported field.');
  const obj=['name','currency'].includes(path)?campaign:round();let parent=obj;for(const p of parts.slice(0,-1)){if(!Object.hasOwn(parent,p))throw new Error('Unknown field.');parent=parent[p];}const key=parts.at(-1);if(!Object.hasOwn(parent,key))throw new Error('Unknown field.');
  let value=input.type==='checkbox'?input.checked:input.type==='number'?(input.value===''?null:input.valueAsNumber):input.value;if(path==='assay.signal_direction')value=Number(value);if(typeof value==='number'&&!Number.isFinite(value))value=null;
  if(path.startsWith('evidence.')&&key==='decision'&&value==='confirmed'&&!confirmationReady(round(),parent.clone_id))throw new Error('Complete independent observations, sequence/product/stock/property checks, references, and a rationale before marking this candidate confirmed.');
  if(path==='assay.rulesReviewed'){
    const a=round().assay;a.rulesReviewed=false;a.reviewRecord=null;
    if(value){const config=assayConfig(a),record=await acknowledge(config);if(configKey(assayConfig(a))!==record.key)throw new Error('Settings changed while reviewing. Review them again.');a.reviewRecord=record;a.rulesReviewed=true;}changed();return;
  }
  parent[key]=value;
  if(path.startsWith('assay.')){round().assay.rulesReviewed=false;round().assay.reviewRecord=null;}
  if(path.startsWith('confirmation.')||['review.parentCloneId','review.normalization'].includes(path)){for(const ev of round().evidence)if(ev.decision==='confirmed')ev.decision='pending';}
  if(path.startsWith('evidence.')&&key!=='decision'&&parent.decision==='confirmed'&&!confirmationReady(round(),parent.clone_id))parent.decision='pending';changed();refreshDerived();
}
function refreshDerived(){if(![1,2,3,4,6].includes(stage))return;const container=document.createElement('div');container.innerHTML=views[stage](campaign,round(),ui);for(const id of['calculator-output','confirmation-output','equipment-output','stage-checks']){const existing=document.getElementById(id),fresh=container.querySelector('#'+id);if(existing&&fresh)existing.innerHTML=fresh.innerHTML;}}
document.addEventListener('input',async event=>{if(event.target.dataset.field&&event.target.type!=='checkbox'&&event.target.tagName!=='SELECT'){try{await applyField(event.target);}catch(err){notice(err.message,'error');render();}}});
document.addEventListener('change',async event=>{const t=event.target;try{
  if(t.dataset.field){await applyField(t);if(t.tagName==='SELECT'||t.type==='checkbox'){const path=t.dataset.field;render();document.querySelector(`[data-field="${path}"]`)?.focus();}}
  else if(t.id==='screen-files')await stageScreenFiles(t.files);
  else if(t.id==='confirmation-input')await importConfirmation(t.files[0]);
  else if(t.id==='backup-input')await importBackup(t.files[0]);
  else if(t.id==='analysis-select'){ui.analysisId=t.value;ui.plate=null;ui.well=null;render();}
  else if(t.id==='plate-select'){ui.plate=t.value;ui.well=null;render();}
  else if(t.id==='candidate-filter'){ui.filter=t.value;render();}
  else if(t.id==='candidate-search'){ui.search=t.value;render();$('#candidate-search').focus();}
  else if(t.id==='round-select'){requireIdle();await ensureSaved();campaign.activeRoundId=t.value;resetUI();changed();render();}
}catch(err){notice(err.message,'error');}});
$('#previous').onclick=()=>{if(stage>0)location.hash=stages[stage-1].toLowerCase();};$('#next').onclick=()=>{if(stage<6)location.hash=stages[stage+1].toLowerCase();};$('#close-dialog').onclick=closeDialog;
window.addEventListener('hashchange',()=>render({focus:true}));
document.addEventListener('click',event=>{const link=event.target.closest('[data-go-field]');if(link){event.preventDefault();location.hash=link.getAttribute('href');render();const field=document.querySelector(`[data-field="${link.dataset.goField}"]`);if(field){for(let p=field.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;field.focus();field.scrollIntoView({block:'center'});}}});window.addEventListener('beforeunload',event=>{if(dirty||ui.analyzing||!storageOK){event.preventDefault();event.returnValue='';}});
async function recordFile(file){const text=await readFile(file);return{name:file.name,text,bytes:file.size,sha256:await fingerprint(text),importedAt:new Date().toISOString()};}
function configToAssay(cfg,base){cfg={...cfg,reference_parent_id:cfg.reference_parent_id??base.reference_parent_id};validateAssay({...cfg,signal_floor:cfg.signal_floor??null});const a={...base};for(const key of Object.keys(assayConfig(base)))if(key!=='fit_times_s'&&Object.hasOwn(cfg,key))a[key]=cfg[key];a.signal_floor=cfg.signal_floor??null;a.fit_times=cfg.fit_times_s.join(', ');a.rulesReviewed=false;a.reviewRecord=null;return a;}
async function stageScreenFiles(fileList){
  requireIdle();ui.importError='';ui.pending=null;const files=Array.from(fileList),records={};let config=null;
  if(files.reduce((n,f)=>n+f.size,0)>MAX_IMPORT_BYTES)throw new Error('Combined screen import exceeds 10 MB. Split it into smaller independent plate batches.');
  const seen=new Set();for(const file of files){if(seen.has(file.name))throw new Error('Duplicate filename in selection: '+file.name);seen.add(file.name);if(!['plate_map.csv','clone_register.csv','measurements.csv','assay.json'].includes(file.name))throw new Error('Unrecognized file: '+file.name+'. Use the toolkit filenames.');const f=await recordFile(file);if(file.name==='assay.json')config=JSON.parse(f.text);else{f.rows=parseCSV(f.text,file.name).length;records[file.name]=f;}}
  for(const key of ['plate_map.csv','clone_register.csv','measurements.csv'])if(!records[key])throw new Error('Select all three CSV files together; missing '+key+'.');if(config)config=assayConfig(configToAssay(config,round().assay));ui.pending={files:records,config:config||assayConfig(round().assay),reviewRecord:null};render();
}
function runWorker(files,config){return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./analysis-worker.mjs',import.meta.url),{type:'module'});const timeout=setTimeout(()=>{worker.terminate();reject(new Error('Analysis exceeded 60 seconds. Use a smaller plate batch.'));},60000);worker.onmessage=({data})=>{clearTimeout(timeout);worker.terminate();data.error?reject(new Error(data.error)):resolve(data.result);};worker.onerror=()=>{clearTimeout(timeout);worker.terminate();reject(new Error('Analysis worker could not run. Reload the app and try again.'));};worker.postMessage({id:uid(),files,config});});}
async function analyzeFiles(retained=false){
  requireIdle();const r=round(),files=structuredClone(retained?r.files:ui.pending?.files),config=retained?assayConfig(r.assay):ui.pending?.config||assayConfig(r.assay);
  if(!files||Object.keys(files).length!==3)throw new Error('Import the three CSV files first.');validateAssay(config);
  const issues=analysisIssues(r,config);if(issues.length)throw new Error(issues.map(x=>x.message).join(' '));
  const reviewed=retained?r.assay.reviewRecord:ui.pending?.reviewRecord;
  if(!reviewed||reviewed.key!==configKey(config)||reviewed.sha256!==await fingerprint(configKey(config)))throw new Error('Review the exact settings for this analysis before continuing.');
  await ensureSaved();ui.analyzing=true;ui.importError='';render();
  try{
    const result=await runWorker(files,config),run={id:uid(),label:config.run_id,createdAt:new Date().toISOString(),inputFiles:files,reviewRecord:structuredClone(reviewed),result};
    r.files=structuredClone(files);r.analyses.push(run);r.assay=configToAssay(config,r.assay);r.assay.reviewRecord=structuredClone(reviewed);r.assay.rulesReviewed=true;
    ui.analysisId=run.id;ui.pending=null;ui.plate=null;ui.well=null;changed();
    if(await persist())notice('Analysis saved. Review controls, raw traces, and candidate flags.');
  }catch(err){ui.importError=err.message;}finally{ui.analyzing=false;render();}
}
async function openDemo(){
  requireIdle();ui.analyzing=true;render();try{await ensureSaved();notice('Loading the synthetic worked example…');
  const names=['plate_map.csv','clone_register.csv','measurements.csv','assay.json','confirmation.csv'];const entries=await Promise.all(names.map(async name=>{const response=await fetch('example/'+name);if(!response.ok)throw new Error('Could not load example file '+name);return[name,await response.text()];}));
  const raw=Object.fromEntries(entries),demo=newCampaign();demo.name='LipA · worked example';demo.origin='synthetic';const r=activeRound(demo);Object.assign(r.brief,{owner:'Teaching example',parent:'Bacillus subtilis LipA',parentCloneId:'PARENT',reaction:'Lipase activity screen with intended-product confirmation',objective:'Nominate candidates for an independently confirmed activity improvement',metric:'Intended-product rate',units:'µM/min',conditions:'Synthetic optical assay; confirmation at 0.1 µM enzyme',secondary:'Confirm product identity, sequence and relevant secondary properties',format:'Illustrative preparation; no laboratory experiment',stockPlan:'DEMO_ONLY locations are fictional'});
  r.assay=configToAssay(JSON.parse(raw['assay.json']),r.assay);r.assay.sampleFormat='Synthetic optical screen';r.assay.productMethod='Synthetic independent intended-product measurements';r.assay.rulesReviewed=true;r.assay.reviewRecord=await acknowledge(assayConfig(r.assay));r.budget.controls=r.assay.minimum_blank_wells+r.assay.minimum_host_wells+r.assay.minimum_parent_preparations*r.assay.minimum_technical_wells;r.equipment.forEach(x=>{x.access=['reader','sequencing','confirmation','culture','centrifuge'].includes(x.id)?'shared':'existing';x.instrument='Illustrative access — replace for real use';});
  for(const name of names.filter(n=>n.endsWith('.csv')&&n!=='confirmation.csv'))r.files[name]={name,text:raw[name],bytes:new TextEncoder().encode(raw[name]).length,sha256:await fingerprint(raw[name]),importedAt:new Date().toISOString()};r.confirmation=parseCSV(raw['confirmation.csv'],'confirmation.csv');r.confirmationSource={name:'confirmation.csv',text:raw['confirmation.csv'],sha256:await fingerprint(raw['confirmation.csv']),importedAt:new Date().toISOString()};
  const result=await runWorker(r.files,assayConfig(r.assay));r.analyses.push({id:uid(),label:r.assay.run_id,createdAt:new Date().toISOString(),inputFiles:structuredClone(r.files),reviewRecord:structuredClone(r.assay.reviewRecord),result});campaign=demo;resetUI();prepareEvidence();changed();await persist();location.hash='#screen';render();notice('Synthetic example opened as a separate campaign. C03 and C11 are nominated for independent retesting; confirmation evidence is intentionally incomplete.');}finally{ui.analyzing=false;render();}
}
function exportBackup(){campaign.lastExportAt=new Date().toISOString();campaign.updatedAt=campaign.lastExportAt;download(safeName(campaign.name)+'-backup.json',JSON.stringify(campaign,null,2),'application/json');changed();persist();notice('Backup download started. Keep it with any externally referenced sequence and evidence files.');}
async function verifyBackupHashes(c){for(const r of c.rounds){const all=[...Object.values(r.files),...r.analyses.flatMap(a=>Object.values(a.inputFiles||{})),...(r.confirmationSource?[r.confirmationSource]:[]),...(r.confirmationHistory||[])];for(const f of all)if(f.sha256!==await fingerprint(f.text))throw new Error('Backup integrity check failed for '+f.name+'. The retained raw text differs from its recorded fingerprint.');}}
async function importBackup(file){
  if(!file)return;requireIdle();if(file.size>100*1024*1024)throw new Error('Campaign backup exceeds the 100 MB restore limit.');
  const parsed=validateBackup(JSON.parse(await file.text()));await verifyBackupHashes(parsed);await ensureSaved();const existing=await loadCampaign(parsed.id);
  const restore=async(copy=false)=>{
    closeDialog();if(copy){parsed.name+=' · restore check';parsed.restorationCheckedAt=new Date().toISOString();await separateCopy(parsed);}
    else {parsed.revision=existing?.revision??0;campaign=parsed;revisions.set(parsed.id,parsed.revision);resetUI();dirty=true;editSerial++;if(await persist())notice('Campaign restored with its original files and analysis snapshots.');render();}
    location.hash='#campaign';
  };
  showDialog('<h2>Restore a backup</h2><p>Raw-file fingerprints and the record structure passed validation. External sequence and evidence files still need to be kept with your backup.</p><div class="actions"><button id="restore-copy" class="primary">Restore as a separate copy</button><button id="restore-original">'+(existing?'Replace the saved campaign':'Restore original campaign ID')+'</button></div>'+(existing?'<p>Replacing uses a revision check. Export the current saved version first if you need both.</p>':''));
  $('#restore-copy').onclick=()=>restore(true).catch(err=>notice(err.message,'error'));$('#restore-original').onclick=()=>restore(false).catch(err=>notice(err.message,'error'));$('#backup-input').value='';
}
async function importConfirmation(file){if(!file)return;requireIdle();const source=await recordFile(file),rows=parseCSV(source.text,file.name);confirmationSummary(rows,round().review.parentCloneId,round().review.normalization);const r=round();r.confirmationHistory??=[];if(r.confirmationSource)r.confirmationHistory.push(r.confirmationSource);r.confirmation=rows;r.confirmationSource=source;for(const ev of r.evidence)ev.decision='pending';prepareEvidence();changed();render();notice('Confirmation observations imported. Candidate decisions are pending review.');}
function prepareEvidence(){const r=round(),clones=new Set([...r.confirmation.map(x=>x.clone_id),...r.analyses.flatMap(a=>a.result.candidates.filter(x=>x.decision==='retest_candidate').map(x=>x.clone_id))]);clones.delete(r.review.parentCloneId);for(const clone of clones)if(!r.evidence.some(x=>x.clone_id===clone))r.evidence.push({clone_id:clone,sequenceReference:'',stock:'',propertiesNotes:'',sequenceVerified:false,productConfirmed:false,stockRecovered:false,secondaryChecked:false,decision:'pending',rationale:''});}
const exportCSV=(name,rows,headers)=>download(name,toCSV(rows,headers),'text/csv;charset=utf-8');
async function action(name,button){
  const r=round(),run=selectedAnalysis(r,ui);notice('');
  switch(name){
    case'draft-export':download(safeName(campaign.name)+'-draft.json',JSON.stringify(campaign,null,2),'application/json');break;
    case'save-copy':await separateCopy();break;
    case'load-latest':{
      const latest=await loadCampaign(campaign.id);if(!latest)throw new Error('No saved version was found. Export this draft or save a separate copy.');
      if(dirty){try{await saveDraft({key:draftKey(campaign.id),savedAt:new Date().toISOString(),campaign:structuredClone(campaign)});}catch{throw new Error('Could not retain a recovery draft. Export this draft before reloading.');}}
      campaign=validateBackup(latest);revisions.set(campaign.id,latest.revision??0);saveProblem=null;storageOK=true;dirty=false;resetUI();render();$('#save-status').textContent='Loaded latest saved version';break;
    }
    case'retry-save':saveProblem=null;dirty=true;await persist();render();break;
    case'recovery':{
      const drafts=await listDrafts();showDialog('<h2>Recovery drafts</h2><p>These local copies may contain work that could not replace a newer saved campaign.</p>'+drafts.map((d,i)=>`<div class="save-item"><div><strong>${e(d.campaign.name)}</strong><br>${e(date(d.savedAt))}</div><button id="recover-${i}">Recover as separate campaign</button></div>`).join('')+(drafts.length?'':'<p>No recovery drafts are stored.</p>'));
      drafts.forEach((d,i)=>$('#recover-'+i).onclick=()=>{closeDialog();separateCopy(validateBackup(d.campaign)).catch(err=>notice(err.message,'error'));});break;
    }
    case'review-import':{
      if(!ui.pending)throw new Error('Stage an import first.');const record=await acknowledge(ui.pending.config);if(!ui.pending||record.key!==configKey(ui.pending.config))throw new Error('Settings changed; review again.');ui.pending.reviewRecord=record;render();notice('These exact imported settings are acknowledged for analysis.');break;
    }
    case'sync-controls':{
      const proposal=controlProposal(r);showDialog('<h2>Match capacity to the assay</h2>'+proposal.html+'<div class="actions"><button id="apply-controls" class="primary">Use this allocation</button></div>');$('#apply-controls').onclick=()=>{r.budget=proposal.proposed;closeDialog();changed();render();};break;
    }

    case'new':requireIdle();await switchCampaign(newCampaign());notice('New campaign created. Numeric planning inputs are editable teaching assumptions.');break;
    case'demo':await openDemo();break;
    case'saved':{requireIdle();await ensureSaved();const saved=await listCampaigns();showDialog('<h2>Saved campaigns</h2>'+saved.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(c=>`<div class="save-item"><div><strong>${e(c.name)}</strong><br><small>${e(date(c.updatedAt))} · ${c.rounds.length} round(s)${c.origin==='synthetic'?' · Synthetic':''}</small></div><button data-action="load-campaign" data-id="${e(c.id)}">Open</button></div>`).join(''));break;}
    case'load-campaign':{requireIdle();const c=await loadCampaign(button.dataset.id);if(!c)throw new Error('Saved campaign was not found.');closeDialog();await switchCampaign(validateBackup(c));break;}
    case'export':exportBackup();break;
    case'print':document.querySelector('#print-report')?.remove();document.querySelector('main').insertAdjacentHTML('beforeend',reportHTML(campaign));window.print();break;
    case'configuration':{if(r.configuration==='automated'&&!r.equipment.some(e=>e.id==='automation'))r.equipment.push({id:'automation',name:'Verified liquid handling and transfer records',requirement:'Match actual liquids and volumes; verify carryover, dead volume, transfer maps, maintenance, and exception recovery.',access:'missing',quantity:1,price:null,instrument:'',specification:'',accessories:'',compatibility:'',evidence:'',constraints:'',quoteDate:'',source:'',exclusions:''});changed();render();notice(configurations[r.configuration].name+' checklist selected. Your access and quotes are preserved.');break;}
    case'add-equipment':showDialog('<h2>Add a capability</h2><label class="field"><span>Capability name</span><input id="capability-name"></label><label class="field"><span>What must it provide?</span><textarea id="capability-need"></textarea></label><div class="actions"><button class="primary" id="confirm-capability">Add capability</button></div>');$('#confirm-capability').onclick=()=>{const name=$('#capability-name').value.trim();if(!name)return $('#capability-name').focus();r.equipment.push({id:uid(),name,requirement:$('#capability-need').value,access:'missing',quantity:1,price:null,instrument:'',specification:'',accessories:'',compatibility:'',evidence:'',constraints:'',quoteDate:'',source:'',exclusions:''});closeDialog();changed();render();};break;
    case'equipment-csv':exportCSV('equipment-checklist.csv',r.equipment);break;
    case'draws-capacity':r.library.draws=budget(r.budget).slots;changed();render();break;
    case'probabilities-csv':exportCSV('probabilities.csv',libraryProbabilities(r.library));break;
    case'budget-csv':{const b=budget(r.budget);exportCSV('round-budget.csv',[...b.items.map(([item,cost])=>({item,value:cost,unit:campaign.currency})),{item:'Contingency',value:b.contingency,unit:campaign.currency},{item:'Total',value:b.total,unit:campaign.currency},{item:'Primary clone slots',value:b.slots,unit:'slots'},{item:'Expected usable clones',value:b.usable,unit:'clones'},{item:'Cost per expected usable clone',value:b.perUsable,unit:campaign.currency}]);break;}
    case'save-scenario':{const result=budget(r.budget);showDialog('<h2>Save budget scenario</h2><label class="field"><span>Name</span><input id="scenario-name" value="Scenario '+(r.budgetScenarios.length+1)+'"></label><div class="actions"><button id="confirm-scenario" class="primary">Save scenario</button></div>');$('#confirm-scenario').onclick=()=>{const name=$('#scenario-name').value.trim();if(!name)return;r.budgetScenarios.push({id:uid(),name,createdAt:new Date().toISOString(),currency:campaign.currency,budget:structuredClone(r.budget),result});closeDialog();changed();render();};break;}
    case'load-scenario':{const s=r.budgetScenarios[Number(button.dataset.index)];r.budget=structuredClone(s.budget);campaign.currency=s.currency;changed();render();break;}
    case'analyze':await analyzeFiles();break;
    case'reanalyze':await analyzeFiles(true);break;
    case'cancel-import':ui.pending=null;ui.importError='';render();break;
    case'well':ui.well=button.dataset.well;ui.plate=button.dataset.plate;render();document.querySelector('.plate .selected')?.focus();break;
    case'clone':ui.plate=button.dataset.plate;ui.well=run.result.wells.find(w=>w.clone_id===button.dataset.clone&&w.plate_id===ui.plate)?.well;render();document.querySelector('.plate .selected')?.scrollIntoView({block:'center'});break;
    case'candidates-csv':exportCSV('candidates.csv',run.result.candidates);break;
    case'wells-csv':exportCSV('well-results.csv',run.result.wells.map(w=>({...w,flags:w.flags.join(';')})),['plate_id','well','clone_id','prep_id','technical_rep','sample_type','raw_slope_per_min','r2','corrected_rate_per_min','flags','stock_location']);break;
    case'quality-json':download('quality.json',JSON.stringify({engineVersion:run.result.engineVersion,config:run.result.config,plates:run.result.quality,provenance:Object.values(run.inputFiles).map(({text,...meta})=>meta)},null,2),'application/json');break;
    case'raw-export':showDialog('<h2>Unchanged raw inputs</h2><p>Download each original file. Browsers may ask before allowing multiple downloads.</p>'+Object.keys(run.inputFiles).map(name=>`<p><button data-action="raw-file" data-name="${e(name)}">${e(name)}</button></p>`).join(''));break;
    case'raw-file':download(button.dataset.name,run.inputFiles[button.dataset.name].text,'text/csv;charset=utf-8');break;
    case'add-confirmation':r.confirmation.push({clone_id:'',prep_id:'',enzyme_uM:'',product_uM_per_min:'',assay_id:'',data_origin:campaign.origin==='synthetic'?'synthetic':'user-entered'});changed();render();break;
    case'remove-confirmation':r.confirmation.splice(Number(button.dataset.index),1);for(const ev of r.evidence)ev.decision='pending';changed();render();break;
    case'confirmation-csv':exportCSV('confirmation.csv',r.confirmation,['clone_id','prep_id','enzyme_uM','product_uM_per_min','assay_id','data_origin']);break;
    case'prepare-evidence':prepareEvidence();changed();render();break;
    case'next-round':{requireIdle();if(!r.review.action||r.review.action==='stop'||!r.review.rationale.trim())throw new Error('Choose an action other than stop and record its rationale before starting the next round.');const clone=r.review.chosenClone.trim();if(!clone)throw new Error('Enter the selected parent clone ID.');if(clone!==r.brief.parentCloneId&&(!confirmationReady(r,clone)||r.evidence.find(e=>e.clone_id===clone)?.decision!=='confirmed'))throw new Error('Select a confirmed candidate, or the current parent to continue its lineage.');nextRound(campaign,clone);resetUI();changed();location.hash='#campaign';render();notice('Linked next round created. Enter its new run ID and review the assay rules before screening.');break;}
  }
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button){event.preventDefault();action(button.dataset.action,button).catch(err=>notice(err.message,'error'));}});
async function init(){
  render();$('#save-status').textContent='Loading saved records…';
  try{const id=await getActive(),saved=id&&await loadCampaign(id);if(saved){campaign=validateBackup(saved);revisions.set(campaign.id,saved.revision??0);}
    $('#save-status').textContent=saved?'Restored from this browser':'New campaign · saves in this browser';
  }catch(err){storageOK=false;saveProblem={kind:'storage',message:err.name==='VersionError'?'This tab is older than the stored records. Export any draft and reload the application.':err.message||'Browser storage unavailable — export backups to keep your work.'};$('#save-status').textContent='Browser storage needs attention.';}
  booting=false;document.querySelectorAll('.toolbar button,.toolbar input').forEach(input=>input.disabled=false);render();registerTools();
}
function registerTools(){
  if(!document.modelContext?.registerTool)return;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const tools=[{name:'evozyme_read_campaign_summary',title:'Read Evozyme campaign summary',description:'Read the active campaign, capacity, budget, and saved analysis counts.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:input=>{if(!input||Object.keys(input).length)throw new Error('No input fields are accepted.');let b=null;try{b=budget(round().budget);}catch{}return{campaign:campaign.name,round:round().number,parent:round().brief.parent,budget:b&&{total:b.total,currency:campaign.currency,slots:b.slots,usable:b.usable},analyses:round().analyses.length};}},{name:'evozyme_navigate_stage',title:'Open an Evozyme stage',description:'Navigate to a planning, screening, or review stage without changing campaign data.',inputSchema:{type:'object',properties:{stage:{type:'string',enum:stages.map(s=>s.toLowerCase())}},required:['stage'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||Object.keys(input).length!==1||!stages.map(s=>s.toLowerCase()).includes(input.stage))throw new Error('Choose a valid stage.');location.hash='#'+input.stage;render();return{stage:input.stage};}}];for(const tool of tools)try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
}
init();
