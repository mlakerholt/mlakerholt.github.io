import{e,field,check,heading,table,callout,num,date}from'./ui.mjs';
import{confirmationSummary}from'./core.mjs';
import{confirmationReady}from'./review.mjs';

export function decideView(c,r){
  let confirmation='';
  try{
    const rows=confirmationSummary(r.confirmation,r.review.parentCloneId,r.review.normalization);
    confirmation=table(['Clone','Assay','Preparations','Fold vs parent'],rows.map(x=>[
      `<strong>${e(x.clone_id)}</strong>`,e(x.assay_id),num(x.n,0),x.fold===null?'Parent unavailable':num(x.fold,3)+'×'
    ]));
  }catch(err){confirmation=callout(e(err.message||err),'error');}
  const decisionReady=r.review.action&&r.review.rationale?.trim();
  return heading(4,'Decide','Choose what advances, then retain the supporting evidence.')+
    `<fieldset class="decision-card"><legend>Round decision</legend>`+
      `${decisionReady?'':callout('Choose an action and record the reason for it.','warning')}`+
      `<div class="form-grid two">`+
        `${field(r,'review.action','Action',{options:[['','Choose an action'],['continue','Continue from one parent'],['lineages','Keep several lineages'],['combine','Plan a combination library'],['change','Change assay or strategy'],['stop','Stop and archive']]})}`+
        `${field(r,'review.chosenClone','Selected parent clone',{hint:'Required when continuing from one parent.'})}`+
        `${field(r,'review.rationale','Why this decision?',{type:'textarea',wide:true})}`+
        `${field(r,'review.changedConditions','What changes next round?',{type:'textarea',wide:true})}`+
      `</div><div class="actions"><button type="button" class="primary" data-action="next-round">Create next round</button><button type="button" data-action="export">Export backup</button><button type="button" data-action="print">Print report</button></div>`+
    `</fieldset>`+
    `<details class="supporting-record"><summary>Confirmation evidence (${r.confirmation.length} observations)</summary>`+
      `<div class="form-grid two">${field(r,'review.parentCloneId','Reference parent clone')}${field(r,'review.normalization','Compare using',{options:[['product','Product rate'],['enzyme','Rate / enzyme concentration']]})}</div>`+
      `<div class="actions"><label class="button-like">Import confirmation CSV<input type="file" id="confirmation-input" class="file-control" accept=".csv,text/csv"></label><button type="button" data-action="add-confirmation">Add observation</button><button type="button" data-action="prepare-evidence">Prepare candidate records</button></div>`+
      `${r.confirmationSource?`<small>Imported from ${e(r.confirmationSource.name)} on ${e(date(r.confirmationSource.importedAt))}.</small>`:''}`+
      `${confirmation}`+
      `<details><summary>Edit observations</summary>${r.confirmation.length?table(['Clone','Preparation','Assay','Product rate',''],r.confirmation.map((o,i)=>[field(r,`confirmation.${i}.clone_id`,'Clone'),field(r,`confirmation.${i}.prep_id`,'Preparation'),field(r,`confirmation.${i}.assay_id`,'Assay'),field(r,`confirmation.${i}.product_uM_per_min`,'Product rate',{type:'number',min:0}),`<button type="button" data-action="remove-confirmation" data-index="${i}">Remove</button>`])):'<p>No observations recorded.</p>'}</details>`+
      `${r.evidence.map((ev,i)=>`<details><summary>${e(ev.clone_id)} · ${confirmationReady(r,ev.clone_id)?'ready to decide':'evidence incomplete'}</summary><div class="form-grid two">${field(r,`evidence.${i}.sequenceReference`,'Sequence reference')}${field(r,`evidence.${i}.stock`,'Recoverable stock')}${field(r,`evidence.${i}.propertiesNotes`,'Product and property evidence',{type:'textarea',wide:true})}</div>${check(r,`evidence.${i}.sequenceVerified`,'Sequence checked')}${check(r,`evidence.${i}.productConfirmed`,'Product identity checked')}${check(r,`evidence.${i}.stockRecovered`,'Stock recovery demonstrated')}${check(r,`evidence.${i}.secondaryChecked`,'Required secondary properties checked')}<div class="form-grid two">${field(r,`evidence.${i}.decision`,'Evidence decision',{options:[['pending','Pending'],['retest','More evidence needed'],['confirmed','Confirmed'],['rejected','Do not advance']]})}${field(r,`evidence.${i}.rationale`,'Rationale',{type:'textarea'})}</div></details>`).join('')}`+
    `</details>`+
    `<details class="supporting-record"><summary>Round record and sign-off</summary><div class="form-grid two">${field(r,'review.actualClones','Clones sampled',{type:'number',step:1,min:0})}${field(r,'review.actualValid','Usable results',{type:'number',step:1,min:0})}${field(r,'review.actualCost','Actual cost ('+c.currency+')',{type:'number',min:0})}${field(r,'review.reviewer','Reviewer')}${field(r,'review.reviewedAt','Review date',{type:'date'})}${field(r,'review.archive','Archive location',{wide:true})}</div>${check(r,'review.backupChecked','Backup and restoration checked')}<label class="field"><span>View another round</span><select id="round-select">${c.rounds.map(x=>`<option value="${e(x.id)}" ${r.id===x.id?'selected':''}>Round ${x.number} · ${e(x.brief.parent||'Parent not defined')}</option>`).join('')}</select></label></details>`;
}
