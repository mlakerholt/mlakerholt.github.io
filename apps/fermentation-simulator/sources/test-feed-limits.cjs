const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const model=require('../simulation-core.js');
const {create}=require('./simulation-example.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} vs ${b}`);
assert.equal(create().feed.maxRateMlMin,null);
for(const maximum of [null,undefined,25])for(const type of ['fed-batch','continuous']) {
  const s=create();s.process.type=type;s.feed.start=0;s.feed.strategy='constant';
  s.feed.initialRateMlMin=10;s.feed.dilutionRate=.4;
  if(maximum===undefined)delete s.feed.maxRateMlMin;else s.feed.maxRateMlMin=maximum;
  assert.deepEqual(model.validateScenario(s).errors,[]);
  const rate=model.feedRateLh(s,0,100,0,1.5);
  close(rate.requested,.6);close(rate.applied,.6);
  s.process.duration=.05;s.process.initialBiomass=0;
  const result=model.simulate(JSON.parse(JSON.stringify(s)));
  assert.equal(result.scenario.feed.maxRateMlMin,maximum??null);
  assert.equal(result.summary.pumpLimitedHours,0);
  assert(!result.warnings.some(w=>w.title==='Feed pump limited'));
  assert(Math.abs(result.summary.carbonBalanceClosure-100)<1e-6);
}
const exponential=create();exponential.feed.start=0;exponential.feed.initialRateMlMin=1;
exponential.feed.targetGrowthRate=.2;
assert(model.feedRateLh(exponential,20,100,0,1.5).applied/.06>5,'No hidden 5 mL/min ceiling');
exponential.feed.maxRateMlMin=25;
close(model.feedRateLh(exponential,20,100,0,1.5).applied,25*.06);
const zero=create();zero.feed.start=0;zero.feed.strategy='do-stat';zero.feed.maxRateMlMin=0;
assert.deepEqual(model.validateScenario(zero).errors,[]);
close(model.feedRateLh(zero,0,100,0,1.5).applied,0);
for(const bad of [-1,NaN,Infinity,'',false,'unlimited']) {
  const s=create();s.feed.maxRateMlMin=bad;
  assert(model.validateScenario(s).errors.some(e=>e.includes('maxRateMlMin')));
}
const limited=create();limited.process.duration=.2;limited.feed.start=0;
limited.feed.initialRateMlMin=.02;limited.feed.maxRateMlMin=.02;
const capped=model.simulate(limited);
assert(capped.summary.pumpLimitedHours>0);
assert(capped.records.every(r=>r.feedRateMlMin<=.02+1e-8));
const volume=create();volume.process.duration=.1;volume.process.initialBiomass=0;
volume.feed.start=0;volume.feed.strategy='constant';volume.feed.initialRateMlMin=1000;
volume.reactor.maxWorkingVolume=1.51;
const filled=model.simulate(volume);
close(filled.summary.finalVolume,7.5);close(filled.summary.cumulativeFeed,6);
close(filled.summary.maxWorkingVolumeExcess,5.99);
assert.equal(filled.summary.pumpLimitedHours,0,'Volume excess is not a pump-capacity warning');
assert(!model.inspectTime(volume,.01).trace.nodes.feed.volumeLimited);
assert(filled.warnings.some(w=>w.severity==='high'&&w.title==='Maximum working volume exceeded'));
assert.equal(model.inspectStep(volume,0).trace.nodes.feed.pumpMaximumMlMin,null);
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
assert.match(html,/<input id="maxFeedRate"[^>]*placeholder="Unlimited"/);
assert(!/<input id="maxFeedRate"[^>]*\smax=/.test(html));

// Execute the actual map field/reset handlers with a minimal DOM, without rewriting their logic.
const elements=new Map();
function element() {
  let value='';
  return {children:[],handlers:{},attributes:{},validity:{badInput:false},
    get value(){return value;},set value(v){value=String(v);},
    get valueAsNumber(){return value===''?NaN:Number(value);},
    append(...children){this.children.push(...children);for(const child of children)child.parent=this;},
    closest(){let node=this;while(node&&node.className!=='parameter-field')node=node.parent;return node;},
    addEventListener(name,handler){this.handlers[name]=handler;},
    setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];}};
}
const dom={createElement:element,getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
const mapSource=fs.readFileSync(__dirname+'/simulation-map.js','utf8');
const resetStart=mapSource.indexOf("  $('reset-example').addEventListener");
const resetEnd=mapSource.indexOf('  function fail(',resetStart);
const mapCode=mapSource.slice(0,mapSource.indexOf('  function updateTime('))+
  '\n function updateTime(){} function schedule(){}\n'+mapSource.slice(resetStart,resetEnd)+
  '\n window.mapTest={fields,invalid,scenario:()=>scenario};\n})();';
const context={window:{FermentationModel:model,FermentationExample:{create}},document:dom,structuredClone};
vm.runInNewContext(mapCode,context);
const map=context.window.mapTest,pump=map.fields.find(f=>f.path==='feed.maxRateMlMin');
assert.equal(pump.number.value,'');assert.equal(pump.range,null);assert.equal(pump.number.max,undefined);
const change=value=>{pump.number.value=value;pump.number.handlers.input();};
change('25');assert.equal(map.scenario().feed.maxRateMlMin,25);
change('-1');assert(map.invalid.has('feed.maxRateMlMin'));
change('');assert.equal(map.scenario().feed.maxRateMlMin,null);assert(!map.invalid.size);
change('0');assert.equal(map.scenario().feed.maxRateMlMin,0);
pump.number.validity.badInput=true;change('');assert(map.invalid.has('feed.maxRateMlMin'));
pump.number.validity.badInput=false;change('25');
elements.get('reset-example').handlers.click();
assert.equal(map.scenario().feed.maxRateMlMin,null);assert.equal(pump.number.value,'');
const fixedOxygen=map.fields.find(f=>f.path==='reactor.fixedOxygenFraction');
const adaptiveOxygen=map.fields.find(f=>f.path==='reactor.maxOxygenFraction');
assert.equal(fixedOxygen.number.closest().hidden,false);
assert.equal(adaptiveOxygen.number.closest().hidden,true);
const oxygenMode=elements.get('example-oxygen-mode');oxygenMode.value='adaptive';oxygenMode.handlers.change();
assert.equal(map.scenario().reactor.oxygenSupplyMode,'adaptive');
assert.equal(fixedOxygen.number.disabled,true);assert.equal(adaptiveOxygen.number.disabled,false);
elements.get('reset-example').handlers.click();
assert.equal(oxygenMode.value,'fixed');assert.equal(fixedOxygen.number.value,'100');
console.log('PASS: unlimited/missing/null/JSON, explicit caps and zero, values above 5, validation, volume conservation and actual map field/reset handlers.');
