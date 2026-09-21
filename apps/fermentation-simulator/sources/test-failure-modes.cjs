const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const m=require('../simulation-core.js');
const {create}=require('./simulation-example.js');
const near=(a,b,tol=1e-7)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
function scenario(profile='bacterial') {
  const s=create();s.process.strictFailures=true;s.process.duration=3;
  const profiles={bacterial:['ecoli-bl21','E. coli','Microbial fermentation'],mammalian:['cho','CHO','Animal cell culture'],
    yeast:['generalized-saccharomyces-cerevisiae','S. cerevisiae','Microbial fermentation'],fungal:['generalized-aspergillus-niger','A. niger','Microbial fermentation']};
  [s.biology.preset,s.biology.name,s.biology.category]=profiles[profile];
  s.biology.enableOverflow=profile==='bacterial';
  return s;
}
function safe(s) {const p=m.failureProfile(s);return {volume:1.5,ph:(p.phMin+p.phMax)/2,substrateConcentration:1,
  acetateConcentration:0,dissolvedOxygen:40,tipSpeed:1,growthRate:.1,substrateUptake:.2};}
for(const profile of ['bacterial','mammalian','yeast','fungal']) {
  const s=scenario(profile);assert.equal(m.failureProfile(s).id,profile);
  for(const rule of m.failureRules(s)) {
    const f=m.createFailureState(s), metrics=safe(s);
    const boundary=Array.isArray(rule.limit)?rule.limit[0]:rule.limit;
    metrics[rule.parameter]=boundary;
    if(rule.starvation){metrics.growthRate=0;metrics.substrateUptake=0;}
    m.updateFailureState(s,f,metrics,rule.hours+1,rule.hours+1);
    assert.equal(f.events.some(e=>e.id===rule.id),rule.comparison==='at-or-above',`${profile}/${rule.id} exact boundary`);
    const state=m.createFailureState(s);
    metrics[rule.parameter]=rule.comparison==='below'||rule.comparison==='outside'?Math.max(0,boundary-.01):boundary+.01;
    const first=Math.max(0,rule.hours-.001);
    m.updateFailureState(s,state,metrics,first,first);
    assert.equal(state.events.some(e=>e.id===rule.id),rule.hours===0,`${rule.id} no early trigger`);
    if(rule.hours) m.updateFailureState(s,state,metrics,.001,rule.hours);
    const event=state.events.find(e=>e.id===rule.id);assert(event,`${profile}/${rule.id} triggers`);
    near(event.deviation,.01);near(event.triggerExposureHours,rule.hours);
    assert.equal(event.penalty,rule.penalty);
    if(rule.penalty==='culture-failure')assert(state.cultureFailed&&state.batchFailed);
    if(rule.penalty==='batch-failure')assert(state.batchFailed);
    assert(fs.existsSync(path.join(__dirname,'../assets/failures',rule.image+'.png')));
  }
}
const s=scenario(),f=m.createFailureState(s), bad={...safe(s),dissolvedOxygen:4,ph:5};
m.updateFailureState(s,f,bad,.49,.49);m.updateFailureState(s,f,safe(s),.005,.495);
m.updateFailureState(s,f,bad,.01,.505);assert.equal(f.stressMultiplier,.25,'Short recovery does not erase exposure');
assert.equal(f.events.filter(e=>e.penalty==='stress').length,2,'Concurrent stress rules trigger');
m.updateFailureState(s,f,safe(s),1/60,.505+1/60);assert.equal(f.stressMultiplier,1,'One-minute recovery clears stress');
assert(f.events.every(e=>!e.active&&e.resolvedAt!==null));
m.updateFailureState(s,f,bad,.5,1.1);assert.equal(f.events.length,4,'Recovered stress can recur');
const death=m.createFailureState(s);m.updateFailureState(s,death,bad,2,2);assert(death.cultureFailed);
m.updateFailureState(s,death,safe(s),1,3);assert(death.cultureFailed&&death.batchFailed);assert.equal(death.stressMultiplier,0);
const latchedEvent=structuredClone(death.events.find(e=>e.id==='ph-failure'));
m.updateFailureState(s,death,bad,.5,3.5);
assert.deepEqual(death.events.find(e=>e.id==='ph-failure'),latchedEvent,'A recovered failure episode is not rewritten by later exposure');
const starvation=m.createFailureState(s),fed={...safe(s),substrateConcentration:.001};
m.updateFailureState(s,starvation,fed,10,10);assert(!starvation.events.some(e=>e.id==='starvation'),'Low substrate with growth is not starvation');
fed.growthRate=0;fed.substrateUptake=0;fed.acetateConcentration=.02;
m.updateFailureState(s,starvation,fed,10,20);assert(!starvation.events.some(e=>e.id==='starvation'),'Usable acetate protects');
fed.acetateConcentration=0;m.updateFailureState(s,starvation,fed,8,28);assert(starvation.events.some(e=>e.id==='starvation'));
s.process.aerobicFailureRules=false;assert(!m.failureRules(s).some(r=>['low-do','anoxia'].includes(r.id)));
const disabled=scenario();disabled.process.strictFailures=false;const df=m.createFailureState(disabled);
m.updateFailureState(disabled,df,{...safe(disabled),ph:0,volume:20},100,100);assert.equal(df.events.length,0);
const legacy=create();assert.equal(m.createFailureState(legacy).enabled,false);

