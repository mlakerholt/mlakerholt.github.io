// Read-only benchmark of the production engine; no fitting or production edits.
// Run from any directory: node benchmarks/w3110-str50-2022/run.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const model = require(path.join(root, 'simulation-core.js'));
const example = require(path.join(root, 'sources/simulation-example.js'));
const clone = value => JSON.parse(JSON.stringify(value));
const appSource = fs.readFileSync(path.join(root, 'tmp/app-source.js'), 'utf8');
const strainBlock = appSource.match(/const STRAINS = (\{[\s\S]*?\n  \});/);
assert(strainBlock, 'Cannot locate the actual app strain presets');
const strains = vm.runInNewContext('(' + strainBlock[1] + ')');
const vessel = require(path.join(root, 'sources/vessel-records.json'))
  .find(v => v.id === 'sartorius-str-microbial-50');
assert(vessel, 'Published reactor family must be available in the app');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const writeJson = (name, obj) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(obj, null, 2) + '\n');

const evidence = {
  source: {
    title: 'Evaluation of the Biostat STR Microbial Bioreactor in a High Cell Density E. coli Exponential Fed-Batch Cultivation',
    authors: 'Schulze, Leupold, Husemann and Rupprecht',
    publisher: 'Sartorius', printedDate: 'September 2022',
    type: 'Manufacturer experimental application note; not an independent peer-reviewed validation',
    url: 'https://www.sartorius.co.kr/wp-content/uploads/2023/07/evaluation-biostat-str-microbial-bioreactor-application-note-1-data.pdf',
    localFile: 'source.pdf'
  },
  publishedInputs: {
    organism: 'E. coli K-12 W3110 (DSM 5911)', reactor: 'Biostat STR Microbial, 50 L scale, prototype Flexsafe bag',
    initialVolumeL: 24, maximumWorkingVolumeL: 40, initialOD600: 1,
    temperatureC: 37, ph: 6.8, doPercent: 35,
    initialGlucoseGL: 20, feedGlucoseGL: 655.3,
    exponentialFeedGrowthRatePerH: 0.15, feedStartH: 5.3,
    feedEquationBiomassGL: 9.3, feedEquationYieldGG: 0.3843,
    feedEquationYieldNote: 'Table 2 prints g/L for yield; interpreted dimensionally as gDCW/g glucose, not copied as g/L.',
    rpmMin: 250, rpmMax: 500, gasFlowMinLMin: 30, gasFlowMaxLMin: 60,
    impellerCount: 2, impellerType: '6-blade disk', sparger: 'ring',
    base: '20% ammonia', secondFeed: '0.25 L bolus at 13.2 h, composition not supplied',
    locators: 'PDF pp. 3-5 and 7; Tables 1-3; Equation 1'
  },
  reportedComparisonValues: {
    batchMaximumGrowthRatePerH: 0.7, glucoseExhaustionH: 5.3,
    batchEndAcetateGL: 0.7, finalBiomassGL: 80, finalAcetateGL: 5,
    finalBaseL: 4.4, finalOD600: 269,
    characterizationKlaPerH: 680, characterizationVolumeL: 40,
    characterizationRpm: 500, characterizationVvm: 1.5,
    endpointTimeH: 19,
    endpointTimeNote: 'Approximate, read from Figure 6; evaluate 18.7-19.2 h sensitivity. Not a tabulated exact sampling time.',
    biomassNote: 'Use narrative 80 g/L, not a digitized point. Figure 6B appears closer to 85 g/L at its last point; no raw data or replicate uncertainty supplied.',
    locators: 'PDF pp. 5, 7-9; Figures 6-9'
  },
  reconstructionAssumptions: [
    'Initial DCW 0.30 g/L per OD600; not a measured inoculum calibration. Sensitivity 0.25-0.50.',
    'Only stated glucose is included. Modified Biener medium and second-feed composition are not fully disclosed; no invented nutrients/carbon are added.',
    'Use reported feed equation and observed start time as INPUTS. Therefore feeding time and batch-end 9.3 g/L in the feed equation are not independent validation endpoints.',
    'The app takes vvm, not L/min. Baseline 1.25-2.5 vvm matches 30-60 L/min at the initial 24 L only; it exceeds the reported gas-flow ceiling as volume grows. Also test 1.5 vvm maximum.',
    'Atmospheric gauge pressure 0 bar; pressure not reported. Initial DO 100%, generic buffer capacity 50 mmol/L/pH.',
    '20% ammonia approximated as 11 N, with 100 mL/min pump capacity selected to avoid artificial pump limitation. Test 10-12 N; pump size not reported.',
    'No separate bolus, antifoam, sampling or evaporation events. The app cannot replay these additions. No final-volume measurement supplied.',
    'Reactor geometry and power number are existing app assumptions; selected preset has 3 impellers but the tested prototype has 2. Both configurations tested.',
    'Fixed measured kLa=680/h variant is a diagnostic high-transfer assumption, not the paper\'s complete time-varying kLa curve.',
    'All W3110 kinetic defaults retained. No biological parameters fitted to the reported output.'
  ]
};
const s = example.create();
s.schemaVersion = 'fermentation-simulator/v0.2';
s.modelVersion = model.MODEL_VERSION;
s.inputModelVersion = model.MODEL_VERSION;
s.benchmark = {name: 'W3110 / STR Microbial 50 L literature reconstruction', source: evidence.source.url,
  qualification: 'Partial glucose-only reconstruction, uncalibrated biology; see README.md and evidence.json'};
