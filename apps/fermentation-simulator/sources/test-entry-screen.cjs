const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const intro = html.match(/<section id="introduction"[\s\S]*?<\/section>/)[0];
assert.match(html, /<div id="simulator" hidden>/, 'Setup is hidden before JavaScript loads');
assert.match(intro, /id="getStartedBtn"[^>]* disabled>Get started<\/button>/);
assert.match(intro, /not validated predictions/);
assert.match(intro, /manufacturer documentation/);
assert.match(intro, /Generalized profiles draw on multiple studies/);
assert.match(intro, /teaching rules rather than experimentally validated/);
const expectedLinks = ['sources/databank.html', 'sources/biology/databank.html', 'sources/simulation.html',
  'sources/failure-modes.html', 'sources/', 'sources/biology/'];
for (const href of expectedLinks) {
  assert(intro.includes(`href="${href}"`), `Introduction links to ${href}`);
  assert(fs.existsSync(path.join(root, href)), `Reference exists: ${href}`);
}
assert.equal((intro.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 6);
assert.match(read('simulator.css'), /\[hidden\]\s*\{\s*display: none !important;/);
assert(html.indexOf('src="entry-screen.js') < html.indexOf('src="app.js'), 'Entry handler loads before the application');
assert.match(read('app.js'), /window\.FermentationEntryScreen\?\.ready\(\)/);
assert.match(read('app.js'), /window\.FermentationEntryScreen\?\.fail\(error\)/);
assert.equal((html.match(/data-stage="\d"/g) || []).length, 7, 'Seven existing stages are retained');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'All IDs are unique');
for (const tag of ['section', 'div', 'main']) {
  assert.equal((html.match(new RegExp(`<${tag}(?:\\s|>)`, 'g')) || []).length,
    (html.match(new RegExp(`</${tag}>`, 'g')) || []).length, `Balanced ${tag} elements`);
}

function harness(initialHash = '') {
  const elements = new Map(), listeners = new Map(), dispatched = [];
  let focused = null, currentHash = initialHash;
  const get = id => {
    if (!elements.has(id)) elements.set(id, {id, hidden: false, disabled: id === 'getStartedBtn', textContent: '',
      attributes: {}, handlers: {}, classes: new Set(), scrolls: 0, tabIndex: 0,
      setAttribute(key, value) { this.attributes[key] = value; },
      removeAttribute(key) { delete this.attributes[key]; },
      addEventListener(type, fn) { this.handlers[type] = fn; },
      focus() { focused = this.id; },
      scrollIntoView() { this.scrolls++; },
      querySelector(selector) { return selector === '.stage.is-active h2' ? get('activeHeading') : null; }
    });
    const element = elements.get(id);
    element.classList = { add: className => element.classes.add(className) };
    return element;
  };
  const location = {};
  Object.defineProperty(location, 'hash', {
    get: () => currentHash,
    set(value) { const next = value.startsWith('#') ? value : '#' + value;
      if (next !== currentHash) { currentHash = next; listeners.get('hashchange')?.(); }
    }
  });
  const window = {location, addEventListener(type, fn) { listeners.set(type, fn); }, dispatchEvent(event) { dispatched.push(event.type); }};
  vm.runInNewContext(read('entry-screen.js'), {window, document: {getElementById: get}, Event: class {constructor(type) {this.type=type;}}});
  return {get, window, dispatched, focused: () => focused, api: window.FermentationEntryScreen};
}

const app = harness();
assert(!app.get('introduction').hidden);
assert(app.get('simulator').hidden);
app.get('getStartedBtn').handlers.click();
assert.equal(app.window.location.hash, '', 'Cannot enter partially initialized app');
app.api.ready();
assert(!app.get('getStartedBtn').disabled);
assert(app.get('simulator').hidden, 'Ready alone does not skip the introduction');
assert(app.get('introductionStatus').hidden);
app.get('simulator').scenarioMarker = 'unchanged manual settings and result';
app.get('getStartedBtn').handlers.click();
assert(app.get('introduction').hidden);
assert(!app.get('simulator').hidden);
assert.equal(app.focused(), 'activeHeading');
assert.equal(app.get('simulatorNavLink').attributes['aria-current'], 'page');
app.window.location.hash = '#introduction';
assert(!app.get('introduction').hidden);
assert.equal(app.focused(), 'introductionHeading');
app.window.location.hash = '#simulator';
assert.equal(app.get('simulator').scenarioMarker, 'unchanged manual settings and result');
assert.equal(app.dispatched.filter(type => type === 'resize').length, 2, 'Revealed charts can redraw');

const direct = harness('#simulator');
assert(direct.get('simulator').hidden, 'Direct navigation also waits for initialization');
direct.api.ready();
assert(!direct.get('simulator').hidden);
const failed = harness('#simulator');
failed.api.fail(new Error('Payload unavailable'));
assert(!failed.get('introduction').hidden);
assert(failed.get('simulator').hidden);
assert(failed.get('getStartedBtn').disabled);
assert.match(failed.get('introductionStatus').textContent, /Payload unavailable/);
assert(!failed.get('introductionStatus').hidden);
console.log('PASS: entry copy and references, initial hiding, load gating, navigation, focus, state preservation and load errors.');
