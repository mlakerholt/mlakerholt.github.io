const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/biology/generalized-data.js", "utf8"), context);

const profiles = context.window.FermentationGeneralizedBiology.profiles;
assert.strictEqual(profiles.length, 9);
assert.strictEqual(new Set(profiles.map(profile => profile.id)).size, profiles.length);

for (const profile of profiles) {
  assert(profile.sources.length >= 3, `${profile.id} synthesizes at least three publications`);
  assert.strictEqual(profile.parameters.length, 7, `${profile.id} covers all generalized kinetic and operating parameters`);
  for (const parameter of profile.parameters) {
    assert(parameter.representative, `${profile.id} ${parameter.name} has a recommendation or calibration instruction`);
    assert(parameter.range, `${profile.id} ${parameter.name} records its evidence range`);
    assert(parameter.references.length > 0, `${profile.id} ${parameter.name} cites its evidence context`);
    for (const index of parameter.references) assert(profile.sources[index], `${profile.id} ${parameter.name} has a valid reference index`);
  }
}

console.log("PASS: generalized biology profiles synthesize multiple sources without inventing unsupported ranges.");
