const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const model=require('../simulation-core.js'),planner=require('../feed-derivation.js');
const {create}=require('./simulation-example.js');
const close=(a,b,tol=1e-8)=>assert(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
function fixture() {
  const s=create();s.reactor.measuredKla=1500;s.reactor.maxOxygenFraction=1;
  s.reactor.initialVolume=1;s.reactor.maxWorkingVolume=8;s.reactor.totalVolume=10;
  s.process.duration=12;s.process.initialBiomass=2;s.biology.enableOverflow=false;
  s.biology.qO2Max=100;s.product.type='biomass';s.feed.maxRateMlMin=null;
  return s;
}
const basis=s=>({threshold:.1,horizon:s.process.duration,start:{time:4,volume:s.reactor.initialVolume,
  biomassMass:2*s.reactor.initialVolume,substrateConcentration:.1,ph:s.process.phSetpoint},
  points:[{time:0,volume:s.reactor.initialVolume,biomassMass:s.process.initialBiomass*s.reactor.initialVolume,substrateConcentration:15,ph:7},
    {time:s.process.duration,volume:s.reactor.initialVolume,biomassMass:2*s.reactor.initialVolume,substrateConcentration:0,ph:7}]});
const derive=(s,mu=.1)=>planner.derive(s,basis(s),mu);
const s=fixture(),snapshot=JSON.stringify(s),a=derive(s);
assert(a.ok);close(a.mu,.099999,2e-6);
close(a.qS,a.mu/model.growthYield(s.biology)+s.biology.maintenance);
close(a.initialRateMlMin,a.qS*2/s.feed.effectiveCarbon*1000/60);
close(a.finalVolume,1+a.initialRateMlMin*.06*Math.expm1(a.mu*8)/a.mu);
assert.equal(JSON.stringify(s),snapshot,'Derivation never mutates input');
assert(!Object.hasOwn(a.values,'maxFeedRate'),'Pump capacity is never inferred');

// Organism-scaled targets, not a universal 0.16/h cap.
const fallback=planner.derive(s,basis(s));assert(fallback.ok);
close(fallback.nominal,.6*s.biology.muMax);assert(fallback.nominal>.16);assert(fallback.mu>.16);
assert.match(fallback.growthBasis.nominalSource,/60%/);
const dh5=structuredClone(s);dh5.biology.muMax=.48;
const dh5Basis=planner.growthBasis(dh5);close(dh5Basis.nominal,.288);close(dh5Basis.nominalPercent,60);
dh5.feed.targetGrowthRate=.16;close(100*dh5.feed.targetGrowthRate/dh5Basis.maxMu,100/3);
const twiceMax=structuredClone(dh5);twiceMax.biology.muMax*=2;
close(planner.growthBasis(twiceMax).nominal/dh5Basis.nominal,2);
const presetBasis=planner.growthBasis(dh5,.12);close(presetBasis.nominal,.12);close(presetBasis.nominalPercent,25);
assert.equal(presetBasis.nominalSource,'organism preset target');
dh5.feed.targetGrowthRate=.6;
assert.match(planner.growthWarnings(dh5,dh5Basis).join(' '),/exceeds the organism’s μmax/);
assert.equal(dh5.feed.targetGrowthRate,.6,'Warning does not change the selected target');
dh5.feed.targetGrowthRate=(dh5Basis.maxMu+dh5Basis.conditionLimit)/2;
assert.match(planner.growthWarnings(dh5,dh5Basis).join(' '),/condition-adjusted kinetic upper bound/);
dh5.feed.targetGrowthRate=.12;
assert.equal(planner.growthWarnings(dh5,dh5Basis).length,0);
const constrainedPlan={ok:true,mu:.08,limiting:['vessel oxygen transfer']};
assert.match(planner.growthWarnings(dh5,dh5Basis,constrainedPlan).join(' '),/planning recommendation.*vessel oxygen transfer/);
assert.match(planner.growthWarnings(dh5,dh5Basis,constrainedPlan).join(' '),/planning margins/);
dh5.feed.strategy='constant';assert.equal(planner.growthWarnings(dh5,dh5Basis,constrainedPlan).length,0);
dh5.process.type='continuous';dh5.feed.dilutionRate=.6;
assert.match(planner.growthWarnings(dh5,dh5Basis).join(' '),/Dilution rate D.*exceeds/);
assert.equal(planner.growthWarnings(dh5,{...dh5Basis,maxMu:NaN}).length,0);

const doubled=structuredClone(s);doubled.reactor.initialVolume=2;
const v=derive(doubled);assert(v.ok);close(v.initialRateMlMin/a.initialRateMlMin,2);
const concentrated=structuredClone(s);concentrated.feed.components[0].concentration*=2;
concentrated.feed.effectiveCarbon=model.effectiveCarbon(concentrated.feed.components);
close(derive(concentrated).initialRateMlMin/a.initialRateMlMin,.5);
const productive=structuredClone(s);Object.assign(productive.product,{type:'growth-metabolite',alpha:.2,beta:.002});
const product=derive(productive);assert(product.initialRateMlMin>a.initialRateMlMin);
close(product.qS,product.mu/product.Y+s.biology.maintenance+(.2*product.mu+.002)/product.Yp);
const observed=structuredClone(s);Object.assign(observed.biology,{yieldBasis:'observed',yxS:.4,yieldReferenceGrowthRate:.2,maintenance:.02});
close(derive(observed).Y,1/(1/.4-.02/.2));
const lowYield=structuredClone(s);lowYield.biology.yxS*=.8;assert(derive(lowYield).initialRateMlMin>a.initialRateMlMin);
const slow=structuredClone(s);slow.biology.muMax=.05;assert(derive(slow).mu<a.mu);
const lowOxygen=structuredClone(s);lowOxygen.reactor.measuredKla=5;
const restricted=derive(lowOxygen);assert(!restricted.ok||restricted.mu<a.mu);
const tight=structuredClone(s);tight.reactor.maxWorkingVolume=1.002;
const confined=derive(tight);assert(!confined.ok||confined.mu<a.mu);
const capped=structuredClone(s);capped.feed.initialRateMlMin=.001;capped.feed.maxRateMlMin=.002;
const limited=derive(capped);assert(!limited.ok||limited.mu<a.mu);
if(limited.ok)assert(limited.finalRate<=.002+1e-8);
const noCarbon=structuredClone(s);noCarbon.feed.components=[];noCarbon.feed.effectiveCarbon=0;
assert.match(derive(noCarbon).reason,/positive.*carbon/);
const noTransfer=structuredClone(s);noTransfer.reactor.measuredKla=0;assert(!derive(noTransfer).ok);
const continuous=structuredClone(s);continuous.process.type='continuous';
const cont=planner.derive(continuous,planner.estimateBatch(continuous),.1);
assert(cont.ok);close(cont.initialRateMlMin,cont.mu*continuous.reactor.initialVolume/.06);close(cont.finalVolume,continuous.reactor.initialVolume);
const disabled=structuredClone(s);disabled.process.type='batch';assert(!derive(disabled).ok);
for(const strategy of ['constant','linear','exponential','do-stat']) {
  const x=structuredClone(s);x.feed.strategy=strategy;const p=derive(x);assert(p.ok);
  close(p.values.linearFeedSlope,p.mu*p.initialRateMlMin);
  assert.equal(p.values.doStatThreshold,Math.min(100,x.process.doSetpoint+15));
}

// The initial phase is the actual engine, not a second growth implementation.
const batchScenario=fixture();batchScenario.process.duration=10;batchScenario.process.initialBiomass=2;
batchScenario.medium.components=[{name:'Glucose',concentration:1,unit:'g/L',role:'carbon'}];batchScenario.medium.effectiveCarbon=1;
const estimated=planner.estimateBatch(batchScenario);assert(estimated.start);
const pureBatch=structuredClone(batchScenario);pureBatch.process.type='batch';pureBatch.process.harvestCondition='duration';pureBatch.process.timeStep=.001;
const full=model.simulate(pureBatch);const endpoint=estimated.points.at(-1);
close(endpoint.biomassMass,full.summary.totalBiomass);close(endpoint.volume,full.summary.finalVolume);
assert(estimated.start.substrateConcentration<=estimated.threshold);
assert(planner.stateAt(estimated,estimated.horizon+1)===null);
const noCells=structuredClone(batchScenario);noCells.process.initialBiomass=0;assert.equal(planner.estimateBatch(noCells).start,null);
const tooShort=structuredClone(batchScenario);tooShort.process.duration=.01;
assert.equal(planner.estimateBatch(tooShort).start,null);
assert.equal(planner.batchKey(s),planner.batchKey({...s,feed:{...s.feed,start:9,initialRateMlMin:2}}));
assert.notEqual(planner.batchKey(s),planner.batchKey(doubled));

// Actual UI module: async invalidation, escaped text, no silent writes, Apply whitelist.
let current=fixture(),applied=null,queued=[];
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',disabled:false,handlers:{},setAttribute(){},addEventListener(k,f){this.handlers[k]=f;}});return elements.get(id);};
const workers=[];
class Worker {constructor(){workers.push(this);}postMessage(x){this.request=x;}terminate(){this.terminated=true;}}
const context={window:{FermentationModel:model,FermentationFeedDerivation:planner,Worker,
  setTimeout:f=>{queued.push(f);return f;},clearTimeout:f=>{queued=queued.filter(x=>x!==f);}},document:{getElementById:element}};
vm.runInNewContext(fs.readFileSync(__dirname+'/../feed-derivation-ui.js','utf8'),context);
const ui=context.window.FermentationFeedDerivationUI.create({getScenario:()=>current,getPreferredMu:()=>.1,applyValues:x=>{applied=x;}});
const flush=()=>{const jobs=queued;queued=[];jobs.forEach(f=>f());};
ui.refresh();flush();const oldWorker=workers.at(-1);assert(element('applyDerivedFeedBtn').disabled);
current=structuredClone(current);current.reactor.initialVolume=2;ui.refresh();flush();const fresh=workers.at(-1);
assert(oldWorker.terminated);oldWorker.onmessage({data:{id:oldWorker.request.id,batch:basis(s)}});
assert(element('applyDerivedFeedBtn').disabled,'Stale worker cannot enable Apply');
current.biology.name='<img src=x onerror=alert(1)>';
// The worker response must still be rejected when the scenario key changed before a refresh.
fresh.onmessage({data:{id:fresh.request.id,batch:basis(current)}});assert(element('applyDerivedFeedBtn').disabled);
ui.refresh();flush();const latest=workers.at(-1);
latest.onmessage({data:{id:latest.request.id,batch:basis(current)}});
assert(!element('applyDerivedFeedBtn').disabled);assert.equal(applied,null);
assert(!elements.has('feedGrowthReadout'),'Removed feed readout is no longer rendered');
assert.match(element('feedDerivationBody').innerHTML,/Organism μmax =.*% of μmax.*Limiting:/);
const manualBefore=current.feed.targetGrowthRate;
current.feed.targetGrowthRate=current.biology.muMax*1.1;ui.refresh();
assert(element('feedGrowthWarning').hidden,'No process warnings before running');assert.equal(element('feedGrowthWarning').textContent,'');
assert.equal(current.feed.targetGrowthRate,current.biology.muMax*1.1);
current.feed.targetGrowthRate=manualBefore;ui.refresh();
assert.match(element('feedDerivationBody').innerHTML,/&lt;img/);
assert(!element('feedDerivationBody').innerHTML.includes('<img'));
element('applyDerivedFeedBtn').handlers.click();assert(applied);assert(!('maxFeedRate'in applied));assert(!('linearFeedSlope'in applied));
const workerCount=workers.length;current.feed.strategy='linear';ui.refresh();assert.equal(workers.length,workerCount);
assert(element('feedGrowthWarning').hidden,'No inactive exponential-growth warning on a linear profile');
element('applyDerivedFeedBtn').handlers.click();assert('linearFeedSlope'in applied);
current.process.type='batch';ui.refresh();assert(element('applyDerivedFeedBtn').disabled);
assert.match(element('feedDerivationStatus').textContent,/Batch mode/);
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
assert(html.indexOf('id="feedDerivation"')>html.indexOf('id="feedStrategyFieldset"'));
assert(html.indexOf('id="feedDerivation"')<html.indexOf('</fieldset>',html.indexOf('id="feedStrategyFieldset"')));
assert.match(html,/Target specific growth rate, μ<sub>set<\/sub>/);
assert(!html.includes('Feed growth exponent'));
assert(!html.includes('feedGrowthReadout'));
assert.match(html,/aria-describedby="feedGrowthWarning"/);
console.log('PASS: feed derivation formulas, organism/volume/feed/vessel dependencies, bounds, modes, shared-engine batch estimate, stale worker rejection, escaping and explicit Apply.');
