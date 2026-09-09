import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyze,budget,validateAssay} from '../core.mjs';
import {newCampaign,activeRound,assayConfig,nextRound,screeningSystems,applyScreeningSystem} from '../data.mjs';
import {parseCSV,validateBackup,fingerprint} from '../io.mjs';
import {configKey,hasReviewed,minimumControls,workflowIssues,analysisIssues} from '../workflow.mjs';
import {controlProposal} from '../workflow-ui.mjs';

const config=JSON.parse(await readFile(new URL('../example/assay.json',import.meta.url),'utf8'));
const input=Object.fromEntries(await Promise.all(['plate_map.csv','clone_register.csv','measurements.csv'].map(async name=>[name,parseCSV(await readFile(new URL('../example/'+name,import.meta.url),'utf8'),name)])));
test('mixed or uniformly incorrect reference-parent IDs cannot nominate candidates',()=>{
  const mixed=structuredClone(input),parents=mixed['plate_map.csv'].filter(r=>r.sample_type==='parent'),prep=parents[0].prep_id;
  parents.filter(r=>r.prep_id===prep).forEach(r=>r.clone_id='C03');
  assert.throws(()=>analyze(mixed,config),/Parent control .*expected PARENT, found C03/);
  assert.throws(()=>analyze(input,{...config,reference_parent_id:'WRONG'}),/Parent control/);
  assert.throws(()=>validateAssay({...config,reference_parent_id:''}),/reference_parent_id/);
});
test('version-one migration preserves analysis and decision history and clears old acknowledgement',()=>{
  const c=newCampaign(),r=activeRound(c);c.schemaVersion=1;delete c.revision;delete c.guided;delete c.mappingPresets;
  const result=analyze(input,config);delete result.config.reference_parent_id;result.engineVersion='1.0.0';
  const inputFiles=Object.fromEntries(Object.entries(input).map(([name])=>[name,{name,text:'retained text',sha256:'test'}]));
  r.analyses.push({id:'old-analysis',result,inputFiles});r.evidence.push({clone_id:'C03',decision:'confirmed'});
  r.assay.rulesReviewed=true;delete r.assay.reference_parent_id;delete r.assay.reviewRecord;
  const previous=JSON.stringify(r.analyses),original=JSON.stringify(c),migrated=validateBackup(c);
  assert.equal(migrated.schemaVersion,2);assert.equal(migrated.revision,0);assert.equal(migrated.rounds[0].assay.reference_parent_id,'PARENT');
  assert.equal(migrated.rounds[0].assay.rulesReviewed,false);assert.equal(migrated.rounds[0].assay.reviewRecord,null);
  assert.equal(JSON.stringify(migrated.rounds[0].analyses),previous);assert.equal(migrated.rounds[0].evidence[0].decision,'confirmed');assert.equal(JSON.stringify(c),original);
});
test('configuration review matches exact effective settings and is invalid after a change',async()=>{
  const r=activeRound(newCampaign());Object.assign(r.assay,config,{fit_times:config.fit_times_s.join(', ')});
  const key=configKey(assayConfig(r.assay));r.assay.rulesReviewed=true;r.assay.reviewRecord={key,sha256:await fingerprint(key),reviewedAt:'2026-09-09'};
  assert.equal(hasReviewed(r.assay),true);
  for(const patch of [{minimum_fold_for_retest:1.5},{reference_parent_id:'SECOND'},{signal_unit:'RFU'},{fit_times_s:[0,30,60]}])assert.equal(hasReviewed(r.assay,{...config,...patch}),false);
  assert.equal(configKey({...config,fit_times_s:[...config.fit_times_s].reverse()}),configKey(config));
});
test('assay control allocation is connected to budget and preserves extra reservation',()=>{
  const r=activeRound(newCampaign());r.assay.minimum_parent_preparations=6;
  assert.equal(minimumControls(r.assay),20);assert.ok(workflowIssues(r).some(x=>x.id==='controls'));
  const p=controlProposal(r);assert.equal(budget(r.budget).slots,160);assert.equal(budget(p.proposed).slots,152);
  r.budget.controls=24;assert.equal(controlProposal(r).proposed.controls,24);
  r.budget.technical=1;assert.equal(controlProposal(r).proposed.technical,2);
});
test('unsupported format and unexplained reference changes are explicit analysis blockers',()=>{
  const r=activeRound(newCampaign());assert.ok(analysisIssues(r,{...config,reference_parent_id:'OTHER'}).some(x=>x.id==='reference'));
  r.review.referenceReason='Comparison to an independently measured baseline';assert.ok(!analysisIssues(r,{...config,reference_parent_id:'OTHER'}).some(x=>x.id==='reference'));
  r.budget.wells=384;assert.ok(analysisIssues(r,config).some(x=>x.id==='format'));
});
test('linked rounds update reference and clear prior configuration review',()=>{
  const c=newCampaign(),r=activeRound(c);r.assay.reviewRecord={key:'old',sha256:'old',reviewedAt:'old'};r.assay.rulesReviewed=true;
  const n=nextRound(c,'C03');assert.equal(n.assay.reference_parent_id,'C03');assert.equal(n.review.parentCloneId,'C03');assert.equal(n.assay.reviewRecord,null);assert.equal(n.assay.rulesReviewed,false);assert.equal(r.assay.reviewRecord.key,'old');
});
test('screening-system starting points are explicit, editable and preserve assay-specific limits',()=>{
  const r=activeRound(newCampaign());r.assay.assay_id='KEEP';r.assay.run_id='RUN';r.assay.signal_ceiling=4321;r.assay.minimum_r2=.91;r.assay.rulesReviewed=true;r.assay.reviewRecord={key:'old'};
  const fluorescence=applyScreeningSystem(r,'plate_fluorescence');
  assert.equal(fluorescence.status,'Built-in analysis');assert.equal(r.assay.detection,'Fluorescence');assert.equal(r.assay.signal_unit,'RFU');assert.equal(r.assay.assay_id,'KEEP');assert.equal(r.assay.run_id,'RUN');assert.equal(r.assay.signal_ceiling,4321);assert.equal(r.assay.minimum_r2,.91);assert.equal(r.assay.rulesReviewed,false);assert.equal(r.assay.reviewRecord,null);
  assert.equal(applyScreeningSystem(r,'cell_sorting').status,'Planning only');assert.equal(r.assay.detection,'Other — planning only');
  assert.equal(Object.keys(screeningSystems).length,8);assert.throws(()=>applyScreeningSystem(r,'invented'),/Choose a supported/);
  const earlier=newCampaign();delete activeRound(earlier).assay.screeningSystem;assert.equal(activeRound(validateBackup(earlier)).assay.screeningSystem,'plate_absorbance');
});
