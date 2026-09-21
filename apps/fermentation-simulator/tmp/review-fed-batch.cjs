/* Read-only model diagnostics. Production source and payloads are not changed. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const parts = Array.from({ length: 8 }, (_, i) => fs.readFileSync(path.join(root, `app.payload.${String(i).padStart(2, '0')}`), 'utf8').trim()).join('');
const source = zlib.gunzipSync(Buffer.from(parts, 'base64')).toString('utf8');
assert.equal(source, fs.readFileSync(path.join(__dirname, 'app-source.js'), 'utf8'), 'Readable source must match shipped model');
function loadModel(transform = text => text, extraContext = {}) {
  const hook = '  document.addEventListener("DOMContentLoaded", init);';
  assert(source.includes(hook));
  const context = { window: {}, ...extraContext };
  const engineContext = {};
  vm.runInNewContext(transform(fs.readFileSync(path.join(root, 'simulation-core.js'), 'utf8')), engineContext);
  context.window.FermentationModel = engineContext.FermentationModel;
  vm.runInNewContext(transform(source).replace(hook, '  window.review = { simulate, REACTORS, STRAINS, MEDIA, FEEDS, PRODUCT_DEFAULTS, IMPELLERS, effectiveCarbon, powerAndKla, temperatureFactor, applyStrainPreset, getNumber, validateScenario };'), context);
  return context.window.review;
}
const model = loadModel();
const clone = value => JSON.parse(JSON.stringify(value));
const components = rows => rows.map(([name, concentration, unit, role]) => ({ name, concentration, unit, role }));
function scenario() {
  const reactor = clone(model.REACTORS['lab-glass-10']);
  reactor.preset = 'lab-glass-10';
  reactor.initialVolume = 1.5;
  reactor.diameter = reactor.vesselDiameter;
  reactor.powerNumber = model.IMPELLERS.rushton.powerNumber;
  reactor.maxOxygenFraction /= 100;
  const biology = { ...clone(model.STRAINS['ecoli-bl21']), preset: 'ecoli-bl21' };
  biology.category = biology.group;
  const product = { ...clone(model.PRODUCT_DEFAULTS.recombinant), type: 'recombinant' };
  product.postInductionTemperature = product.postTemperature;
  product.burdenFactor = product.burden / 100;
  product.recoverableFraction = product.soluble / 100;
  const medium = clone(model.MEDIA['defined-hcd']);
  medium.components = components(medium.components);
  medium.effectiveCarbon = model.effectiveCarbon(medium.components);
  const feed = clone(model.FEEDS['glucose-salts']);
  feed.components = components(feed.components);
  feed.effectiveCarbon = model.effectiveCarbon(feed.components);
  Object.assign(feed, { strategy: 'exponential', start: 6, initialRateMlMin: 0.02, maxRateMlMin: 0.25, linearSlopeMlMinH: 0.1, targetGrowthRate: 0.16, dilutionRate: 0.15, doStatThreshold: 45 });
  return { reactor, biology, product, medium, feed, process: { type: 'fed-batch', initialBiomass: 0.039, duration: 36, timeStep: 0.02, initialDo: 100, temperature: 37, phSetpoint: 7, doSetpoint: 30, phMode: 'controlled', baseNormality: 4, maxBaseRate: 1, bufferCapacity: 50, harvestCondition: 'duration' } };
}
function run(label, edit = () => {}, engine = model) {
  const input = scenario();
  edit(input);
  const result = engine.simulate(input);
  const s = result.summary;
  const row = { label, X_g_L: s.finalBiomassConcentration, biomass_g: s.totalBiomass, V_L: s.finalVolume, feed_L: s.cumulativeFeed, S_g_L: s.finalSubstrateConcentration, acetate_g_L: s.finalAcetateConcentration, lowDO_h: s.oxygenLimitedHours, feedLimited_h: s.pumpLimitedHours, product_g: s.recoverableProduct, yield_g_g: s.biomassYieldObserved, closure_pct: s.balanceClosure };
  for (const key in row) if (typeof row[key] === 'number') row[key] = Number(row[key].toFixed(5));
  console.log(JSON.stringify(row));
  return { input, result };
}

console.log('36 h; 10 L generic vessel; 1.5 L initial; BL21; OD600 0.1 interpreted using illustrative 0.39 g/L/OD conversion. Other parameters are demo defaults, not the user exact saved run.');
const baseline = run('reference reconstruction');
run('input 0.1 gDCW/L', s => s.process.initialBiomass = 0.1);
run('biomass product (no induction)', s => { s.product.type = 'biomass'; s.product.recoverableFraction = 1; });
run('no post-induction cooling', s => s.product.postInductionTemperature = 37);
run('no expression burden', s => s.product.burdenFactor = 1);
run('batch (no feed)', s => s.process.type = 'batch');
run('6 L initial volume', s => s.reactor.initialVolume = 6);
run('36 h with 0.159 L feed (constant, starts 6 h)', s => { s.feed.strategy = 'constant'; s.feed.initialRateMlMin = 0.159 / (30 * 0.06); });
run('feed initial/max both 5x', s => { s.feed.initialRateMlMin *= 5; s.feed.maxRateMlMin *= 5; });
for (const dt of [0.1, 0.05, 0.02, 0.01, 0.005, 0.002]) run(`dt=${dt} h`, s => s.process.timeStep = dt);
console.log('reference trajectory (nearest saved record):');
for (const t of [0, 6, 8, 12, 18, 24, 30, 36]) {
  const r = baseline.result.records.reduce((best, r) => Math.abs(r.time-t) < Math.abs(best.time-t) ? r : best);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => ['time','biomassConcentration','totalBiomass','volume','substrateConcentration','growthRate','dissolvedOxygen','ph','kla','our','otr','feedRateMlMin','rpm','vvm','oxygenFraction'].includes(k)))));
}
console.log('In-memory diagnostic only: substeps below the shipped 0.002 h minimum.');
const fineModel = loadModel(text => text.replace('clamp(scenario.process.timeStep, 0.002, 0.1)', 'clamp(scenario.process.timeStep, 0.00005, 0.1)'));
for (const dt of [0.001, 0.0005, 0.0002]) run(`fine dt=${dt} h`, s => s.process.timeStep = dt, fineModel);
console.log('Near-zero growth causes sensitivity checks (NOT assertions about user settings):');
run('0 C starting temperature; 0.1 g/L inoculum', s => { s.process.temperature = 0; s.product.type = 'biomass'; s.process.initialBiomass = 0.1; });
run('pH 0 input; 0.1 g/L inoculum', s => { s.process.phSetpoint = 0; s.process.initialBiomass = 0.1; });
console.log('Preset carryover reconstruction from GENERALIZED A. niger recommended process into E. coli (pH 3; the strain-specific preset uses pH 4.5):');
function fungalCarryover(s) {
  s.process.initialBiomass = 0.1;
  s.process.temperature = 30;
  s.process.phSetpoint = 3;
  s.feed.start = 12;
  s.feed.targetGrowthRate = 0.12;
  s.product = { ...clone(model.PRODUCT_DEFAULTS.secreted), type: 'secreted' };
  s.product.postInductionTemperature = s.product.postTemperature;
  s.product.burdenFactor = s.product.burden / 100;
  s.product.recoverableFraction = s.product.soluble / 100;
}
run('A. niger process settings retained; E. coli biology', fungalCarryover);
run('same retained settings; only pH changed to 7', s => { fungalCarryover(s); s.process.phSetpoint = 7; });
run('same retained settings; OD0.1 calibrated inoculum', s => { fungalCarryover(s); s.process.initialBiomass = 0.039; });
function fullFungalCarryover(s) {
  fungalCarryover(s);
  const preset = model.STRAINS['generalized-aspergillus-niger'];
  s.medium = clone(model.MEDIA[preset.recommendedMedium]);
  s.medium.components = components(s.medium.components);
  s.medium.effectiveCarbon = model.effectiveCarbon(s.medium.components);
  const previousFeed = s.feed;
  s.feed = { ...previousFeed, ...clone(model.FEEDS[preset.recommendedFeed]) };
  s.feed.components = components(s.feed.components);
  s.feed.effectiveCarbon = model.effectiveCarbon(s.feed.components);
}
run('full generalized A. niger carryover including medium and feed', fullFungalCarryover);
run('full carryover; only pH changed to 7', s => { fullFungalCarryover(s); s.process.phSetpoint = 7; });
run('strain-specific A. niger carryover at pH 4.5', s => { fullFungalCarryover(s); s.process.phSetpoint = model.STRAINS['aspergillus-niger'].recommendedProcess.phSetpoint; });
console.log('Numerical robustness with 5x feed:');
for (const dt of [0.02, 0.005, 0.002, 0.0002]) run(`5x feed dt=${dt}`, s => { s.feed.initialRateMlMin *= 5; s.feed.maxRateMlMin *= 5; s.process.timeStep = dt; }, fineModel);

// Execute the actual preset-selection handler with only rendering stubbed out.
const fields = new Map();
const doc = { querySelector(selector) {
  if (!fields.has(selector)) fields.set(selector, { value: '', type: selector === '#enableOverflow' ? 'checkbox' : 'number', checked: false, removeAttribute() {} });
  return fields.get(selector);
} };
const uiModel = loadModel(text => text.replace('function updateAllViews() {', 'function updateAllViews() { return;').replace('function renderComposition(kind) {', 'function renderComposition(kind) { return;'), { document: doc });
uiModel.applyStrainPreset('generalized-aspergillus-niger', true);
uiModel.applyStrainPreset('ecoli-bl21', true);
const retained = Object.fromEntries(['optimalPh','phSetpoint','temperature','feedStart','targetGrowthRate','initialBiomass','productType','mediumPreset','feedPreset'].map(id => [id, fields.get('#'+id)?.value]));
assert.equal(retained.optimalPh, 7);
assert.equal(retained.phSetpoint, 3);
assert.equal(retained.feedStart, 12);
console.log('Actual preset-switch handler retained: ' + JSON.stringify(retained));
assert.equal(uiModel.getNumber('emptyNumericField', 37), 0);
console.log('Empty numeric input with fallback 37 becomes: ' + uiModel.getNumber('emptyNumericField', 37));
const badPh = scenario();
badPh.process.phSetpoint = 0;
assert.equal(model.validateScenario(badPh).errors.length, 0);
console.log('Validation errors for pH 0: ' + JSON.stringify(model.validateScenario(badPh).errors));
module.exports = { model, loadModel, scenario, run, baseline };