// Match the catalog's number formatting when it fills the visible reactor form.
const catalogNumber = v => Number(v.toFixed(Math.abs(v) < 0.01 ? 6 : Math.abs(v) < 1 ? 4 : 2));
const rawDiameter = Math.cbrt(4 * (vessel.maxVolume / 1000) / (Math.PI * vessel.heightDiameterRatio));
const diameter = catalogNumber(rawDiameter);
s.reactor = {
  preset: 'custom', catalogId: vessel.id, manufacturer: vessel.manufacturer, name: vessel.label,
  sourcePage: 'sources/?id=' + vessel.id, totalVolume: vessel.nominalVolume,
  initialVolume: 24, maxWorkingVolume: vessel.maxVolume, diameter,
  liquidHeight: catalogNumber(rawDiameter * vessel.heightDiameterRatio), heightDiameterRatio: vessel.heightDiameterRatio,
  ...vessel.defaults, impellerDiameter: catalogNumber(rawDiameter * 0.33), spargerType: 'ring',
  baseRpm: 250, maxRpm: 500, baseVvm: 30 / 24, maxVvm: 60 / 24,
  operatingPressure: 0, maxOxygenFraction: 1
};
const {group, note, ...biology} = clone(strains['ecoli-w3110']);
s.biology = {preset: 'ecoli-w3110', category: group, ...biology,
  yieldBasis: 'true', yieldReferenceGrowthRate: 0.15, substrateThreshold: 0};
s.product = {type: 'biomass', name: 'Biomass (non-product-forming source culture)',
  alpha: 0, beta: 0, degradation: 0, inductionTime: 0, postInductionTemperature: 37,
  burdenFactor: 1, recoverableFraction: 1, substrateYield: 0.5};
s.process = {type: 'fed-batch', initialBiomass: 0.30, inoculumMode: 'od', initialOd: 1,
  odToDcw: 0.30, duration: 19, timeStep: 0.005, initialDo: 100, temperature: 37,
  phSetpoint: 6.8, initialPh: 6.8, doSetpoint: 35, phMode: 'controlled',
  baseNormality: 11, maxBaseRate: 100, bufferCapacity: 50, harvestCondition: 'duration'};
s.medium = {preset: 'custom', name: 'Reported initial glucose only (incomplete medium recipe)',
  components: [{name: 'Glucose', concentration: 20, unit: 'g/L', role: 'carbon'}], effectiveCarbon: 20};
