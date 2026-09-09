import {budget,validateAssay,equipmentTotal} from './core.mjs';
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
  const issue=(id,message,path)=>items.push({id,message,path,stage:'assay',kind:'analysis'});
  try{validateAssay(config);}catch(err){issue('assay',err.message,'assay.assay_id');}
  if(config.reference_parent_id!==r.brief.parentCloneId&&!r.review.referenceReason.trim())issue('reference','Explain the comparison change when the screen reference differs from the campaign parent.','assay.reference_parent_id');
  if(r.assay.detection==='Other — planning only')issue('mode','This measurement route needs external analysis. Select a supported linear-rate detection route to use this analyser.','assay.detection');
  if(r.budget.wells!==96||r.budget.preparations!==1)items.push({id:'format',message:'The built-in analyser supports 96 wells and one preparation per candidate per plate. Revise the plan or record an external analysis route.',path:'budget.wells',stage:'budget',kind:'analysis'});
  return items;
}
export function workflowIssues(r) {
  const items=analysisIssues(r);
  const add=(id,message,stage,path,kind='information')=>items.push({id,message,stage,path,kind});
  if(!r.brief.parent.trim())add('parent','Name the parent enzyme.','campaign','brief.parent');
  if(!r.brief.objective.trim())add('objective','Describe the improvement you want.','campaign','brief.objective');
  if(!r.brief.conditions.trim())add('conditions','Record the conditions for a fair comparison.','campaign','brief.conditions');
  if(!hasReviewed(r.assay))add('review','Review the exact analysis settings.','assay','assay.rulesReviewed','review');
  const readiness=['rangeChecked','backgroundChecked','timingChecked','repeatabilityChecked','recoveryChecked'];
  const missing=readiness.filter(k=>!r.assay[k]);
  if(missing.length)add('evidence',`${missing.length} assay performance or recovery checks still need evidence.`, 'assay','assay.'+missing[0],'evidence');
  const eq=equipmentTotal(r.equipment);
  if(eq.gaps.length)add('equipment',`${eq.gaps.length} equipment capabilities need access.`,'equipment','equipment.0.access');
  if(eq.missing)add('quotes',`${eq.missing} purchase quotes are missing.`,'equipment','equipment.0.access');
  const unverified=r.equipment.filter(x=>x.access!=='missing'&&!x.evidence?.trim());
  if(unverified.length)add('acceptance',`${unverified.length} available or planned capabilities need acceptance evidence.`,'equipment','equipment.0.evidence','evidence');
  const software=r.software.filter(x=>!x.ready);
  if(software.length)add('software',`${software.length} software functions need an availability check.`,'equipment','software.0.ready');
  const required=minimumControls(r.assay);
  if(required!==null&&r.budget.controls<required)add('controls',`Assay rules require at least ${required} control wells per plate; the budget reserves ${r.budget.controls}.`,'budget','budget.controls','planning');
  if(r.budget.technical<r.assay.minimum_technical_wells)add('technical','Budgeted technical wells are below the assay requirement.','budget','budget.technical','planning');
  try{const b=budget(r.budget);if(r.library.draws>b.slots)add('draws',`${r.library.draws} library draws exceed ${b.slots} primary clone slots.`,'library','library.draws','planning');}catch(err){add('budget',err.message,'budget','budget.primaryPlates','planning');}
  if(!r.costsReviewed)add('costs','Replace or review the illustrative cost assumptions.','budget','costsReviewed','review');
  if(r.review.parentCloneId!==r.assay.reference_parent_id&&!r.review.referenceReason.trim())add('confirmation-reference','Explain why the confirmation reference differs from the screen reference.','review','review.referenceReason','review');
  return items;
}
export const configDiff=(before,after)=>Object.keys({...before,...after}).filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).map(key=>({key,before:before[key],after:after[key]}));
