const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const elements = new Map();
const insertedRows = [];

function element(tagName = "div") {
  return {
    tagName,
    children: [],
    handlers: {},
    href: "",
    id: "",
    appendChild(child) { this.children.push(child); },
    addEventListener(name, handler) { this.handlers[name] = handler; },
    querySelector(selector) {
      return selector === "a" ? this.children.find(child => child.tagName === "a") : null;
    }
  };
}

const grid = {
  insertAdjacentElement(position, node) {
    assert.strictEqual(position, "afterend");
    insertedRows.unshift(node);
  }
};

const get = id => {
  if (!elements.has(id)) elements.set(id, element());
  return elements.get(id);
};

get("reactorModel").value = "ambr15-cell-culture-gen2-10-15ml";

const context = {
  document: {
    createElement: element,
    head: { appendChild() {} },
    getElementById: get,
    querySelector: selector => selector === ".vessel-catalog-grid" ? grid : null
  }
};

vm.runInNewContext(fs.readFileSync(__dirname + "/../source-panel.js", "utf8"), context);

assert.strictEqual(insertedRows.length, 2);
const databankLink = insertedRows[0].querySelector("a");
const derivationLink = insertedRows[1].querySelector("a");

assert.strictEqual(databankLink.textContent, "Reactor databank ↗");
assert.strictEqual(databankLink.href, "sources/databank.html");
assert.strictEqual(derivationLink.textContent, "Preset derivation sheet ↗");
assert.strictEqual(
  derivationLink.href,
  "sources/?id=ambr15-cell-culture-gen2-10-15ml"
);

get("reactorModel").value = "custom-lab-scale";
get("reactorModel").handlers.change();
assert.strictEqual(derivationLink.href, "sources/?id=custom-lab-scale");
get("reactorModel").value = "unlinked-configuration";
get("reactorModel").handlers.change();
assert.strictEqual(derivationLink.href, "sources/");

console.log("PASS: vessel resources render as matching direct links and track the selected preset.");
