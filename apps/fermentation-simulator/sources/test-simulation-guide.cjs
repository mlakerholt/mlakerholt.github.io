const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('sources/simulation.html');
const index = read('index.html');
const source = read('tmp/app-source.js');
const parts = Array.from({ length: 8 }, (_, i) => read(`app.payload.${String(i).padStart(2, '0')}`).trim()).join('');
assert.equal(zlib.gunzipSync(Buffer.from(parts, 'base64')).toString('utf8'), source, 'Guide is checked against the shipped code, not a different source copy');

const processStage = index.match(/<section class="stage" data-stage="2">([\s\S]*?)<\/section>/)[1];
assert.match(processStage, /<a id="simulationModelLink" href="sources\/simulation\.html" target="_blank" rel="noopener">How the simulation works:/);
assert.equal((index.match(/id="simulationModelLink"/g) || []).length, 1);
assert(index.indexOf('id="simulationModelLink"') < index.indexOf('id="processDescription"'), 'Link precedes the process settings');

const modelBuild = read('app.js').match(/const BUILD_ID = "([^"]+)"/)[1];
assert.equal(html.match(/name="model-build" content="([^"]+)"/)[1], modelBuild, 'Review the guide when updating the app build');
const core = read('simulation-core.js').replace(/\r\n/g, '\n');
const digest = crypto.createHash('sha256').update(core).digest('hex');
assert.equal(html.match(/name="model-core-sha256" content="([^"]+)"/)[1], digest, 'Model equations, control or integration changed: review guide before updating its fingerprint');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'All section anchors are unique');
for (const id of ['overview','time-step','controls','restrictions','final-results','do-control','ph-control']) assert(ids.includes(id));
for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  const url = match[1];
  if (url.startsWith('#')) assert(ids.includes(url.slice(1)), `Anchor exists: ${url}`);
  else if (!/^[a-z]+:/i.test(url)) assert(fs.existsSync(path.resolve(__dirname, url.split(/[?#]/)[0])), `Local link exists: ${url}`);
}
assert.match(html, /id="model-reference" role="tabpanel" aria-labelledby="reference-tab">/, 'Written reference remains visible without JavaScript');
assert.match(html, /class="reference-tabs"[^>]* hidden>/, 'Interactive tabs are progressively enhanced');
assert.match(html, /id="calculation-map"[^>]* hidden>/, 'Map is hidden until JavaScript initializes');
assert.match(source, /window\.FermentationModel/, 'Main app consumes the shared model');
assert(!/function simulate\(/.test(source), 'No duplicate numerical implementation in the app');
assert.match(read('app.js'), /await loadScript\(`simulation-core\.js\?v=\$\{BUILD_ID\}`\)/, 'Shared engine loads before UI execution');
for (const tag of ['section','details','table','pre','ol','ul']) {
  assert.equal((html.match(new RegExp(`<${tag}(?:\\s|>)`, 'g')) || []).length, (html.match(new RegExp(`</${tag}>`, 'g')) || []).length, `Balanced ${tag} sections`);
}
const steps = [...html.matchAll(/<li id="step-([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(steps, ['environment','controller','feed','flows','growth','biomass','acetate','product','ph','oxygen','record','stop']);

const model = require('../simulation-core.js');
assert.equal(html.match(/name="model-engine-version" content="([^"]+)"/)[1],model.MODEL_VERSION,'Guide distinguishes the UI build from the unchanged calculation engine');
assert.match(html,/Target specific growth rate, μset/);
assert.match(html,/60% of the current μmax/);
for (const row of html.matchAll(/data-ph="([^"]+)" data-retained="([^"]+)"/g)) {
  const expected = model.phFactor(Number(row[1]), 7) * 100;
  assert(Math.abs(Number(row[2]) - expected) <= Math.max(1e-12, expected * 0.001), `Documented pH example ${row[1]}`);
}
const scenario = { reactor: { baseRpm: 300, maxRpm: 1200, baseVvm: 0.5, maxVvm: 2, maxOxygenFraction: 1 }, process: { doSetpoint: 30 } };
assert(Math.abs(model.controllerSettings(scenario, 1/3).rpm - 1200) < 1e-8);
assert(Math.abs(model.controllerSettings(scenario, 1/3).vvm - 0.5) < 1e-8);
assert(Math.abs(model.controllerSettings(scenario, 2/3).vvm - 2) < 1e-8);
assert(Math.abs(model.controllerSettings(scenario, 2/3).oxygenFraction - 0.21) < 1e-8);
assert(Math.abs(model.controllerSettings(scenario, 1).oxygenFraction - 1) < 1e-8);
const held=model.updateDoController(scenario,30,{integral:.8},.001);
assert.equal(held.integral,.8);assert.equal(held.output,.8);
assert(Math.abs(held.requested.oxygenFraction-(.21+.4*.79))<1e-8);
assert(Math.abs(0.55 * model.temperatureFactor(28, 37) * 0.72 - 0.203) < 0.001);
console.log('PASS: Step 3 guide link, local navigation, model fingerprint, calculation order, and pH/DO examples.');
