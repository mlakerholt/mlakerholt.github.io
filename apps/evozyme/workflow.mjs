import {budget,validateAssay} from './core.mjs';
import {assayConfig} from './data.mjs';

export function configKey(config) {
  const normalized={...config,fit_times_s:[...config.fit_times_s].sort((a,b)=>a-b),signal_floor:config.signal_floor??null};
  return JSON.stringify(Object.fromEntries(Object.keys(normalized).sort().map(k=>[k,normalized[k]])));
}
export function hasReviewed(assay,config=assayConfig(assay)) {
  try {validateAssay(config);return Boolean(assay.reviewRecord?.key===configKey(config)&&assay.reviewRecord?.sha256&&assay.rulesReviewed);}catch{return false;}
}
export function minimumControls(a) {
  const numbers=[a.minimum_blank_wells,a.minimum_host_wells,a.minimum_parent_preparations,a.minimum_technical_wells];
  return numbers.every(v=>Number.isSafeInteger(v)&&v>0)?numbers[0]+numbers[1]+numbers[2]*numbers[3]:null;
}
export function analysisIssues(r,config=assayConfig(r.assay)) {
  const items=[];
  const issue=(id,message,path)=>items.push({id,message,path,stage:'plan',kind:'analysis'});
  try{validateAssay(config);}catch(err){issue('assay',err.message,'assay.assay_id');}
  if(config.reference_parent_id!==r.brief.parentCloneId&&!r.review.referenceReason.trim())issue('reference','Explain the comparison change when the screen reference differs from the campaign parent.','assay.reference_parent_id');
  if(r.assay.detection==='Other — planning only')issue('mode','This measurement route needs external analysis. Select a supported linear-rate detection route to use this analyser.','assay.detection');
  if(r.budget.wells!==96||r.budget.preparations!==1)items.push({id:'format',message:'The built-in analyser supports 96 wells and one preparation per candidate per plate.',path:'budget.wells',stage:'library',kind:'analysis'});
  return items;
}
export function workflowIssues(r) {
  const items=r.sequenceDatasets?.length?[]:analysisIssues(r);
  const add=(id,message,stage,path,kind='information')=>items.push({id,message,stage,path,kind});
  if(!r.brief.parent.trim())add('parent','Name the parent enzyme.','plan','brief.parent');
  if(!r.brief.objective.trim())add('objective','Describe the improvement you want.','plan','brief.objective');
  if(!r.brief.conditions.trim())add('conditions','Record the comparison conditions.','plan','brief.conditions');
  const required=minimumControls(r.assay);
  if(required!==null&&r.budget.controls<required)add('controls',`Reserve at least ${required} control wells per plate; the estimate currently uses ${r.budget.controls}.`,'library','budget.controls','planning');
  if(r.budget.technical<r.assay.minimum_technical_wells)add('technical','Technical replicate capacity is below the analysis setting.','library','budget.technical','planning');
  try{const b=budget(r.budget);if(r.library.draws>b.slots)add('draws',`${r.library.draws} planned variants exceed ${b.slots} available slots.`,'library','library.draws','planning');}catch(err){add('budget',err.message,'library','budget.primaryPlates','planning');}
  if(!r.costsReviewed)add('costs','Review the cost assumptions.','library','costsReviewed','review');
  if(r.review.parentCloneId!==r.assay.reference_parent_id&&!r.review.referenceReason.trim())add('confirmation-reference','Explain why the confirmation reference differs from the screen reference.','decide','review.referenceReason','review');
  return items;
}
export const configDiff=(before,after)=>Object.keys({...before,...after}).filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).map(key=>({key,before:before[key],after:after[key]}));
