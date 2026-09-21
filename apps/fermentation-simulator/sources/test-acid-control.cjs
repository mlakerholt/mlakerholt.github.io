const assert = require('node:assert/strict');
const fs = require('node:fs');
const model = require('../simulation-core.js');
const planner = require('../feed-derivation.js');
const { create } = require('./simulation-example.js');
const near = (a,b,tol=1e-9) => assert(Math.abs(a-b) <= tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≈ ${b}`);
function inert(edit) {
  const s = create();
  Object.assign(s.process,{type:'batch',duration:.4,initialPh:8,initialBiomass:1,acidNormality:4,maxAcidRate:1});
  Object.assign(s.reactor,{baseRpm:0,maxRpm:0,baseVvm:0,maxVvm:0});
  s.medium.effectiveCarbon=0;s.medium.components[0].concentration=0;
  s.product.type='biomass';s.product.recoverableFraction=1;
  s.biology.enableOverflow=false;
  if(edit)edit(s);
  return s;
}
function check(s) {
  const original=JSON.stringify(s), result=model.simulate(s), r=result.summary;
  assert.equal(JSON.stringify(s),original,'Simulation must not mutate input');
  near(r.carbonBalanceClosure,100);near(r.balanceClosure,100);
  near(r.oxygenBalanceResidualMmol,0);near(r.acidBalanceResidualMmol,0);
  near(r.finalVolume,s.reactor.initialVolume+r.cumulativeFeed+r.cumulativeBase+r.cumulativeAcid-r.cumulativeOutflow);
  for(const row of result.records) {
    assert(Object.values(row).every(value=>typeof value!=='number'||Number.isFinite(value)));
    near(row.workingVolumeExcess,Math.max(0,row.volume-s.reactor.maxWorkingVolume));
    assert(row.cumulativeAcid>=0&&row.cumulativeBase>=0);
  }
  near(result.records.at(-1).cumulativeAcid,r.cumulativeAcid);
  return result;
}
const s=inert(), corrected=check(s);
// 1 pH unit × 50 mmol/(L pH) × 1.5 L / (4000 mmol/L) = 18.75 mL.
near(corrected.summary.cumulativeAcid,.01875);
near(corrected.summary.cumulativeBase,0);
near(corrected.records.at(-1).ph,7);
near(corrected.summary.finalVolume,1.51875);
near(corrected.summary.totalBiomass,1.5);
near(corrected.summary.finalBiomassConcentration,1.5/1.51875);
near(corrected.records.at(-1).dissolvedOxygen,s.process.initialDo*1.5/1.51875);
assert(corrected.records.every(row=>row.ph>=7-1e-10),'No acid-driven overshoot');
const dilute=check(inert(s=>{s.process.acidNormality=2;s.process.duration=.8;}));
near(dilute.summary.cumulativeAcid,.0375);near(dilute.records.at(-1).ph,7);

const low=check(inert(s=>s.process.initialPh=6));
near(low.summary.cumulativeBase,.01875);near(low.summary.cumulativeAcid,0);near(low.records.at(-1).ph,7);
const target=check(inert(s=>s.process.initialPh=7));
near(target.summary.cumulativeAcid,0);near(target.summary.cumulativeBase,0);
const un=check(inert(s=>s.process.phMode='uncontrolled'));
near(un.summary.cumulativeAcid,0);near(un.summary.cumulativeBase,0);near(un.records.at(-1).ph,8);
const off=check(inert(s=>s.process.maxAcidRate=0));
near(off.summary.cumulativeAcid,0);near(off.records.at(-1).ph,8);
assert(off.warnings.some(w=>w.title==='Acid limited'));
const noNormality=check(inert(s=>s.process.acidNormality=0));near(noNormality.summary.cumulativeAcid,0);
const limited=check(inert(s=>{s.process.duration=.0131;s.process.maxAcidRate=.2;}));
near(limited.summary.cumulativeAcid,.2*.06*.0131);
assert(limited.records.at(-1).ph>7);assert(limited.summary.acidLimitedHours>0);
const full=check(inert(s=>s.reactor.maxWorkingVolume=1.5));
near(full.summary.cumulativeAcid,.01875);near(full.summary.finalVolume,1.51875);
assert(full.warnings.some(w=>w.title==='Maximum working volume exceeded'&&w.severity==='high'));
const almostFull=check(inert(s=>s.reactor.maxWorkingVolume=1.50001));
near(almostFull.summary.cumulativeAcid,.01875);near(almostFull.summary.finalVolume,1.51875);
const stopped=check(inert(s=>{s.reactor.maxWorkingVolume=1.5001;s.process.harvestCondition='volume';}));
near(stopped.summary.finalTime,.4);assert.match(stopped.summary.stoppedReason,/duration/);

// Feed and titrants both continue when only a tiny amount of working volume remains.
const priority=inert(s=>{s.process.type='fed-batch';s.reactor.maxWorkingVolume=1.500001;
  s.process.duration=.001;s.feed.start=0;s.feed.strategy='constant';s.feed.initialRateMlMin=1;});
const priorityTrace=model.inspectStep(priority,0).trace;
near(priorityTrace.nodes.feed.appliedMlMin,1);
near(priorityTrace.nodes.ph.acidDelivered,.00006);
near(priorityTrace.after.volume,1.50012);

// Continuous acid addition needs matching level outflow and proportional pool removal.
const continuous=inert(s=>{s.process.type='continuous';s.feed.start=0;s.feed.maxRateMlMin=0;s.feed.initialRateMlMin=0;});
const cr=check(continuous);
near(cr.summary.finalVolume,1.5);near(cr.summary.cumulativeOutflow,cr.summary.cumulativeAcid);
assert(cr.summary.totalBiomass<1.5);near(cr.summary.recoverableProduct,1.5);
near(cr.records.at(-1).ph,7);
for(const scenario of [s,continuous,inert(s=>s.process.initialPh=6)]) {
  const t=model.inspectStep(scenario,0).trace, h=t.nodes.ph, o=t.nodes.oxygen;
  assert(!(h.acidDelivered>0&&h.baseDelivered>0),'Pumps must not oppose one another in an interval');
  const added=h.acidDelivered+h.baseDelivered,out=h.acidOutflow+h.baseOutflow;
  const retained=1-out/(t.nodes.flows.volume+added);
  const H=t.before.acidExcessMmol+h.acidEquivalentMmol+h.acidDelivered*4000-h.baseDelivered*4000;
  near(t.after.acidExcessMmol,H*retained);
  near(t.after.oxygen,o.oxygenAfterReaction*t.nodes.flows.volume/(t.nodes.flows.volume+added));
  near(t.after.biomassMass,t.nodes.flows.biomassMass*retained);
  near(t.after.volume,t.nodes.flows.volume+added-out);
  near(t.nodes.totals.cumulativeAcid,h.acidDelivered);
}
// Old scenarios stay base-only; explicit acid capacity survives simulation snapshots.
const legacy=inert(s=>{delete s.process.acidNormality;delete s.process.maxAcidRate;});
const lr=check(legacy);
assert.equal(lr.scenario.process.maxAcidRate,0);assert.equal(lr.scenario.process.acidNormality,4);
near(lr.records.at(-1).ph,8);near(lr.summary.cumulativeAcid,0);
for(const field of ['acidNormality','maxAcidRate']) for(const value of [-1,null,NaN,Infinity,'1']) {
  const invalid=inert(s=>s.process[field]=value);
  assert(model.validateScenario(invalid).errors.some(e=>e.includes(field)));
  assert.throws(()=>model.simulate(invalid));
}
const invalid=inert(s=>s.process.acidNormality=101);assert(model.validateScenario(invalid).errors.length);
// Smaller intervals reach the same analytic inventory target and conserve volume.
for(const dt of [.001,.0005,.00025]) {
  const r=check(inert(s=>s.process.timeStep=dt));near(r.summary.cumulativeAcid,.01875);near(r.records.at(-1).ph,7);
}
// Feed derivation preview must use the same acid-enabled engine and invalidate cache.
const preview=inert(s=>{s.process.type='fed-batch';s.process.duration=.02;});
const batch=planner.estimateBatch(preview);
const direct=check({...preview,process:{...preview.process,type:'batch'}});
near(batch.points.at(-1).volume,direct.summary.finalVolume);
near(batch.points.at(-1).ph,direct.records.at(-1).ph);
const disabled=structuredClone(preview);disabled.process.maxAcidRate=0;
assert.notEqual(planner.batchKey(preview),planner.batchKey(disabled));

// A run starting at setpoint first forms acetate (base demand), then reuses it
// (acid demand). This exercises automatic direction switching, not just startup.
const metabolic=create();
Object.assign(metabolic.process,{type:'batch',duration:6,initialBiomass:5});
metabolic.product.type='biomass';
const mr=check(metabolic);
assert(mr.summary.peakAcetate>.5);
assert(mr.summary.cumulativeBase>0&&mr.summary.cumulativeAcid>0);
near(mr.records.at(-1).ph,metabolic.process.phSetpoint);
const acidDisabled=structuredClone(metabolic);acidDisabled.process.maxAcidRate=0;
const withoutAcid=check(acidDisabled);
assert(withoutAcid.records.at(-1).ph>7.1,'The same metabolism creates alkalinity without acid dosing');

const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const environment=html.slice(html.indexOf('<legend>Environmental controls</legend>'),html.indexOf('</fieldset>',html.indexOf('<legend>Environmental controls</legend>')));
for(const id of ['acidNormality','maxAcidRate']) assert(environment.includes(`id="${id}"`));
const map=fs.readFileSync(__dirname+'/simulation-map.js','utf8');
for(const key of ['process.acidNormality','process.maxAcidRate','h.acidDelivered','z.cumulativeAcid']) assert(map.includes(key));
const feedWorker=fs.readFileSync(__dirname+'/../feed-derivation-worker.js','utf8');
assert(feedWorker.includes(`simulation-core.js?v=${model.MODEL_VERSION}`));
assert(feedWorker.includes(`feed-derivation.js?v=${planner.VERSION}`));
assert.equal(planner.VERSION,model.MODEL_VERSION,'Invalidate the feed-preview worker cache with this engine revision');
assert(fs.readFileSync(__dirname+'/simulation-worker.js','utf8').includes(`simulation-core.js?v=${model.MODEL_VERSION}`));
console.log('PASS: bidirectional pH control, pump caps, volume exceedance, no opposing doses, continuous outflow, acid/oxygen/carbon balances, legacy defaults, validation, refinement and shared feed preview.');
