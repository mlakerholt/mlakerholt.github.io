export const SCHEMA_VERSION=3;
export function migrateCampaign(value) {
  const c=structuredClone(value),legacy=c.schemaVersion===1;
  c.schemaVersion=SCHEMA_VERSION;c.revision=Number.isSafeInteger(c.revision)?c.revision:0;
  c.guided??=true;c.mappingPresets??=[];c.restorationCheckedAt??=null;
  c.source??=null;
  if(legacy)c.migration={from:1,at:new Date().toISOString(),note:'Earlier analysis snapshots and decisions retained. New analyses require explicit parent identity and configuration review.'};
  for(const r of c.rounds){
    r.sequenceDatasets??=[];
    r.goal??={metric:r.brief.metric||'',direction:'at_least',target:null,unit:r.brief.units||'',referenceVariant:r.brief.parentCloneId||'',referenceCondition:r.brief.conditions||'',secondary:r.brief.secondary||'',provenance:'prospective'};
    r.assay.screeningSystem??=(r.assay.detection==='Fluorescence'?'plate_fluorescence':r.assay.detection==='Luminescence'?'plate_luminescence':r.assay.detection==='Absorbance'?'plate_absorbance':'plate_endpoint');
    r.assay.reference_parent_id??=r.brief.parentCloneId||'';
    r.assay.reviewRecord??=null;
    if(legacy){r.assay.rulesReviewed=false;r.assay.reviewRecord=null;}
    r.review.referenceReason??='';
    r.criteria??={enabled:false,assayId:'',normalization:'product',direction:'at_least',fold:null,notes:''};
    r.costsReviewed??=false;
  }
  return c;
}
