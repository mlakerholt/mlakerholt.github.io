// Factorial diagnostic: only DO controller and transfer function differ.
// All four variants use the identical frozen benchmark scenario and 0.001 h intervals.
// Legacy combinations exist only here, not as selectable production models.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const legacy=read('sources/fixtures/simulation-core-2026-09-13.2.cjs');
const revised=read('simulation-core.js');
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
assert.equal(sha(legacy),require('../w3110-str50-2022/results.json').modelSha256,'Archived engine must match the original benchmark');
const functionPattern=/  function powerAndKla\(r,volume,rpm,vvm\) \{[\s\S]*?\n  \}\n/;
const oldTransfer=legacy.match(functionPattern)?.[0],newTransfer=revised.match(functionPattern)?.[0];
assert(oldTransfer&&newTransfer);
const load=source=>{const localModule={exports:{}};vm.runInThisContext('(function(module){'+source+'\n})')(localModule);return localModule.exports;};
const variants={original:load(legacy),controllerOnly:load(revised.replace(functionPattern,()=>oldTransfer)),
  transferOnly:load(legacy.replace(functionPattern,()=>newTransfer)),both:load(revised)};
const scenario=JSON.parse(read('benchmarks/w3110-str50-2022/scenario-preset.json'));
scenario.process.timeStep=.001;
const frozen=JSON.stringify(scenario);
const metrics=result=>{
  const fed=result.records.filter(r=>r.time>=6-1e-9);
  return {finalBiomassGL:result.summary.finalBiomassConcentration,
    meanFedDO:fed.reduce((n,r)=>n+r.dissolvedOxygen,0)/fed.length,
    finalDO:result.records.at(-1).dissolvedOxygen,
    finalGlucoseGL:result.summary.finalSubstrateConcentration,
    volumeL:result.summary.finalVolume,feedL:result.summary.cumulativeFeed,
    baseL:result.summary.cumulativeBase,acetateGL:result.summary.finalAcetateConcentration,
    oxygenLimitedHours:result.summary.oxygenLimitedHours,cascadeLimitedHours:result.summary.cascadeLimitedHours,
    meanDO6to16:result.records.filter(r=>r.time>=6-1e-9&&r.time<=16+1e-9).reduce((n,r)=>n+r.dissolvedOxygen,0)/result.records.filter(r=>r.time>=6-1e-9&&r.time<=16+1e-9).length,
    carbonResidualG:result.summary.carbonBalanceResidualG,oxygenResidualMmol:result.summary.oxygenBalanceResidualMmol,
    checkpoints:[5.3,10,15,19].map(t=>result.records.reduce((a,b)=>Math.abs(a.time-t)<Math.abs(b.time-t)?a:b))};
};
const results={};
for(const [name,model] of Object.entries(variants)) {
  const result=model.simulate(scenario);
  assert.equal(JSON.stringify(scenario),frozen);
  assert(Math.abs(result.summary.carbonBalanceClosure-100)<1e-6);
  assert(Math.abs(result.summary.oxygenBalanceResidualMmol)<1e-5);
  results[name]=metrics(result);
  fs.writeFileSync(path.join(__dirname,`trajectory-${name}.json`),JSON.stringify(result.records,null,2)+'\n');
}
const sensitivities={};
for(const [name,change] of [
  ['halfStep',s=>s.process.timeStep=.0005],['quarterStep',s=>s.process.timeStep=.00025],
  ['gassedPowerRatio0p7',s=>s.reactor.gassedPowerFraction=.7],
  ['twoImpellers',s=>s.reactor.impellerCount=2],
  ['measuredKla680',s=>{s.reactor.impellerCount=2;s.reactor.measuredKla=680;}]
]) {
  const s=structuredClone(scenario);change(s);sensitivities[name]=metrics(variants.both.simulate(s));
}
assert(Math.abs(results.both.finalBiomassGL/sensitivities.quarterStep.finalBiomassGL-1)<.005,'Endpoint converges within 0.5%');
assert(Math.abs(results.both.meanDO6to16-sensitivities.quarterStep.meanDO6to16)<.1,'DO trajectory does not depend on numerical damping');
assert(Math.abs(results.both.oxygenLimitedHours-sensitivities.quarterStep.oxygenLimitedHours)<.01,'Low-DO duration converges');
const characterization=Object.fromEntries(Object.entries(variants).map(([key,m])=>[key,m.powerAndKla(scenario.reactor,40,500,1.5)]));
const report={modelVersion:variants.both.MODEL_VERSION,legacySha256:sha(legacy),revisedSha256:sha(revised),
  design:'Same biology, geometry, medium, feed, initial conditions and 0.001 h step for all four variants. Only controller and transfer implementation vary.',
  assumptions:'Coalescing liquid; unmeasured gassed/ungassed power ratio 1. Controller defaults are engineering assumptions, not fitted to the experimental endpoint.',
  literature:'Approximate 80 gDCW/L at 19 h; characterization kLa 680/h at 40 L, 500 rpm, 1.5 vvm. Partial reconstruction; see original benchmark evidence.json.',
  historicalOriginalAt0p005h:require('../w3110-str50-2022/results.json').cases.preset.finalBiomassConcentration,
  scenario,characterization,results,sensitivities};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({characterization,results:Object.fromEntries(Object.entries(results).map(([k,{checkpoints,...v}])=>[k,v])),
  sensitivities:Object.fromEntries(Object.entries(sensitivities).map(([k,{checkpoints,...v}])=>[k,v]))},null,2));
