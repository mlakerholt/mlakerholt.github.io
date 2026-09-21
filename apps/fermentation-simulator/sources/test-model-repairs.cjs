/* Physical invariants and independently computed bounds, not golden outputs. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const model = require('../simulation-core.js');
const { create } = require('./simulation-example.js');
const close=(a,b,eps=1e-7)=>assert(Math.abs(a-b)<eps*Math.max(1,Math.abs(a),Math.abs(b)), `${a} != ${b}`);
const fresh=edit=>{const s=create();s.process.duration=1;if(edit)edit(s);return s;};
const carbon=(s,v)=>{s.medium.effectiveCarbon=v;s.medium.components[0].concentration=v;};
function conserved(s) {
  const result=model.simulate(s), r=result.summary;
  close(r.carbonBalanceClosure,100);close(r.balanceClosure,100);
  close(r.oxygenBalanceResidualMmol,0);close(r.acidBalanceResidualMmol,0);
  for(const row of result.records) {
    for(const value of Object.values(row)) if(typeof value==='number') assert(Number.isFinite(value));
    for(const k of ['volume','biomassConcentration','substrateConcentration','acetateConcentration','productConcentration','dissolvedOxygen']) assert(row[k]>=-1e-10,k);
    close(row.workingVolumeExcess,Math.max(0,row.volume-s.reactor.maxWorkingVolume));
  }
  return result;
}
for(const {name,scenario} of require('./model-test-scenarios.cjs')()) {conserved(scenario);console.log('Conserved:',name);}

const dense=fresh(s=>{s.process.initialBiomass=100;s.process.type='batch';s.process.phMode='uncontrolled';});
const denseTrace=model.inspectStep(dense,0).trace,o=denseTrace.nodes.oxygen;
const bound=(o.oxygenBefore+o.kla*o.cStar*denseTrace.dt)*o.volumeUsed;
assert(denseTrace.nodes.totals.oxygenUsed<=bound+1e-8);
close(o.oxygenBefore*o.volumeUsed+o.oxygenTransferred-o.oxygenUsed,o.oxygenAfterReaction*o.volumeUsed);
const noGas=fresh(s=>{s.process.type='batch';s.process.initialDo=0;s.reactor.baseRpm=s.reactor.maxRpm=0;s.reactor.baseVvm=s.reactor.maxVvm=0;});
const ng=conserved(noGas);close(ng.summary.oxygenConsumedMmol,0);close(ng.summary.totalBiomass,.075);
assert.equal(model.powerAndKla(noGas.reactor,1.5,0,0).kla,0);

const fractional=fresh(s=>s.process.duration=.0131), f=model.inspectStep(fractional,999999).trace;
close(f.after.time,.0131,1e-12);close(f.before.time+f.dt,.0131,1e-12);assert(f.dt<.005);
const event=fresh(s=>{s.feed.start=.0131;s.product.inductionTime=.0237;});
const sequence=model.createSimulation(event);let item=sequence.next(), starts=[];
for(item=sequence.next();!item.done;item=sequence.next()) starts.push(item.value.time);
assert(starts.includes(.0131)&&starts.includes(.0237));
assert(model.inspectTime(event,.0237).trace.nodes.environment.induced);
assert(model.inspectTime(event,.0131).trace.nodes.feed.active);

const ph=fresh(s=>{s.process.type='batch';s.process.initialBiomass=10;s.process.maxBaseRate=0;s.process.bufferCapacity=1;carbon(s,.1);s.biology.enableOverflow=false;});
const pr=conserved(ph);assert(pr.records.at(-1).ph<7);assert.equal(pr.summary.cumulativeBase,0);
for(let i=1;i<pr.records.length;i++)assert(pr.records[i].ph<=pr.records[i-1].ph+1e-10,'No free pH recovery');
const below=fresh(s=>{s.process.phSetpoint=2.5;s.biology.optimalPh=2.5;s.process.type='batch';});
close(conserved(below).records.at(-1).ph,2.5);
const historicalAcid=fresh(s=>{s.process.initialPh=6.8;s.process.phSetpoint=7;carbon(s,0);s.process.type='batch';});
const ha=conserved(historicalAcid);assert(ha.summary.cumulativeBase>0);close(ha.records.at(-1).ph,7);

const full=fresh(s=>{s.reactor.maxWorkingVolume=1.5;s.reactor.totalVolume=1.52;s.process.baseNormality=.01;s.process.maxBaseRate=100;s.process.initialBiomass=10;});
const fr=conserved(full);assert(fr.summary.finalVolume>1.5);assert(fr.summary.cumulativeBase>0);close(fr.summary.cumulativeFeed,0);close(fr.summary.peakFeedRate,0);
close(fr.summary.finalVolume,1.5+fr.summary.cumulativeBase+fr.summary.cumulativeAcid);
const continuous=fresh(s=>{s.process.type='continuous';s.feed.start=0;s.product.type='biomass';s.product.recoverableFraction=1;});
const cr=conserved(continuous);close(cr.summary.finalVolume,1.5);assert(cr.records.at(-1).harvestedProduct>0);
close(cr.summary.recoverableProduct,cr.summary.totalBiomass+cr.records.at(-1).harvestedProduct);
continuous.feed.maxRateMlMin=0;close(model.feedRateLh(continuous,0,100,15,1.5).applied,0);

const starved=fresh(s=>{s.process.type='batch';s.process.duration=100;carbon(s,0);s.product.type='custom';s.product.beta=1;s.product.degradation=0;});
const sr=conserved(starved);assert.equal(sr.summary.recoverableProduct,0);assert.equal(sr.summary.oxygenConsumedMmol,0);
const scarce=fresh(s=>{s.process.type='batch';s.process.duration=10;s.product.type='custom';s.product.alpha=0;s.product.beta=1;s.product.degradation=0;carbon(s,.01);});
const sc=conserved(scarce);assert(sc.summary.recoverableProduct<=.015*.5+1e-8,'Product cannot exceed supplied substrate times yield');
const early=fresh(s=>{s.process.duration=36;s.reactor.maxWorkingVolume=1.51;s.process.harvestCondition='volume';});
const er=conserved(early), et=model.inspectStep(early,999999).trace;
close(er.summary.finalTime,36);assert(er.summary.maxWorkingVolumeExcess>0);
close(er.records.at(-1).rpm,et.nodes.controller.rpm);close(er.records.at(-1).growthRate,et.nodes.growth.mu);

for(const edit of [s=>delete s.biology.muMax,s=>s.biology.muMax=NaN,s=>s.process.phSetpoint=-1,
  s=>s.product.recoverableFraction=1.5,s=>s.process.maxBaseRate=-1,s=>s.process.initialBiomass=-1,
  s=>s.reactor.operatingPressure=5,s=>s.feed.strategy='invalid',s=>s.process.inoculumMode='od',
  s=>s.medium.components[0].concentration=null,s=>s.medium.components=[null],s=>s.medium.components=null,
  s=>s.process.inoculumMode='invalid',s=>Object.assign(s.process,{inoculumMode:'od',initialOd:.1,odToDcw:.5,initialBiomass:10})]) {
  const s=fresh(edit);assert(model.validateScenario(s).errors.length);assert.throws(()=>model.simulate(s));
}
close(model.effectiveCarbon([{name:'Glucose',concentration:100,unit:'mmol/L',role:'carbon'}]),18.0156);
assert(Number.isNaN(model.effectiveCarbon([{name:'Unknown',concentration:1,unit:'mmol/L',role:'carbon'}])));
close(model.effectiveCarbon([{name:'Glucose',concentration:15000,unit:'mg/L',role:'carbon'}]),15);
const obs={yxS:.36,maintenance:.01,yieldBasis:'observed',yieldReferenceGrowthRate:.028};
close(.028/model.growthYield(obs)+.01,.028/.36);
const cho=fresh(s=>{s.process.type='batch';s.biology.substrateThreshold=.58;carbon(s,.5);});
assert.equal(model.inspectStep(cho,0).trace.nodes.growth.mu,0);
for(const id of ['generalized-cho','generalized-saccharomyces-cerevisiae','generalized-aspergillus-niger']) {
  const s=fresh(s=>s.biology.preset=id), warnings=model.validateScenario(s).warnings.join(' ');
  assert.match(warnings,/Generalized profile/);assert.match(warnings,/viability|ethanol|pellet/);
}
// Independent refinement: cap is not itself proof of convergence.
const values=[];
for(const dt of [.001,.0005,.00025]) {
  const s=create();s.process.timeStep=dt;s.feed.initialRateMlMin*=5;s.feed.maxRateMlMin=1.25;
  values.push(conserved(s).summary.finalBiomassConcentration);
}
assert(Math.abs(values[0]/values[2]-1)<.01,'High-feed biomass refinement within 1%');
console.log('High-feed refinement gDCW/L:',values);

// Exercise actual UI handlers with drawing stubbed, not a rewritten preset handler.
const fields=new Map(),element=id=>{
  if(!fields.has(id)) {
    let value='';
    fields.set(id,{get value(){return value;},set value(v){value=String(v);},checked:false,
      type:['enableOverflow','baffled','allowNitrogen','allowCo2','strictFailures','aerobicFailureRules'].includes(id)?'checkbox':'text',removeAttribute(){}});
  }
  return fields.get(id);
};
const context={window:{FermentationModel:model},document:{querySelector:q=>{
  if(q==='input[name="processType"]:checked') return [...fields].find(([id,e])=>id.startsWith('input[name="processType"]')&&e.checked)?.[1];
  const e=element(q.replace(/^#/,''));
  if(q.startsWith('input[name="processType"]')) e.value=q.match(/value="([^"]+)"/)[1];
  return e;
},dispatchEvent(){}},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},console};
let source=fs.readFileSync(__dirname+'/../tmp/app-source.js','utf8');
source=source.replace('  document.addEventListener("DOMContentLoaded", init);','  window.test = { state, STRAINS, applyStrainPreset, applyScenario, getNumber, updateAllViews, buildScenario };');
for(const fn of ['updateConditionalFields','updateCompositionTotals','updateDerivedGeometry','drawVessel','updateSidebar','renderReview','renderComposition','renderResultsPlaceholder','showStep'])
  source=source.replace(new RegExp('function '+fn+'\\(([^)]*)\\) \\{'),'function '+fn+'($1) { return;');
vm.runInNewContext(source,context);const ui=context.window.test;
ui.applyStrainPreset('generalized-aspergillus-niger',true);ui.applyStrainPreset('ecoli-bl21',true);
assert.equal(Number(element('phSetpoint').value),7);assert.equal(element('mediumPreset').value,'defined-hcd');
assert.equal(Number(element('targetGrowthRate').value),ui.STRAINS['ecoli-bl21'].muMax*.6,'Complete preset fallback scales with organism muMax');
element('presetApplyMode').value='biology-only';element('phSetpoint').value=3;ui.applyStrainPreset('ecoli-bl21',true);assert.equal(Number(element('phSetpoint').value),3);
element('targetGrowthRate').value='.123';ui.applyStrainPreset('cho-mab',true);assert.equal(Number(element('targetGrowthRate').value),.123,'Biology-only selection preserves manual feed target');
element('presetApplyMode').value='complete';ui.applyStrainPreset('cho-mab',true);
assert.equal(Number(element('targetGrowthRate').value),ui.STRAINS['cho-mab'].recommendedProcess.targetGrowthRate,'Explicit organism preset target is retained');
element('temperature').value='';assert(Number.isNaN(ui.getNumber('temperature',37)));
ui.state.lastResult={summary:{totalBiomass:123}};ui.updateAllViews();assert.equal(ui.state.lastResult,null);
ui.applyStrainPreset('cho-mab',false);assert.equal(element('yieldBasis').value,'observed');assert.equal(Number(element('substrateThreshold').value),.58);
const imported=create();imported.schemaVersion='fermentation-simulator/v0.1';imported.reactor.name='My calibrated imported reactor';
imported.reactor.measuredKla=80;imported.process.initialPh=6.8;
imported.reactor.gassedPowerFraction=.7;
Object.assign(imported.process,{doKp:.8,doIntegralTimeSeconds:180,doSensorTimeSeconds:20,doActuatorTimeSeconds:25});
ui.applyScenario(imported);
const rebuilt=ui.buildScenario();
assert.equal(rebuilt.process.strictFailures,false,'Legacy scenarios preserve kinetics');
const strictImport=structuredClone(imported);strictImport.process.strictFailures=true;strictImport.process.aerobicFailureRules=false;
ui.applyScenario(strictImport);
assert.equal(ui.buildScenario().process.strictFailures,true,'Strict-mode flag survives import/export');
assert.equal(ui.buildScenario().process.aerobicFailureRules,false,'Low-oxygen exception survives import/export');
ui.applyScenario(imported);
assert.equal(rebuilt.reactor.oxygenSupplyMode,'fixed');
assert.equal(rebuilt.reactor.fixedOxygenFraction,1);
const fixedGas=structuredClone(imported);
fixedGas.reactor.fixedOxygenFraction=.4;fixedGas.reactor.maxOxygenFraction=.21;
ui.applyScenario(fixedGas);
assert.equal(ui.buildScenario().reactor.fixedOxygenFraction,.4);
assert.equal(ui.buildScenario().reactor.maxOxygenFraction,.21);
const oldGas=structuredClone(imported);delete oldGas.reactor.oxygenSupplyMode;delete oldGas.reactor.fixedOxygenFraction;
ui.applyScenario(oldGas);
assert.equal(ui.buildScenario().reactor.oxygenSupplyMode,'adaptive');
assert.equal(ui.buildScenario().reactor.fixedOxygenFraction,1);
const adaptiveGas=structuredClone(imported);adaptiveGas.reactor.oxygenSupplyMode='adaptive';adaptiveGas.reactor.maxOxygenFraction=.6;
ui.applyScenario(adaptiveGas);
assert.equal(ui.buildScenario().reactor.oxygenSupplyMode,'adaptive');
assert.equal(ui.buildScenario().reactor.maxOxygenFraction,.6);
const legacyVolume=structuredClone(imported);legacyVolume.process.harvestCondition='volume';
ui.applyScenario(legacyVolume);assert.equal(ui.buildScenario().process.harvestCondition,'duration');
ui.applyScenario(imported);
assert.equal(rebuilt.process.acidNormality,4);
assert.equal(rebuilt.process.maxAcidRate,1,'Acid settings survive import/export');
const legacy=structuredClone(imported);delete legacy.process.acidNormality;delete legacy.process.maxAcidRate;
ui.applyScenario(legacy);
assert.equal(ui.buildScenario().process.acidNormality,4);
assert.equal(ui.buildScenario().process.maxAcidRate,0,'Legacy import must not silently enable acid dosing');
const acidScenario=structuredClone(imported);acidScenario.process.acidNormality=2.5;acidScenario.process.maxAcidRate=.37;
ui.applyScenario(acidScenario);
assert.equal(ui.buildScenario().process.acidNormality,2.5);
assert.equal(ui.buildScenario().process.maxAcidRate,.37);
ui.applyScenario(imported);
assert.equal(rebuilt.feed.maxRateMlMin,null,'Default unlimited capacity survives UI import/export');
assert.equal(rebuilt.reactor.name,imported.reactor.name);assert.equal(rebuilt.reactor.measuredKla,80);
assert.equal(rebuilt.reactor.gassedPowerFraction,.7);
for(const key of Object.keys(model.DO_DEFAULTS)) assert.equal(rebuilt.process[key],imported.process[key],key+' survives UI import/export');
assert.equal(rebuilt.process.initialPh,6.8);assert.equal(model.validateScenario(rebuilt).errors.length,0);
assert(model.validateScenario(rebuilt).warnings.some(x=>x.includes('another model version')));
const oldImport=structuredClone(imported);
for(const key of Object.keys(model.DO_DEFAULTS)) delete oldImport.process[key];
delete oldImport.reactor.gassedPowerFraction;
ui.applyScenario(oldImport);
for(const [key,value] of Object.entries(model.DO_DEFAULTS)) assert.equal(ui.buildScenario().process[key],value);
assert.equal(ui.buildScenario().reactor.gassedPowerFraction,1);
element('maxFeedRate').value='25';assert.equal(ui.buildScenario().feed.maxRateMlMin,25);
const limitedImport=ui.buildScenario();ui.applyScenario(limitedImport);assert.equal(ui.buildScenario().feed.maxRateMlMin,25);
delete limitedImport.feed.maxRateMlMin;ui.applyScenario(limitedImport);assert.equal(ui.buildScenario().feed.maxRateMlMin,null);
element('maxFeedRate').value='0';assert.equal(ui.buildScenario().feed.maxRateMlMin,0,'Explicit zero is not unlimited');
element('maxFeedRate').value='';assert.equal(ui.buildScenario().feed.maxRateMlMin,null);
const beforeInvalid=JSON.stringify(ui.buildScenario().reactor);
assert.throws(()=>ui.applyScenario({}));assert.equal(JSON.stringify(ui.buildScenario().reactor),beforeInvalid,'Invalid import does not partially overwrite the form');
element('impellerCount').value='2.5';assert.equal(ui.buildScenario().reactor.impellerCount,2.5);
assert(model.validateScenario(ui.buildScenario()).errors.some(x=>x.includes('integer')));
const snapshot=create(), result=model.simulate({...snapshot,process:{...snapshot.process,duration:.01}});
snapshot.biology.muMax=99;assert.notEqual(result.scenario.biology.muMax,99);
console.log('PASS: resource conservation, oxygen availability, starvation, pH, events, volume/pumps, reporting, validation, units, yield semantics, refinement and UI repairs.');
