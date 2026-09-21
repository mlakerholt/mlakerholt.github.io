const assert=require('node:assert/strict');
const fs=require('node:fs');
const model=require('../simulation-core.js');
const {create}=require('./simulation-example.js');
const near=(a,b,eps=1e-9)=>assert(Math.abs(a-b)<=eps*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≈ ${b}`);
function example(edit) {
  const s=create();
  Object.assign(s.process,{duration:.1,initialBiomass:0,phMode:'uncontrolled'});
  Object.assign(s.feed,{strategy:'constant',start:0,initialRateMlMin:10,maxRateMlMin:null});
  s.reactor.maxWorkingVolume=1.51;
  if(edit)edit(s);
  return s;
}
function run(s) {
  const before=JSON.stringify(s),r=model.simulate(s),sum=r.summary;
  assert.equal(JSON.stringify(s),before);
  near(sum.finalVolume,s.reactor.initialVolume+sum.cumulativeFeed+sum.cumulativeBase+sum.cumulativeAcid-sum.cumulativeOutflow);
  near(sum.balanceClosure,100);near(sum.carbonBalanceClosure,100);
  near(sum.oxygenBalanceResidualMmol,0);near(sum.acidBalanceResidualMmol,0);
  for(const row of r.records) {
    assert(Object.values(row).every(value=>typeof value==='boolean'||Number.isFinite(value)));
    near(row.workingVolumeExcess,Math.max(0,row.volume-s.reactor.maxWorkingVolume));
  }
  return r;
}
for(const harvestCondition of ['duration','volume']) {
  const s=example(s=>s.process.harvestCondition=harvestCondition),r=run(s),sum=r.summary;
  near(sum.finalTime,.1);assert.equal(sum.stoppedReason,'Process duration reached');
  near(sum.finalVolume,1.56);near(sum.peakVolume,1.56);near(sum.cumulativeFeed,.06);
  near(sum.maxWorkingVolumeExcess,.05);near(sum.maxWorkingVolumeExcessPercent,100*.05/1.51);
  near(sum.workingVolumeExceededAt,.017);
  assert(!r.records.some(row=>Math.abs(row.time-.017)<1e-10),'Exceedance time is not restricted to stored plot points');
  const warning=r.warnings.find(w=>w.title==='Maximum working volume exceeded');
  assert.equal(warning.severity,'high');
  for(const text of ['1.56 L','1.51 L','0.05 L','3.31126%','0.017 h','extrapolations']) assert(warning.message.includes(text));
  assert(!r.warnings.some(w=>w.title==='Total vessel volume exceeded'));
  const trace=model.inspectStep(s,999999).trace;
  near(trace.after.volume,1.56);near(trace.after.workingVolumeExcess,.05);
  near(trace.nodes.totals.peakVolume,1.56);assert(!trace.nodes.feed.volumeLimited);
  assert(trace.nodes.feed.active);
}
const exact=run(example(s=>s.reactor.maxWorkingVolume=1.56));
assert(!exact.warnings.some(w=>w.title==='Maximum working volume exceeded'));
assert.equal(exact.summary.workingVolumeExceededAt,null);
const below=run(example(s=>s.reactor.maxWorkingVolume=2));
near(below.summary.maxWorkingVolumeExcess,0);assert.equal(below.summary.workingVolumeExceededAt,null);
const zero=run(example(s=>{s.feed.initialRateMlMin=0;s.feed.maxRateMlMin=0;}));near(zero.summary.finalVolume,1.5);
const capped=run(example(s=>{s.feed.strategy='exponential';s.feed.initialRateMlMin=10;s.feed.maxRateMlMin=10;s.feed.targetGrowthRate=2;}));
assert(capped.records.every(row=>row.feedRateMlMin<=10+1e-9));assert(capped.summary.pumpLimitedHours>0);
const total=run(example(s=>s.reactor.totalVolume=1.52));
const totalWarning=total.warnings.find(w=>w.title==='Total vessel volume exceeded');
assert.equal(totalWarning.severity,'high');assert.match(totalWarning.message,/0\.04 L/);
near(total.summary.finalTime,.1);near(total.summary.finalVolume,1.56);
const initiallyOver=example(s=>{s.reactor.initialVolume=1.6;s.process.type='batch';});
assert.equal(model.validateScenario(initiallyOver).errors.length,0);
const initial=run(initiallyOver);assert.equal(initial.summary.workingVolumeExceededAt,0);
near(initial.summary.maxWorkingVolumeExcess,.09);
const continuous=run(example(s=>s.process.type='continuous'));
near(continuous.summary.finalVolume,1.5);near(continuous.summary.maxWorkingVolumeExcess,0);
const continuousOver=run(example(s=>{s.process.type='continuous';s.reactor.initialVolume=1.6;}));
near(continuousOver.summary.finalVolume,1.6);assert.equal(continuousOver.summary.workingVolumeExceededAt,0);
// Initial substrate + feed are retained even after crossing the volume threshold.
near(total.summary.residualSubstrate,1.5*15+.06*500);
near(total.summary.finalSubstrateConcentration,(1.5*15+.06*500)/1.56);
// Explicit substrate harvest and invalid-input guards still operate.
const substrate=example(s=>{s.process.type='batch';s.process.duration=1;s.process.harvestCondition='substrate';s.medium.effectiveCarbon=0;s.medium.components[0].concentration=0;});
assert.match(run(substrate).summary.stoppedReason,/Substrate exhaustion/);
const bad=example(s=>s.reactor.initialVolume=-1);assert(model.validateScenario(bad).errors.length);
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
assert(!html.includes('<option value="volume">At maximum working volume</option>'));
console.log('PASS: warning-only volume limits, uncapped delivery, legacy harvest continuation, peak/excess/first-time metrics, overfilled initial states, pump limits, continuous balances and numeric guards.');
