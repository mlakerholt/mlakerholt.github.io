const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('../simulation-core.js');
const { create } = require('./simulation-example.js');
const cases = require('./model-test-scenarios.cjs')();
const near = (a, b, label) => assert(Math.abs(a - b) <= Math.max(1, Math.abs(a), Math.abs(b)) * 1e-11, `${label}: ${a} versus ${b}`);
for (const { name, scenario } of cases) {
  const input = structuredClone(scenario);
  const result = model.inspectStep(scenario, 999999);
  const t = result.trace, n = t.nodes, full = model.simulate(scenario).summary;
  assert.deepEqual(Object.keys(n), ['environment', 'controller', 'feed', 'flows', 'growth', 'biomass', 'acetate', 'product', 'ph', 'oxygen', 'failures', 'totals']);
  assert.deepEqual(scenario, input, name + ' does not mutate input');
  assert.deepEqual(result.initialState, model.createInitialState(scenario));
  for (const [stateKey, summaryKey] of Object.entries({time:'finalTime',volume:'finalVolume',biomassMass:'totalBiomass',
    biomassConcentration:'finalBiomassConcentration',substrateMass:'residualSubstrate',substrateConsumed:'substrateConsumed',
    oxygenConsumedMmol:'oxygenConsumedMmol',cumulativeFeed:'cumulativeFeed',cumulativeBase:'cumulativeBase',cumulativeAcid:'cumulativeAcid',carbonDioxideG:'carbonDioxideG'})) {
    near(t.after[stateKey], full[summaryKey], name + ' final ' + stateKey);
  }
  assert.equal(t.stopReason, full.stoppedReason, name + ' stop reason');
  near(n.growth.oxygen, n.oxygen.oxygenAfterReaction, name + ' growth uses solved oxygen');
  near(n.growth.ph, n.flows.ph, name + ' growth uses post-flow pH');
  near(n.oxygen.biomassConcentrationUsed, n.flows.X, name + ' OUR uses post-feed, pre-growth X');
  near(n.oxygen.volumeUsed, n.flows.volume, name + ' transfer uses pre-titrant reaction volume');
  const retained = 1 - (n.ph.baseOutflow+n.ph.acidOutflow) / (n.flows.volume+n.ph.baseDelivered+n.ph.acidDelivered);
  near(n.biomass.biomassMass, n.flows.biomassMass + n.biomass.biomassGrowth, name + ' biomass increment');
  near(t.after.biomassMass, (n.biomass.biomassMass + n.acetate.acetateBiomass) * retained, name + ' acetate biomass');
  near(t.after.substrateMass, (n.flows.substrateMass - n.biomass.substrateUse) * retained, name + ' substrate increment');
  near(t.after.productMass, (n.flows.productMass + n.product.productFormed - n.product.productDegraded) * retained, name + ' product update');
  near(t.after.acetateMass, (n.flows.acetateMass + n.acetate.acetateProduced - n.acetate.acetateUsed) * retained, name + ' acetate update');
  near(t.after.volume, n.flows.volume+n.ph.baseDelivered+n.ph.acidDelivered-n.ph.baseOutflow-n.ph.acidOutflow, name + ' titrant dilution');
  near(t.after.oxygen, n.oxygen.oxygenAfter, name + ' final oxygen');
  near(t.after.ph, n.ph.phAfter, name + ' final pH');
}
const scenario = create();
const trace = model.inspectTime(scenario, 11.9999).trace;
const record = model.simulate(scenario).records.find(r => Math.abs(r.time - trace.after.time) < 1e-8);
assert(record, 'Inspected step exists in main-app records');
for (const [key, value] of Object.entries({volume:trace.after.volume,totalBiomass:trace.after.biomassMass,
  growthRate:trace.nodes.growth.mu,substrateUptake:trace.nodes.growth.qS,kla:trace.nodes.oxygen.kla,
  our:trace.nodes.oxygen.our,otr:trace.nodes.oxygen.otr,ph:trace.after.ph,feedRateMlMin:trace.nodes.feed.appliedMlMin})) near(record[key], value, 'App record ' + key);
assert.deepEqual(trace.after, model.inspectStep(scenario, trace.index + 1).trace.before, 'Adjacent snapshots exactly chain, including controller history');
const initial = model.inspectStep(scenario, 0).trace;
assert.deepEqual(initial.before, model.createInitialState(scenario));
assert.equal(initial.nodes.feed.appliedMlMin, 0);
assert.equal(initial.nodes.product.active, false);
assert.equal(trace.nodes.product.active, true);
const zeroOxygen = create(); zeroOxygen.process.initialDo = 0;
const zeroTrace = model.inspectStep(zeroOxygen, 0).trace;
assert(zeroTrace.nodes.growth.mu > 0, 'Implicit solve permits growth funded by oxygen entering this interval');
assert(zeroTrace.nodes.oxygen.oxygenUsed <= zeroTrace.nodes.oxygen.oxygenTransferred, 'No growth is funded by future intervals');
assert(zeroTrace.after.oxygen > 0, 'Positive oxygen root under aeration');
const lowPh = create(); lowPh.process.phSetpoint = 3;
assert(model.inspectStep(lowPh, 0).trace.nodes.growth.phFactor < 1e-8);
const limited = create(); limited.feed.initialRateMlMin = .25; limited.feed.maxRateMlMin = .25;
assert(model.inspectTime(limited, 12).trace.nodes.feed.pumpLimited);
const stop = model.inspectStep(cases.find(c => c.name === 'volumeStop').scenario, 999999);
assert(stop.clamped && stop.actualStep < 999999 && stop.trace.stopReason.includes('duration'));
assert(stop.trace.after.workingVolumeExcess>0);
assert.throws(() => model.inspectStep(scenario, -1), /nonnegative interval/);
assert.throws(() => model.inspectStep(scenario, NaN), /nonnegative interval/);
const invalid = create(); invalid.reactor.maxWorkingVolume = invalid.reactor.totalVolume+1;
assert.throws(() => model.inspectStep(invalid, 0), /Maximum working volume/);
for (const dt of [.1, .02, .001, .0005]) {
  const s = create(); s.process.timeStep = dt;
  const t = model.inspectTime(s, 12).trace;
  near(t.dt, model.integrationStep(s), 'Internal interval honors cap'); near(t.before.time, 12, 'Time selector aligns at step ' + dt);
}
let reply;
const context = { self: { postMessage: value => { reply = value; } }, importScripts: file => {
  assert.match(file, /simulation-core\.js/); context.self.FermentationModel = model;
} };
vm.runInNewContext(fs.readFileSync(__dirname + '/simulation-worker.js', 'utf8'), context);
context.self.onmessage({ data: { id: 42, scenario, time: 11.9999 } });
assert.equal(reply.id, 42); assert.deepEqual(reply.result.trace, trace);
context.self.onmessage({ data: { id: 43, scenario: invalid, step: 0 } });
assert.equal(reply.id, 43); assert.match(reply.error, /Maximum working volume/);
console.log('PASS: 12 final-state cases, step chaining, trace/app parity, controller history, restrictions, time steps and worker protocol.');
