const assert = require('node:assert/strict');
const model = require('../simulation-core.js');
const planner = require('../feed-derivation.js');
const {create} = require('./simulation-example.js');
const near = (a,b) => assert(Math.abs(a-b) < 1e-9*Math.max(1,Math.abs(b)), `${a} != ${b}`);

const s = create();
assert.equal(s.reactor.oxygenSupplyMode, 'fixed');
assert.equal(s.reactor.fixedOxygenFraction, 1);
near(model.createInitialState(s).oxygenFraction, 1);
for (const output of [0,.25,.5,.8,1]) near(model.controllerSettings(s,output).oxygenFraction,1);
near(model.controllerSettings(s,.5).rpm,s.reactor.maxRpm);
near(model.controllerSettings(s,.5).vvm,s.reactor.baseVvm);
near(model.controllerSettings(s,1).vvm,s.reactor.maxVvm);

// No hidden enrichment ceiling, ramp from air, or third stage in fixed mode.
Object.assign(s.reactor,{fixedOxygenFraction:.4,maxOxygenFraction:.21});
near(model.inletOxygenLimit(s.reactor),.4);
for (const output of [0,.5,1]) near(model.controllerSettings(s,output).oxygenFraction,.4);
s.process.duration=.21;
let run=model.simulate(s);
assert(run.records.every(row=>row.oxygenFraction===40));
const trace=model.inspectStep(s,0).trace;
near(trace.before.oxygenFraction,.4);near(trace.after.oxygenFraction,.4);
near(trace.nodes.controller.requested.oxygenFraction,.4);
assert(Math.abs(run.summary.oxygenBalanceResidualMmol)<1e-6);
const cap=planner.capacity(s,1.5,37);
near(cap.oxygenFraction,.4);
near(cap.cStar,model.airOxygenSaturation(37,s.reactor.operatingPressure)*.4/.21);
near(cap.inlet,s.reactor.maxVvm*60*.4/24*1000);

// Pure-O2 supply is not a 100%-DO clamp; inventory counts only delivered gas.
const pure=create();pure.process.type='batch';pure.process.duration=.5;pure.process.initialBiomass=0;
pure.reactor.maxRpm=pure.reactor.baseRpm;pure.reactor.maxVvm=pure.reactor.baseVvm;
run=model.simulate(pure);
assert(run.records.every(row=>row.oxygenFraction===100));
assert(run.records.at(-1).dissolvedOxygen>100,
  'Dissolved oxygen can exceed air saturation with a pure-oxygen inlet');
near(run.summary.cumulativeInletOxygenMol,run.summary.cumulativeGasL/24);
assert(run.summary.oxygenTransferredMmol<=run.summary.cumulativeInletOxygenMol*1000+1e-8);

// Explicit adaptive mode and pre-mode imports retain the same historical behavior.
const adaptive=create();adaptive.process.duration=.21;adaptive.process.initialDo=0;
adaptive.reactor.oxygenSupplyMode='adaptive';adaptive.reactor.maxOxygenFraction=.6;
near(model.createInitialState(adaptive).oxygenFraction,.21);
near(model.controllerSettings(adaptive,1).oxygenFraction,.6);
near(model.controllerSettings(adaptive,2/3).oxygenFraction,.21);
near(planner.capacity(adaptive,1.5,37).oxygenFraction,.6);
const legacy=structuredClone(adaptive);delete legacy.reactor.oxygenSupplyMode;delete legacy.reactor.fixedOxygenFraction;
const legacyRun=model.simulate(legacy);
assert.equal(legacyRun.scenario.reactor.oxygenSupplyMode,'adaptive');
assert.deepEqual(legacyRun.records,model.simulate(adaptive).records);
assert.equal(legacy.reactor.oxygenSupplyMode,undefined,'Input is not mutated');
const implicitFixed=create();delete implicitFixed.reactor.fixedOxygenFraction;
near(model.createInitialState(implicitFixed).oxygenFraction,1);

// Fixed supply still diagnoses an exhausted two-stage DO cascade.
const limited=create();limited.process.duration=.3;limited.process.initialDo=0;
Object.assign(limited.reactor,{fixedOxygenFraction:.21,maxOxygenFraction:1,baseRpm:0,maxRpm:0,baseVvm:0,maxVvm:0});
assert(model.simulate(limited).warnings.some(w=>w.title==='DO cascade exhausted'));
for(const [key,value] of [['oxygenSupplyMode','other'],['fixedOxygenFraction',.2],['fixedOxygenFraction',1.01],['fixedOxygenFraction',NaN]]) {
  const invalid=create();invalid.reactor[key]=value;
  assert(model.validateScenario(invalid).errors.some(e=>e.includes(key)));
}
console.log('PASS: fixed-pure-O2 defaults, two-stage control, independent fixed fraction, gas accounting, planner consistency, adaptive/legacy behavior and exhaustion diagnostics.');
