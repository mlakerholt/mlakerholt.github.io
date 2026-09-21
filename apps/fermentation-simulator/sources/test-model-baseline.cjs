const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const scenarios = require('./model-test-scenarios.cjs');
// Golden values were captured before extraction. Never refresh them from the new engine.
// Keep the original engine's historical regression; repaired physics has separate invariant tests.
const engine = require('./fixtures/simulation-core-2026-09-13.1.cjs');
const actual = scenarios().map(({ name, scenario }) => {
  // Freeze the original explicit pump capacities; current examples default to unlimited.
  scenario.feed.maxRateMlMin = name === 'highFeed' ? 1.25 : .25;
  const r = engine.simulate(scenario);
  return {
    name, summary: r.summary, recordCount: r.records.length,
    recordsHash: crypto.createHash('sha256').update(JSON.stringify(r.records)).digest('hex'), warnings: r.warnings
  };
});
const baseline = require('./fixtures/model-baseline-2026-09-12.json');
assert.deepEqual(actual, baseline.cases, 'Shared engine must exactly preserve legacy summaries, every recorded value, and warnings');
console.log(`PASS: ${actual.length} scenarios exactly match pre-extraction results and full record hashes.`);