const initialFeedLh = 0.15 * 9.3 * 24 / (0.3843 * 655.3);
s.feed = {preset: 'custom', name: 'Reported feed 1 glucose (second feed not represented)',
  components: [{name: 'Glucose', concentration: 655.3, unit: 'g/L', role: 'carbon'}], effectiveCarbon: 655.3,
  strategy: 'exponential', start: 5.3, initialRateMlMin: initialFeedLh / 0.06,
  maxRateMlMin: 100, linearSlopeMlMinH: 0, targetGrowthRate: 0.15,
  dilutionRate: 0, doStatThreshold: 45};
evidence.derivedInputs = {initialFeedLh, initialFeedMlMin: initialFeedLh / 0.06,
  expectedFeedVolumeL19h: initialFeedLh / 0.15 * (Math.exp(0.15 * (19 - 5.3)) - 1),
  presetDiameterM: diameter, presetImpellerDiameterM: s.reactor.impellerDiameter};

function nearest(result, time) {
  return result.records.reduce((a, b) => Math.abs(a.time-time) < Math.abs(b.time-time) ? a : b);
}
function metrics(result) {
  const batch = result.records.filter(r => r.time > 0 && r.time <= 5.300001);
  const fed = result.records.filter(r => r.time >= 6);
  const avg = (rows, field) => rows.reduce((n, r) => n + r[field], 0) / rows.length;
  const summary = result.summary;
  return { ...summary,
    relativeFinalBiomassErrorPercent: 100 * (summary.finalBiomassConcentration / 80 - 1),
    maxBatchGrowthPerH: Math.max(...batch.map(r => r.growthRate)),
    meanFedDO: avg(fed, 'dissolvedOxygen'),
    minDO: Math.min(...result.records.map(r => r.dissolvedOxygen)),
    maxActualGasLMin: Math.max(...result.records.map(r => r.vvm * r.volume)),
    firstGlucoseBelowPoint1H: result.records.find(r => r.substrateConcentration < 0.1)?.time ?? null,
    atFeedStart: nearest(result, 5.3),
    checkpoints: [1, 3, 5.3, 6, 10, 13.2, 15, 18.7, 19].filter(t => t <= summary.finalTime + 1e-8)
      .map(t => nearest(result, t)),
    screening: {
      biomassWithin20Percent: Math.abs(summary.finalBiomassConcentration / 80 - 1) <= 0.2,
      maximumLoggedBatchGrowthWithin20Percent: Math.abs(Math.max(...batch.map(r => r.growthRate)) / 0.7 - 1) <= 0.2,
      glucoseDepletedAtReportedFeedStart: nearest(result, 5.3).substrateConcentration < 0.1
    },
    warnings: result.warnings
  };
}
const cases = [
  ['preset', 'Current catalog geometry / W3110 kinetics with reported operating inputs', () => {}],
  ['two-impellers', 'Same, but two impellers as in the tested assembly', c => {c.reactor.impellerCount = 2;}],
  ['measured-kla', 'Two impellers and fixed reported maximum kLa; diagnostic, not a replayed kLa trajectory', c => {
    c.reactor.impellerCount = 2; c.reactor.measuredKla = 680;
  }]
];
const outputs = {};
for (const [id, description, change] of cases) {
  const scenario = clone(s); change(scenario);
  const validation = model.validateScenario(scenario);
  assert.deepEqual(validation.errors, []);
  writeJson('scenario-' + id + '.json', scenario);
  const result = model.simulate(scenario);
  assert(Math.abs(result.summary.carbonBalanceClosure - 100) < 1e-6);
  outputs[id] = {description, ...metrics(result)};
  writeJson('trajectory-' + id + '.json', result.records);
}
// Checks of missing inputs/numerics; no fitting or acceptance based on these cases.
const tests = [
  ['smaller-time-step', c => {c.process.timeStep = 0.001;}],
  ['initial-dcw-0.25', c => {c.process.initialBiomass = c.process.odToDcw = 0.25;}],
  ['initial-dcw-0.50', c => {c.process.initialBiomass = c.process.odToDcw = 0.50;}],
  ['max-vvm-1.5', c => {c.reactor.maxVvm = 1.5;}],
  ['ammonia-10N', c => {c.process.baseNormality = 10;}],
  ['ammonia-12N', c => {c.process.baseNormality = 12;}],
  ['endpoint-18.7h', c => {c.process.duration = 18.7;}],
  ['endpoint-19.2h', c => {c.process.duration = 19.2;}],
  ['measured-kla-smaller-step', c => {c.reactor.impellerCount = 2; c.reactor.measuredKla = 680; c.process.timeStep = 0.001;}],
  ['batch-no-feed', c => {c.process.type = 'batch';}]
];
const sensitivities = {};
for (const [id, change] of tests) {
  const scenario = clone(s); change(scenario);
  sensitivities[id] = metrics(model.simulate(scenario));
}
const characterization = [3, 2].map(impellerCount => ({impellerCount,
  ...model.powerAndKla({...s.reactor, impellerCount}, 40, 500, 1.5)}));
