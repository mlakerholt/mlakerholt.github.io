export const SCHEMA_VERSION=2;
export function migrateCampaign(value) {
  const c=structuredClone(value),legacy=c.schemaVersion===1;
  c.schemaVersion=SCHEMA_VERSION;c.revision=Number.isSafeInteger(c.revision)?c.revision:0;
  c.guided??=true;c.mappingPresets??=[];c.restorationCheckedAt??=null;
  if(legacy)c.migration={from:1,at:new Date().toISOString(),note:'Earlier analysis snapshots and decisions retained. New analyses require explicit parent identity and configuration review.'};
  for(const r of c.rounds){
    r.assay.reference_parent_id??=r.brief.parentCloneId||'';
    r.assay.reviewRecord??=null;
    if(legacy){r.assay.rulesReviewed=false;r.assay.reviewRecord=null;}
    r.review.referenceReason??='';
    r.criteria??={enabled:false,assayId:'',normalization:'product',direction:'at_least',fold:null,notes:''};
    r.costsReviewed??=false;
  }
  return c;
}