// End-to-end culture death: total biomass/carbon remain, uptake ends and dosing continues.
const dying=scenario();dying.process.duration=3;dying.process.phSetpoint=5.4;
dying.process.initialBiomass=1;dying.feed.start=0;dying.feed.strategy='constant';dying.feed.initialRateMlMin=.01;
dying.product.inductionTime=0;dying.product.postInductionTemperature=37;
const result=m.simulate(dying),summary=result.summary;
assert(summary.cultureFailed&&summary.batchFailed);near(summary.finalTime,3);near(summary.acceptedProduct,0);
near(summary.totalBiomass,summary.nonviableBiomass);near(summary.viableBiomass,0);
near(summary.carbonBalanceClosure,100,1e-5);near(summary.oxygenBalanceResidualMmol,0,1e-5);near(summary.acidBalanceResidualMmol,0,1e-5);
assert(summary.recoverableProduct>0,'Death does not delete existing product');
const deathEvent=result.failures.events.find(e=>e.id==='ph-failure');near(deathEvent.time,2,.002);
const after=result.records.filter(r=>r.time>deathEvent.time+1e-8);
assert(after.every(r=>r.viableBiomassConcentration===0&&r.growthRate===0&&r.substrateUptake===0));
near(after.at(-1).oxygenConsumedMmol,after[0].oxygenConsumedMmol,1e-8);
assert(after.at(-1).cumulativeFeed>after[0].cumulativeFeed);
near(after.at(-1).totalBiomass,after[0].totalBiomass,1e-8);
assert(after.at(-1).substrateConcentration>after[0].substrateConcentration);
assert(after.at(-1).totalProduct<after[0].totalProduct,'Existing product can degrade');
const off=structuredClone(dying);off.process.strictFailures=false;
assert(m.simulate(off).summary.totalBiomass>summary.totalBiomass,'Strict penalties reduce biomass');
const fine=structuredClone(dying);fine.process.timeStep=.0005;
near(m.simulate(fine).summary.totalBiomass,summary.totalBiomass,.001);

// Two active stresses still quarter growth/product potential exactly once.
const stressed=scenario();stressed.process.phSetpoint=5.4;stressed.biology.optimalPh=5.4;
stressed.biology.enableOverflow=false;stressed.product.type='plasmid';stressed.process.duration=.6;
stressed.reactor.baseRpm=stressed.reactor.maxRpm=3000;
const st=m.inspectTime(stressed,.51).trace.nodes;
assert.equal(st.failures.appliedStressMultiplier,.25);
near(st.growth.mu,st.growth.unrestrictedMu*.25*st.growth.availabilityFactor,1e-8);
near(st.product.qP,(stressed.product.alpha*st.growth.unrestrictedMu+
  stressed.product.beta*st.growth.substrateTerm*st.growth.oxygenTerm)*.25*st.growth.availabilityFactor,1e-8);