const diagnosticTraces = Object.fromEntries(['preset', 'measured-kla'].map(id => {
  const scenario = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenario-' + id + '.json'), 'utf8'));
  return [id, [0, 1, 5, 18].map(t => ({requestedTime: t, ...model.inspectTime(scenario, t).trace}))];
}));
writeJson('diagnostic-traces.json', diagnosticTraces);
const final = {modelVersion: model.MODEL_VERSION, modelSha256: sha(path.join(root, 'simulation-core.js')),
  appSourceSha256: sha(path.join(root, 'tmp/app-source.js')),
  sourceSha256: fs.existsSync(path.join(__dirname, 'source.pdf')) ? sha(path.join(__dirname, 'source.pdf')) : null,
  thresholds: {note: 'Diagnostic screening bands, not experimental confidence intervals.',
    biomassRelativePercent: 20, batchMaximumGrowthRelativePercent: 20,
    glucoseGLAtReportedExhaustionMax: 0.1, klaRelativePercent: 20},
  characterization, cases: outputs, sensitivities};
writeJson('evidence.json', evidence);
writeJson('results.json', final);
const roundTrip = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenario-preset.json'), 'utf8'));
assert.deepEqual(model.simulate(roundTrip).summary, model.simulate(s).summary, 'Export must reproduce the same engine result');
assert(Math.abs(outputs.preset.finalBiomassConcentration / sensitivities['smaller-time-step'].finalBiomassConcentration - 1) < 0.001,
  'Coarse/fine-step biomass should differ by less than 0.1% for this benchmark');
console.log(JSON.stringify({modelVersion: model.MODEL_VERSION, initialFeedLh, characterization,
  cases: Object.fromEntries(Object.entries(outputs).map(([k,v]) => [k, {
    dcw: v.finalBiomassConcentration, volume: v.finalVolume, errorPercent: v.relativeFinalBiomassErrorPercent,
    peakBatchMu: v.maxBatchGrowthPerH, glucoseAt5p3: v.atFeedStart.substrateConcentration,
    dcwAt5p3: v.atFeedStart.biomassConcentration, acetateEnd: v.finalAcetateConcentration,
    baseL: v.cumulativeBase, feedL: v.cumulativeFeed, meanFedDO: v.meanFedDO,
    endGlucose: v.finalSubstrateConcentration, maxGasLMin: v.maxActualGasLMin
  }])),
  sensitivities: Object.fromEntries(Object.entries(sensitivities).map(([k,v]) => [k, {
    dcw: v.finalBiomassConcentration, volume: v.finalVolume, glucoseAt5p3: v.atFeedStart.substrateConcentration,
    exhaustionBelow0p1H: v.firstGlucoseBelowPoint1H, baseL: v.cumulativeBase
  }]))}, null, 2));
