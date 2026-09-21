const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const { evidenceBucket, selectRows } = require("./biology/biology-databank.js");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/biology/biology-data.js", "utf8"), context);
const rows = context.window.FermentationBiologyRecords.records;
const base = { search: "", category: "", parameter: "", evidence: "", order: "name" };

assert.strictEqual(selectRows(rows, base).length, 13);
assert.strictEqual(selectRows(rows, { ...base, category: "Animal cell culture" }).length, 3);
assert(selectRows(rows, { ...base, search: "aspergillus" }).some(row => row.id === "aspergillus-niger"));
assert(selectRows(rows, { ...base, parameter: "muMax", evidence: "Published" }).some(row => row.id === "cho-mab"));
assert.strictEqual(evidenceBucket("Derived conversion"), "Derived / literature-informed");
const ordered = selectRows(rows, { ...base, parameter: "muMax", order: "value" });
assert(ordered.every((row, index) => !index || ordered[index - 1].parameters[0].rawValue <= row.parameters[0].rawValue));

console.log("PASS: biology databank filtering, evidence categories, search and sorting.");