for(const profile of ['bacterial','mammalian']) {
  const anoxic=scenario(profile);anoxic.process.duration=2.1;anoxic.process.initialDo=0;
  anoxic.reactor.baseVvm=anoxic.reactor.maxVvm=0;
  const ar=m.simulate(anoxic);assert(ar.summary.batchFailed);assert.equal(ar.summary.cultureFailed,profile==='mammalian');
  assert(ar.failures.events.some(e=>e.id==='anoxia'));
  anoxic.process.aerobicFailureRules=false;
  const intentional=m.simulate(anoxic);assert(!intentional.failures.events.some(e=>['anoxia','low-do'].includes(e.id)));
}

// Overfilling rejects the batch without killing cells, capping flow or erasing product.
const full=scenario();full.reactor.maxWorkingVolume=1.51;full.reactor.totalVolume=1.7;
full.feed.strategy='constant';full.feed.start=0;full.feed.initialRateMlMin=3;full.process.duration=2;
const overflow=m.simulate(full);
assert(overflow.summary.batchFailed&&!overflow.summary.cultureFailed&&overflow.summary.invalidExtrapolation);
assert(overflow.summary.finalVolume>full.reactor.totalVolume);near(overflow.summary.cumulativeFeed,.36);
assert(overflow.summary.viableBiomass>0);near(overflow.summary.acceptedProduct,0);
for(const id of ['working-volume','overfill','total-volume'])assert(overflow.failures.events.some(e=>e.id===id));
near(overflow.summary.carbonBalanceClosure,100,1e-5);
const initial=scenario();initial.reactor.initialVolume=initial.reactor.totalVolume;initial.process.duration=.01;
const instant=m.simulate(initial);assert.equal(instant.failures.events.find(e=>e.id==='total-volume').time,0);
assert.equal(instant.records[0].acceptedProduct,0);

// Continuous washout of dead biomass must conserve its carbon.
const continuous=structuredClone(dying);continuous.process.type='continuous';continuous.feed.dilutionRate=.1;
const cr=m.simulate(continuous);assert(cr.summary.cultureFailed);near(cr.summary.carbonBalanceClosure,100,1e-5);
const deadRecords=cr.records.filter(r=>r.time>2.01);assert(deadRecords.at(-1).totalBiomass<deadRecords[0].totalBiomass);
assert(deadRecords.every(r=>r.viableBiomassConcentration===0));
const empty=scenario();empty.process.initialBiomass=0;empty.process.duration=.01;
const er=m.simulate(empty);assert(er.records.every(r=>r.growthRate===0&&r.substrateUptake===0));
assert.equal(er.summary.substrateConsumed,0);
const src=fs.readFileSync(path.join(__dirname,'../tmp/app-source.js'),'utf8');
assert(src.includes('failures: state.lastResult.failures'));
assert(!src.slice(src.indexOf('function renderReview'),src.indexOf('function showStep')).includes('validation.warnings'));
assert(src.includes('strictFailures: process.strictFailures ?? false'));
assert(src.includes('strictFailures: true'));
const guide=fs.readFileSync(path.join(__dirname,'failure-modes.html'),'utf8');
for(const link of guide.matchAll(/(?:href|src)="([^"]+)"/g))if(!/^(https?:|#)/.test(link[1]))
  assert(fs.existsSync(path.resolve(__dirname,link[1].split(/[?#]/)[0])),link[1]);
console.log('PASS: all species/rule boundaries, delays, recovery, no stacking, latching, starvation guard, deaths, rejected output, uncapped volumes, continued feed, carbon/oxygen/acid balances, continuous dead-cell outflow, and documentation.');
