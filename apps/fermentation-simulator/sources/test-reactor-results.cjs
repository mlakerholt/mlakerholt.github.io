const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('../simulation-core.js');
const { create } = require('./simulation-example.js');
const root = __dirname + '/../';
const html = fs.readFileSync(root + 'index.html', 'utf8');
const elements = new Map(), draws = [];
function element(id) {
  if (!elements.has(id)) {
    const attributes = {}, handlers = {}, operations = [];
    const ctx = {};
    for (const method of ['setTransform', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fillText', 'strokeRect', 'fillRect', 'setLineDash']) {
      ctx[method] = (...args) => {
        for (const arg of args) if (typeof arg === 'number') assert(Number.isFinite(arg), `${id}: finite ${method} coordinates`);
        operations.push([method, ...args]);
      };
    }
    ctx.measureText = text => ({ width: text.length * 6 });
    elements.set(id, {
      id, attributes, handlers, operations, dataset: {}, hidden: false, tabIndex: 0,
      setAttribute: (name, value) => { attributes[name] = value; },
      getAttribute: name => attributes[name],
      addEventListener: (name, handler) => { handlers[name] = handler; },
      focus() { focused = id; },
      close() { this.open=false; }, showModal() { this.open=true; }, replaceChildren() { this.innerHTML=''; },
      getBoundingClientRect: () => ({ width: canvasWidth, height: 260 }),
      getContext() { draws.push(id); return ctx; }
    });
  }
  return elements.get(id);
}
let focused = null, canvasWidth = 420;
const tabs = ['processProfilesTab', 'reactorParametersTab'].map(element);
for (const [index, tab] of tabs.entries()) {
  tab.dataset.resultTab = index ? 'reactor' : 'process';
  tab.setAttribute('aria-controls', index ? 'reactorParametersPanel' : 'processProfilesPanel');
}
const sandbox = {
  window: { FermentationModel: model, devicePixelRatio: 2 },
  document: {
    querySelector: selector => element(selector.replace(/^#/, '')),
    querySelectorAll: selector => selector === '[data-result-tab]' ? tabs : [],
    getElementById: element
  }
};
const source = fs.readFileSync(root + 'tmp/app-source.js', 'utf8').replace(
  '  document.addEventListener("DOMContentLoaded", init);',
  '  window.test = { state, reactorChartRecords, drawAllCharts, selectResultTab, bindResultTabs, renderResultsPlaceholder, renderResults };'
);
vm.runInNewContext(fs.readFileSync(root+'failure-results.js','utf8'),sandbox);
vm.runInNewContext(source, sandbox);
const ui = sandbox.window.test;
const close = (actual, expected, tolerance = 1e-10) => assert(Math.abs(actual - expected) <= tolerance, `${actual} ≈ ${expected}`);

// Display conversions only: no mutated records, scenario or model settings.
const scenario = create();
const records = [
  {time: 0, cumulativeBase: 0, cumulativeAcid: 0, doControllerOutput: 0},
  {time: .1, cumulativeBase: .0006, cumulativeAcid: .0003, doControllerOutput: .5},
  {time: .17, cumulativeBase: .00144, cumulativeAcid: .00072, doControllerOutput: 1}
];
const before = JSON.stringify({ records, scenario });
const converted = ui.reactorChartRecords(records, scenario);
close(converted[0].baseRateMlMin, 0);
close(converted[1].baseRateMlMin, .1);
close(converted[2].baseRateMlMin, .2);
close(converted[2].baseAddedMl, 1.44);
close(converted[2].acidAddedMl, .72);
close(converted[1].acidRateMlMin, .05);
close(converted[2].acidRateMlMin, .1);
assert.equal(converted[1].cascadePercent, 50);
assert.equal(converted[2].cascadePercent, 100);
assert.equal(converted[0].rpmLimit, scenario.reactor.maxRpm);
assert.equal(converted[0].feedLimit, null);
assert.equal(JSON.stringify({ records, scenario }), before);

// Real engine results: batch, continuous, feed/base limits, uncontrolled pH,
// zero-rate runs and a short final interval. Display totals must match reporting.
for (const mode of ['batch', 'fed-batch', 'continuous', 'uncontrolled', 'zero-pumps', 'acid']) {
  const s = create();
  s.process.type = ['batch', 'continuous'].includes(mode) ? mode : 'fed-batch';
  s.process.duration = .217;
  s.process.initialPh = 6.5;
  if (mode === 'acid') s.process.initialPh = 7.5;
  s.feed.start = .025;
  s.feed.initialRateMlMin = .3;
  s.feed.maxRateMlMin = .3;
  if (mode === 'uncontrolled') s.process.phMode = 'uncontrolled';
  if (mode === 'zero-pumps') { s.process.maxBaseRate = 0; s.process.maxAcidRate = 0; s.feed.maxRateMlMin = 0; s.feed.initialRateMlMin = 0; }
  const result = model.simulate(s);
  const data = ui.reactorChartRecords(result.records, result.scenario);
  let integratedBaseMl = 0;
  let integratedAcidMl = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i], dt = row.time - data[i - 1].time;
    integratedBaseMl += row.baseRateMlMin * dt * 60;
    integratedAcidMl += row.acidRateMlMin * dt * 60;
    assert(row.baseRateMlMin >= 0 && row.baseRateMlMin <= s.process.maxBaseRate + 1e-9);
    assert(row.acidRateMlMin >= 0 && row.acidRateMlMin <= s.process.maxAcidRate + 1e-9);
    assert(row.feedRateMlMin >= 0 && row.feedRateMlMin <= s.feed.maxRateMlMin + 1e-9);
    if (mode === 'batch' || mode === 'zero-pumps') close(row.cumulativeFeed, 0);
    if (mode === 'uncontrolled' || mode === 'zero-pumps') close(row.baseAddedMl, 0);
    if (mode === 'uncontrolled' || mode === 'zero-pumps') close(row.acidAddedMl, 0);
  }
  close(integratedBaseMl, result.records.at(-1).cumulativeBase * 1000);
  close(data.at(-1).baseAddedMl, integratedBaseMl);
  close(data.at(-1).acidAddedMl, integratedAcidMl);
  close(integratedAcidMl, result.summary.cumulativeAcid * 1000);
  if (mode === 'acid') assert(integratedAcidMl > 0);
  close(data.at(-1).time, .217);
  ui.state.lastResult = result;
  ui.state.resultTab = 'reactor';
  ui.drawAllCharts(result.records);
}

const reactorIds = ['agitationChart', 'aerationChart', 'inletOxygenChart', 'klaChart', 'feedPumpChart', 'feedAddedChart', 'basePumpChart', 'baseAddedChart', 'acidPumpChart', 'acidAddedChart', 'reactorVolumeChart', 'cascadeOutputChart'];
const processIds = ['growthChart', 'substrateChart', 'oxygenChart', 'volumeChart', 'growthRateChart', 'controlChart'];
ui.state.currentStep = 6;
ui.bindResultTabs();
draws.length = 0;
tabs[0].handlers.click();
assert.equal(ui.state.resultTab, 'process');
assert.deepEqual(draws, processIds, 'Only visible process charts are drawn');
assert.equal(element('reactorParametersPanel').hidden, true);
assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
assert.equal(tabs[1].tabIndex, -1);
// Plot the engine's growthRate values directly, not the configured feed exponent.
element('growthRateChart').operations.length = 0;
const growthSamples = [.2, .4].map((growthRate, time) => ({ ...ui.state.lastResult.records[0], time, growthRate }));
ui.drawAllCharts(growthSamples);
const growthOps = element('growthRateChart').operations;
assert(growthOps.some(op => op[0] === 'fillText' && op[1] === 'h⁻¹'));
assert(growthOps.some(op => op[0] === 'fillText' && op[1] === 'Modeled μ'));
assert(growthOps.some(op => op[0] === 'moveTo' && op[1] === 58 && Math.abs(op[2] - 150) < 1e-9));
assert(growthOps.some(op => op[0] === 'lineTo' && op[1] === 402 && Math.abs(op[2] - 82) < 1e-9));
draws.length = 0;
tabs[1].handlers.click();
assert.deepEqual(draws, reactorIds, 'Newly visible reactor charts are drawn at their current width');
assert.equal(element('processProfilesPanel').hidden, true);
assert.equal(element('reactorParametersPanel').hidden, false);
assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
assert.equal(tabs[1].tabIndex, 0);
assert.equal(element('agitationChart').width, 840);
for (const id of ['inletOxygenChart', 'cascadeOutputChart']) {
  const axisLabels = element(id).operations.filter(op => op[0] === 'fillText' && op[2] === 6).map(op => op[1]);
  assert(axisLabels.includes('100'));
  assert(!axisLabels.includes('200'), 'Percentage plots use a 0–100 scale');
}
canvasWidth = 350;
ui.drawAllCharts(ui.state.lastResult.records);
assert.equal(element('agitationChart').width, 700, 'Canvas responds to resized layout');
for (const [index, key, expected] of [[1, 'ArrowRight', 0], [0, 'ArrowLeft', 1], [1, 'Home', 0], [0, 'End', 1]]) {
  let prevented = false;
  tabs[index].handlers.keydown({ key, preventDefault() { prevented = true; } });
  assert(prevented);
  assert.equal(focused, tabs[expected].id);
  assert.equal(tabs[expected].getAttribute('aria-selected'), 'true');
}

// Unlimited is no dashed pump ceiling; explicit zero remains a real limit.
for (const mode of ['fixed', 'adaptive']) {
  ui.state.lastResult.scenario.reactor.oxygenSupplyMode = mode;
  ui.state.lastResult.scenario.reactor.fixedOxygenFraction = .4;
  ui.state.lastResult.scenario.reactor.maxOxygenFraction = .6;
  element('inletOxygenChart').operations.length = 0;
  ui.drawAllCharts(ui.state.lastResult.records);
  assert.equal(element('inletOxygenChart').operations.some(op => op[0] === 'fillText' && op[1] === 'Maximum'), mode === 'adaptive');
  close(ui.reactorChartRecords(ui.state.lastResult.records, ui.state.lastResult.scenario)[0].oxygenLimit, mode === 'fixed' ? 40 : 60);
}
for (const maximum of [null, undefined, 0, .25]) {
  ui.state.lastResult.scenario.feed.maxRateMlMin = maximum;
  element('feedPumpChart').operations.length = 0;
  ui.drawAllCharts(ui.state.lastResult.records);
  const ops = element('feedPumpChart').operations;
  assert.equal(ops.some(op => op[0] === 'fillText' && op[1] === 'Maximum'), Number.isFinite(maximum));
}
const baseOps = element('basePumpChart').operations;
assert(baseOps.some(op => op[0] === 'setLineDash' && op[1].length === 2));
assert(baseOps.some((op, i) => i && op[0] === 'lineTo' && baseOps[i - 1][0] === 'lineTo' && op[2] === baseOps[i - 1][2]), 'Base interval averages are drawn horizontally across their interval');
const overfill=create();overfill.process.duration=.1;overfill.process.initialBiomass=0;
overfill.reactor.maxWorkingVolume=1.51;overfill.feed.start=0;overfill.feed.strategy='constant';overfill.feed.initialRateMlMin=1000;
ui.state.lastResult=model.simulate(overfill);ui.renderResults(ui.state.lastResult);
assert.equal(element('warningList').innerHTML,'','Warnings stay hidden until a category is clicked');
assert(element('warningCategoryPanel').hidden);
element('warningCategoryButtons').handlers.click({target:{closest:()=>({dataset:{warningCategory:'volume'}})}});
assert.match(element('warningList').innerHTML.trim(),/^<div class="warning-item high"><strong>Maximum working volume exceeded<\/strong>/);
assert.match(element('warningList').innerHTML,/5\.99 L/);
assert.match(element('finalStateTable').innerHTML,/Maximum working-volume excess/);
assert.match(fs.readFileSync(root+'retro.css','utf8'),/\.warning-item\.high\s*\{[^}]*background: #ffeded/s);
ui.state.lastResult = null;
draws.length = 0;
ui.selectResultTab('process');
ui.drawAllCharts([]);
assert.equal(draws.length, 0, 'No charts before a run');
ui.renderResultsPlaceholder();
assert.equal(element('resultsContent').hidden, true);
assert.equal(element('downloadCsvBtn').disabled, true);

// Structural/accessibility checks against shipped HTML.
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size);
for (const id of [...reactorIds, 'growthRateChart']) {
  assert(ids.includes(id));
  assert.match(html, new RegExp(`<canvas id="${id}" role="img" aria-label="[^"]+">`));
}
for (const tab of tabs) {
  assert.match(html, new RegExp(`id="${tab.id}" role="tab"[^>]+aria-controls="${tab.getAttribute('aria-controls')}"`));
  assert.match(html, new RegExp(`id="${tab.getAttribute('aria-controls')}" role="tabpanel" aria-labelledby="${tab.id}"`));
}
assert.match(html, /id="reactorParametersPanel"[^>]+hidden/);
assert.match(html, /Base flow is the average over each saved interval/);
assert.match(html, /not motor RPM/);
assert(html.indexOf('id="growthRateChart"') > html.indexOf('id="processProfilesPanel"'));
assert(html.indexOf('id="growthRateChart"') < html.indexOf('id="reactorParametersPanel"'));
for (const tag of ['section', 'div', 'figure']) assert.equal((html.match(new RegExp(`<${tag}(?:\\s|>)`, 'g')) || []).length, (html.match(new RegExp(`</${tag}>`, 'g')) || []).length, `Balanced ${tag} elements`);
console.log('PASS: reactor graph conversions, sampled limits, base delivery conservation, process modes, accessible tabs, keyboard navigation, resize, zero/unlimited pumps and immutable simulation data.');
