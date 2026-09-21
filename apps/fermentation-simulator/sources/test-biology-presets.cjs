const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync(__dirname + "/../tmp/app-source.js", "utf8").replace(
  '  document.addEventListener("DOMContentLoaded", init);',
  "  window.testBiology = { STRAINS, MEDIA, FEEDS, PRODUCT_DEFAULTS };"
);
const context = { window: { FermentationModel: require('../simulation-core.js') } };
vm.runInNewContext(source, context);

const { STRAINS, MEDIA, FEEDS, PRODUCT_DEFAULTS } = context.window.testBiology;

for (const id of ["cho-mab", "hybridoma-mab", "hek293-recombinant"]) {
  assert.strictEqual(STRAINS[id].group, "Animal cell culture");
  assert.match(STRAINS[id].sourceUrl, /^https:\/\/pmc\.ncbi\.nlm\.nih\.gov\//);
}
for (const id of ["saccharomyces-cerevisiae", "aspergillus-niger"]) {
  assert.strictEqual(STRAINS[id].group, "Microbial fermentation");
  assert(STRAINS[id].sourceUrl);
}
for (const preset of Object.values(STRAINS).filter(item => item.recommendedMedium)) {
  assert(MEDIA[preset.recommendedMedium], `${preset.name} has a valid recommended medium`);
  assert(FEEDS[preset.recommendedFeed], `${preset.name} has a valid recommended feed`);
  assert(PRODUCT_DEFAULTS[preset.recommendedProduct], `${preset.name} has a valid recommended product`);
  assert(preset.recommendedProcess.targetGrowthRate < preset.muMax, `${preset.name} has a feasible feed target`);
}

assert.strictEqual(PRODUCT_DEFAULTS.mab.name, "Monoclonal antibody");
assert(Object.values(MEDIA).some(item => item.group === "Animal cell culture media"));
assert(Object.values(FEEDS).some(item => item.group === "Animal cell culture feeds"));

const recordContext = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/biology/biology-data.js", "utf8"), recordContext);
const biologyRecords = recordContext.window.FermentationBiologyRecords.records;
const strainSpecificPresets = Object.entries(STRAINS).filter(([, preset]) => !preset.generalizedProfile);
assert.strictEqual(biologyRecords.length, strainSpecificPresets.length);
for (const record of biologyRecords) {
  const preset = STRAINS[record.id];
  assert(preset, `Derivation sheet maps to live preset ${record.id}`);
  if (record.id !== "custom") assert(record.sources.length > 0, `${record.id} has a compiled bibliography`);
  for (const key of ["muMax", "ks", "yxS", "maintenance", "qO2Max", "optimalTemperature", "optimalPh"]) {
    assert.strictEqual(record.parameters.find(parameter => parameter.key === key).rawValue, preset[key], `${record.id} ${key}`);
  }
  for (const parameter of record.parameters.filter(item => item.status !== "App assumption" && item.status !== "Model selection")) {
    assert(parameter.references.length > 0, `${record.id} ${parameter.key} links its supporting or contextual source`);
  }
}

const generalizedContext = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/biology/generalized-data.js", "utf8"), generalizedContext);
const generalizedProfiles = generalizedContext.window.FermentationGeneralizedBiology.profiles;
const generalizedPresets = Object.entries(STRAINS).filter(([, preset]) => preset.generalizedProfile);
assert.strictEqual(generalizedPresets.length, generalizedProfiles.length);
for (const [id, preset] of generalizedPresets) {
  assert.match(preset.name, /^Generalized — /, `${id} is visibly marked as generalized`);
  assert.match(preset.group, /^Generalized /, `${id} is placed in a generalized selector group`);
  assert(generalizedProfiles.some(profile => profile.id === preset.generalizedProfile), `${id} maps to its multi-study profile`);
}

console.log("PASS: grouped animal/microbial biology presets and compatible media, feeds, and products.");
