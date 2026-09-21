/* An isolated teaching example, evaluated by the same engine as the simulator. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const model = window.FermentationModel;
  if (!model || !window.FermentationExample) return;
  let scenario = window.FermentationExample.create();
  let displayedScenario = structuredClone(scenario);
  let selectedTime = 12, selectedNode = null, current = null;
  let revision = 0, timer = null, worker = null, busy = false, pending = null, started = false;
  const fields = [], invalid = new Map(), nodeElements = new Map();
  const status = $('map-status'), errorBox = $('map-error'), surface = $('flow-surface');
  const fmt = value => {
    if (typeof value !== 'number') return String(value);
    if (!Number.isFinite(value)) return 'Unavailable';
    if (value === 0) return '0';
    if (Math.abs(value) < 0.001 || Math.abs(value) >= 1e6) return value.toExponential(3);
    return Number(value.toPrecision(5)).toString();
  };
  const val = (number, unit = '') => `${fmt(number)}${unit ? ' ' + unit : ''}`;
  const metric = (label, value, unit) => [label, val(value, unit)];
  const percent = (label, value) => metric(label, value * 100, '%');
  const get = path => path.split('.').reduce((object, key) => object[key], scenario);
  const set = (path, value) => { const [group, key] = path.split('.'); scenario[group][key] = value; };
  const create = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  // Display ranges constrain this example, not the main app's model parameters.
  const groups = [
    ['Starting resource pool', false, [
      ['process.initialBiomass', 'Starting biomass', 'gDCW/L', 0.001, 2, 0.001],
      ['medium.effectiveCarbon', 'Starting glucose', 'g/L', 0.1, 100, 0.1],
      ['reactor.initialVolume', 'Starting broth volume', 'L', 0.1, 10, 0.05],
      ['process.initialDo', 'Starting DO', '% air saturation', 0, 200, 1]
    ]],
    ['Process and feed', true, [
      ['process.phSetpoint', 'pH setpoint / initial pH', 'pH', 0, 14, 0.05],
      ['process.doSetpoint', 'DO setpoint', '% air saturation', 1, 100, 1],
      ['process.temperature', 'Before-induction temperature', '°C', 10, 50, 0.5],
      ['product.postInductionTemperature', 'After-induction temperature', '°C', 10, 50, 0.5],
      ['feed.start', 'Feed starts at', 'h', 0, 36, 0.1],
      ['feed.initialRateMlMin', 'Starting feed rate', 'mL/min', 0, 5, 0.01],
      ['feed.maxRateMlMin', 'Feed pump maximum (optional)', 'mL/min', 0, null, 0.01],
      ['feed.targetGrowthRate', 'Exponential feed growth', 'h⁻¹', 0, 0.5, 0.005],
      ['feed.effectiveCarbon', 'Feed glucose', 'g/L', 1, 800, 1],
      ['feed.linearSlopeMlMinH', 'Linear feed slope', '(mL/min)/h', 0, 1, 0.01],
      ['feed.doStatThreshold', 'DO-stat feed threshold', '% air saturation', 1, 150, 1]
    ]],
    ['Equipment and pH capacity', false, [
      ['reactor.gassedPowerFraction', 'Gassed / ungassed power ratio', '', 0.05, 1, 0.05],
      ['reactor.maxWorkingVolume', 'Maximum working volume', 'L', 0.1, 10, 0.05],
      ['reactor.baseRpm', 'Starting agitation', 'rpm', 0, 1200, 10],
      ['reactor.maxRpm', 'Maximum agitation', 'rpm', 0, 1200, 10],
      ['reactor.baseVvm', 'Starting aeration', 'vvm', 0, 2, 0.05],
      ['reactor.maxVvm', 'Maximum aeration', 'vvm', 0, 2, 0.05],
      ['reactor.fixedOxygenFraction', 'Fixed inlet oxygen', '%', 21, 100, 1, 100],
      ['reactor.maxOxygenFraction', 'Maximum adaptive inlet oxygen', '%', 21, 100, 1, 100],
      ['process.baseNormality', 'Base normality', 'eq/L', 0, 10, 0.1],
      ['process.maxBaseRate', 'Base pump maximum', 'mL/min', 0, 5, 0.01],
      ['process.acidNormality', 'Acid normality', 'eq/L', 0, 10, 0.1],
      ['process.maxAcidRate', 'Acid pump maximum', 'mL/min', 0, 5, 0.01],
      ['process.bufferCapacity', 'Buffer capacity', 'mmol/(L·pH)', 1, 200, 1]
    ]],
    ['DO controller tuning', false, [
      ['process.doKp', 'Proportional gain', '', 0.01, 3, 0.01],
      ['process.doIntegralTimeSeconds', 'Integral time', 's', 30, 600, 5],
      ['process.doSensorTimeSeconds', 'Sensor time constant', 's', 5, 120, 1],
      ['process.doActuatorTimeSeconds', 'Actuator time constant', 's', 5, 120, 1]
    ]],
    ['Kinetics and recombinant product', false, [
      ['biology.muMax', 'Maximum specific growth μmax', 'h⁻¹', 0.01, 1.5, 0.01],
      ['biology.ks', 'Substrate half-saturation KS', 'g/L', 0.001, 2, 0.001],
      ['biology.yxS', 'True biomass yield YX/S', 'g/g', 0.05, 0.75, 0.01],
      ['biology.maintenance', 'Maintenance mS', 'g/(gDCW·h)', 0, 0.2, 0.005],
      ['biology.qO2Max', 'Respiratory capacity qO₂,max', 'mmol/(gDCW·h)', 0, 30, 0.5],
      ['biology.overflowThreshold', 'Overflow uptake threshold', 'g/(gDCW·h)', 0, 3, 0.05],
      ['product.inductionTime', 'Induction time', 'h', 0, 36, 0.1],
      ['product.burdenFactor', 'Growth retained after induction', '%', 0, 100, 1, 100],
      ['product.alpha', 'Growth-associated product α', 'g/gDCW', 0, 0.2, 0.005],
      ['product.beta', 'Non-growth product β', 'g/(gDCW·h)', 0, 0.05, 0.001],
      ['product.degradation', 'Product degradation kdeg', 'h⁻¹', 0, 0.1, 0.001],
      ['product.recoverableFraction', 'Recoverable product', '%', 0, 100, 1, 100]
    ]]
  ];
  groups.forEach(([title, open, definitions]) => {
    const details = create('details'); details.open = open;
    details.append(create('summary', '', title));
    definitions.forEach(([path, title, unit, min, max, step, scale = 1]) => {
      const id = 'parameter-' + path.replace('.', '-');
      const field = create('div', 'parameter-field');
      const label = create('label', '', title); label.htmlFor = id;
      if (unit) label.append(create('span', 'parameter-unit', ` (${unit})`));
      const inputs = create('div', 'parameter-inputs');
      const range = create('input'), number = create('input');
      range.type = 'range'; range.id = id;
      number.type = 'number'; number.id = id + '-number';
      number.setAttribute('aria-label', `${title}${unit ? ` (${unit})` : ''}, numeric value`);
      if (path === 'feed.maxRateMlMin') {
        // Blank is a JSON-safe unlimited capacity; do not impose a slider ceiling on a specified pump.
        label.htmlFor = number.id;
        number.min = 0; number.step = step; number.placeholder = 'Unlimited';
        number.value = get(path) ?? '';
        number.addEventListener('input', () => {
          const value = number.value.trim() === '' ? null : number.valueAsNumber;
          if (number.validity.badInput || (value !== null && (!Number.isFinite(value) || value < 0))) {
            invalid.set(path, 'Enter a nonnegative feed pump maximum, or leave blank for unlimited.');
            number.setAttribute('aria-invalid', 'true');
          } else {
            invalid.delete(path); number.removeAttribute('aria-invalid'); set(path, value);
          }
          schedule();
        });
        fields.push({path, range:null, number, scale});
        inputs.append(number); field.append(label, inputs, create('small', '', 'Blank = unlimited. Working-volume excess is reported, not capped.'));
        details.append(field);
        return;
      }
      for (const input of [range, number]) {
        input.min = min; input.max = max; input.step = step;
        input.value = fmt(get(path) * scale);
        input.addEventListener('input', () => {
          const value = input.valueAsNumber;
          if (!Number.isFinite(value) || value < min || value > max) {
            invalid.set(path, `${title} must be between ${min} and ${max} ${unit}.`);
            number.setAttribute('aria-invalid', 'true');
          } else {
            invalid.delete(path); number.removeAttribute('aria-invalid');
            set(path, value / scale);
            (input === range ? number : range).value = input.value;
            if (path === 'medium.effectiveCarbon' || path === 'feed.effectiveCarbon') {
              scenario[path.split('.')[0]].components[0].concentration = value;
            }
          }
          schedule();
        });
      }
      fields.push({ path, range, number, scale });
      inputs.append(range, number); field.append(label, inputs); details.append(field);
    });
    $('parameter-controls').append(details);
  });

  const switches = [
    ['example-feed-strategy', 'feed.strategy'], ['example-ph-mode', 'process.phMode'],
    ['example-oxygen-mode', 'reactor.oxygenSupplyMode'],
    ['example-overflow', 'biology.enableOverflow'],
    ['example-dt', 'process.timeStep']
  ];
  switches.forEach(([id, path]) => $(id).addEventListener('change', () => {
    set(path, $(id).type === 'checkbox' ? $(id).checked : id === 'example-dt' ? Number($(id).value) : $(id).value);
    if (id === 'example-dt') updateTime(selectedTime);
    updateOxygenFields();
    schedule();
  }));
  function updateOxygenFields() {
    const fixed = scenario.reactor.oxygenSupplyMode === 'fixed';
    for (const {path, range, number} of fields) {
      if (!['reactor.fixedOxygenFraction', 'reactor.maxOxygenFraction'].includes(path)) continue;
      const active = path === 'reactor.fixedOxygenFraction' ? fixed : !fixed;
      number.closest('.parameter-field').hidden = !active;
      number.disabled = range.disabled = !active;
    }
  }
  updateOxygenFields();
  function updateTime(time) {
    const dt = model.integrationStep(scenario), maximum = scenario.process.duration - dt;
    selectedTime = Math.max(0, Math.min(maximum, Math.round(time / dt) * dt));
    for (const id of ['inspect-time', 'inspect-time-number']) {
      $(id).step = dt; $(id).max = fmt(maximum); $(id).value = fmt(selectedTime);
    }
    $('inspect-time-label').textContent = val(selectedTime, 'h');
    $('interval-caption').textContent = `Δt = ${val(dt, 'h')} (${val(dt * 3600, 's')}) · all changes replay from t = 0`;
    invalid.delete('time'); $('inspect-time-number').removeAttribute('aria-invalid');
  }
  ['inspect-time', 'inspect-time-number'].forEach(id => $(id).addEventListener('input', () => {
    const time = $(id).valueAsNumber;
    if (!Number.isFinite(time) || time < 0 || time > scenario.process.duration - model.integrationStep(scenario) + 1e-8) {
      invalid.set('time', 'Select an interval start between 0 and the last time step.');
      $('inspect-time-number').setAttribute('aria-invalid', 'true');
    } else updateTime(time);
    schedule();
  }));
  $('previous-step').addEventListener('click', () => {
    updateTime((current?.trace.before.time ?? selectedTime) - model.integrationStep(scenario)); schedule();
  });
  $('next-step').addEventListener('click', () => {
    updateTime(current?.trace.after.time ?? selectedTime + model.integrationStep(scenario)); schedule();
  });
  $('reset-example').addEventListener('click', () => {
    scenario = window.FermentationExample.create(); invalid.clear(); current = null;
    fields.forEach(({path, range, number, scale}) => {
      number.value = get(path) == null ? '' : fmt(get(path) * scale);
      if (range) range.value = number.value;
      number.removeAttribute('aria-invalid');
    });
    switches.forEach(([id, path]) => {
      if ($(id).type === 'checkbox') $(id).checked = get(path); else $(id).value = get(path);
    });
    updateOxygenFields(); updateTime(12); schedule();
  });

  function fail(message) {
    errorBox.textContent = message; errorBox.hidden = false;
    status.textContent = 'Readouts are not current. Correct the highlighted settings to recalculate.';
    surface.setAttribute('aria-busy', 'false');
    $('previous-step').disabled = $('next-step').disabled = true;
  }
  function schedule() {
    revision++; pending = null;
    surface.classList.add('is-stale'); surface.setAttribute('aria-busy', 'true');
    $('previous-step').disabled = $('next-step').disabled = true;
    errorBox.hidden = true;
    status.textContent = 'Replaying the example from time zero…';
    if (!timer) timer = setTimeout(() => { timer = null; requestCalculation(); }, 60);
  }
  function requestCalculation() {
    const errors = [...invalid.values(), ...model.validateScenario(scenario).errors];
    if (errors.length) { fail(errors.join(' ')); return; }
    const job = { id: revision, scenario: structuredClone(scenario), time: selectedTime };
    if (busy) pending = job; else dispatch(job);
  }
  function dispatch(job) {
    busy = true;
    if (worker) worker.postMessage(job);
    else setTimeout(() => {
      try { receive({ id: job.id, result: model.inspectTime(job.scenario, job.time) }); }
      catch (error) { receive({ id: job.id, error: error.message }); }
    }, 0);
  }
  function receive(message) {
    busy = false;
    if (message.id === revision) {
      if (message.error) fail(message.error);
      else render(message.result);
    }
    if (pending) { const job = pending; pending = null; if (job.id === revision) dispatch(job); }
  }
  try {
    worker = new Worker('simulation-worker.js?v=2026-09-21.1');
    worker.onmessage = event => receive(event.data);
    worker.onerror = event => {
      event.preventDefault(); worker.terminate(); worker = null; busy = false; pending = null;
      // file:// or a restrictive browser can block workers. The same engine is the fallback.
      requestCalculation();
    };
  } catch (_) { worker = null; }

  const definitions = [
    ['initial', 'Initial state / resource pool', 'time-step'],
    ['environment', 'Temperature & DO reference', 'step-environment'],
    ['controller', 'DO sensor & cascade', 'step-controller'],
    ['feed', 'Feed request & caps', 'step-feed'],
    ['flows', 'Add feed & update concentrations', 'step-flows'],
    ['growth', 'Coupled resource & reaction solve', 'step-growth'],
    ['biomass', 'Biomass & substrate update', 'step-biomass'],
    ['acetate', 'Acetate overflow / reuse', 'step-acetate'],
    ['product', 'Product formation & loss', 'step-product'],
    ['ph', 'Acid, base & pH update', 'step-ph'],
    ['oxygen', 'Transfer, demand & oxygen update', 'step-oxygen'],
    ['totals', 'Accumulate, record & check stop', 'step-record'],
    ['final', 'Final state / resource pool', 'final-results']
  ];
  // Data dependencies, not just execution adjacency. Old-state feedback enters via initial.
  const edges = [
    ['initial','environment'], ['initial','controller'], ['initial','feed'], ['initial','flows'],
    ['initial','growth'], ['initial','ph'], ['initial','oxygen'], ['initial','totals'],
    ['environment','controller'], ['environment','feed'], ['environment','growth'], ['environment','acetate'],
    ['environment','product'], ['environment','oxygen'], ['controller','oxygen'], ['controller','growth'],
    ['feed','flows'], ['feed','totals'], ['flows','growth'], ['flows','acetate'], ['flows','ph'], ['flows','oxygen'],
    ['growth','biomass'], ['growth','acetate'], ['growth','product'], ['growth','oxygen'],
    ['biomass','acetate'], ['biomass','ph'], ['biomass','totals'],
    ['acetate','product'], ['acetate','ph'], ['ph','oxygen'],
    ['ph','totals'], ['oxygen','totals'], ['biomass','final'], ['acetate','final'], ['product','final'],
    ['ph','final'], ['oxygen','final'], ['controller','final'], ['totals','final']
  ];
  definitions.forEach(([id, title, anchor], index) => {
    const node = create('li', 'flow-node'); node.id = `map-node-${id}`;
    const button = create('button', 'node-select'); button.type = 'button';
    button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', `map-detail-${id}`);
    button.append(create('span', 'node-number', index === 0 ? 'START' : `${index}`), create('span', 'node-title', title));
    const action = create('span', 'node-action', 'Equations & connections');
    const dependency = create('span', 'dependency-label'); button.append(action, dependency);
    const readouts = create('div', 'node-readouts'), values = create('dl', 'node-values');
    const limit = create('span', 'node-limit'); limit.hidden = true;
    readouts.append(values, limit);
    const detail = create('div', 'node-detail'); detail.id = `map-detail-${id}`; detail.hidden = true;
    button.addEventListener('click', () => selectNode(selectedNode === id ? null : id));
    node.append(button, readouts, detail); $('flow-nodes').append(node);
    nodeElements.set(id, {node, button, values, limit, detail, action, dependency, anchor, title, previous: new Map()});
  });
  function poolMetrics(state) {
    return [metric('Time', state.time, 'h'), metric('Broth volume V', state.volume, 'L'),
      metric('Working-volume excess', state.workingVolumeExcess, 'L'),
      metric('Biomass MX', state.biomassMass, 'gDCW'), metric('Biomass X', state.biomassConcentration, 'gDCW/L'),
      metric('Substrate MS', state.substrateMass, 'g'), metric('Substrate S', state.substrateConcentration, 'g/L'),
      metric('Acetate MA', state.acetateMass, 'g'), metric('Acetate A', state.acetateConcentration, 'g/L'),
      metric('Raw product MP', state.productMass, 'g'), metric('Raw product P', state.productConcentration, 'g/L'),
      metric('Dissolved O₂ C', state.oxygen, 'mmol/L'), metric('Acid inventory H', state.acidExcessMmol, 'mmol'), metric('Degraded product', state.degradedProductMass, 'g'), metric('pH', state.ph),
      percent('DO integral memory', state.doIntegral), percent('DO controller output', state.doControllerOutput)];
  }
  function allReadouts(t) {
    const n = t.nodes, e = n.environment, c = n.controller, f = n.feed, l = n.flows, g = n.growth,
      b = n.biomass, a = n.acetate, p = n.product, h = n.ph, o = n.oxygen, z = n.totals;
    return {
      initial: poolMetrics(t.before),
      environment: [metric('Temperature used', e.actualTemperature, '°C'), metric('Induction active', e.induced ? 'Yes' : 'No'),
        metric('Air reference Cair', e.oxygenReference, 'mmol/L'), metric('Starting DO (raw)', e.doPercent, '%')],
      controller: [['Inlet mode', scenario.reactor.oxygenSupplyMode === 'fixed' ? 'Fixed gas composition' : 'Adaptive enrichment'],
        metric('Filtered DO', c.filteredDo, '%'), metric('DO setpoint', c.doSetpoint, '%'),
        percent('PI output', c.output), percent('Integral memory', c.integral), metric('Anti-windup holding', c.antiWindup ? 'Yes' : 'No'),
        metric('Requested agitation', c.requested.rpm, 'rpm'), metric('Applied agitation', c.rpm, 'rpm'),
        metric('Requested aeration', c.requested.vvm, 'vvm'), metric('Applied aeration', c.vvm, 'vvm'),
        percent('Requested inlet O₂', c.requested.oxygenFraction), percent('Applied inlet O₂', c.oxygenFraction)],
      feed: [metric('Pump capacity', f.pumpMaximumMlMin == null ? 'Unlimited' : val(f.pumpMaximumMlMin, 'mL/min')),
        metric('Requested feed', f.requestedMlMin, 'mL/min'), metric('After pump check', f.pumpAppliedMlMin, 'mL/min'),
        metric('Delivered feed (no volume cap)', f.appliedMlMin, 'mL/min'), metric('Pre-feed substrate (DO-stat)', f.substrateBeforeFeed, 'g/L')],
      flows: [metric('Feed volume added ΔV', l.inflowVolume, 'L/step'), metric('Substrate added ΔMS', l.substrateAdded, 'g/step'),
        metric('Outflow ΔV', l.outflowVolume, 'L/step'), metric('Broth volume after feed', l.volume, 'L'),
        metric('Biomass X used by growth / OUR', l.X, 'gDCW/L'), metric('Substrate before reaction solve', l.S, 'g/L')],
      growth: [percent('Substrate factor', g.substrateTerm), percent('Oxygen factor', g.oxygenTerm),
        percent('Temperature factor', g.temperatureFactor), percent('pH factor', g.phFactor),
        percent('Acetate factor', g.acetateInhibition), percent('Expression burden factor', g.burden),
        percent('Respiratory capacity scale', g.availabilityFactor), metric('Actual growth μ', g.mu, 'h⁻¹'),
        metric('Specific uptake qS', g.qS, 'g/(gDCW·h)'), metric('Substrate used ΔMS', g.substrateUse, 'g/step'),
        metric('Solved substrate S', g.S, 'g/L'), metric('Solved oxygen C', g.oxygen, 'mmol/L')],
      biomass: [metric('Biomass formed ΔMX', b.biomassGrowth, 'gDCW/step'), metric('Substrate used ΔMS', b.substrateUse, 'g/step'),
        metric('Biomass MX after growth', b.biomassMass, 'gDCW'), metric('Substrate MS remaining', b.substrateMass, 'g')],
      acetate: [metric('Acetate formed', a.acetateProduced, 'g/step'), metric('Acetate reused', a.acetateUsed, 'g/step'),
        metric('Biomass from acetate', a.acetateBiomass, 'gDCW/step'), metric('Acetate MA after update', a.acetateMass, 'g')],
      product: [metric('Product formation active', p.active ? 'Yes' : 'No'), metric('Specific product rate qP', p.qP, 'g/(gDCW·h)'),
        metric('Product formed', p.productFormed, 'g/step'), metric('Product degraded', p.productDegraded, 'g/step'),
        metric('Raw product MP', p.productMass, 'g'), metric('Biomass used for product', p.biomassUsed, 'gDCW')],
      ph: [metric('Acid equivalents formed', h.acidEquivalentMmol, 'mmol/step'), metric('Net acid inventory (negative = alkaline)', h.acidUnmet, 'mmol'),
        metric('Base required (controlled mode)', h.baseRequired * 1000, 'mL/step'), metric('Base delivered', h.baseDelivered * 1000, 'mL/step'),
        metric('Acid required (controlled mode)', h.acidRequired * 1000, 'mL/step'), metric('Acid delivered', h.acidDelivered * 1000, 'mL/step'),
        metric('pH before update', h.phBefore), metric('pH after update', h.phAfter), metric('Volume including acid/base', h.volume, 'L')],
      oxygen: [metric('Power density', o.powerDensity, 'W/L'), metric('kLa', o.kla, 'h⁻¹'),
        metric('Gassed power density', o.powerDensityWm3, 'W/m³'), metric('Superficial gas velocity', o.superficialGasVelocity, 'm/s'),
        metric('Transfer method', o.klaMethod === 'measured-fixed' ? 'Fixed measurement' : 'Van’t Riet, coalescing'),
        metric('Gas equilibrium C*', o.cStar, 'mmol/L'), metric('OUR (held during step)', o.our, 'mmol/(L·h)'),
        metric('Interval transfer OTR', o.otr, 'mmol/(L·h)'), metric('O₂ before update', o.oxygenBefore, 'mmol/L'),
        metric('O₂ after update', o.oxygenAfter, 'mmol/L'), metric('DO after update', o.doAfter, '%')],
      totals: [metric('Gas supplied', z.gasVolumeL, 'L/step'), metric('Modeled oxygen consumption', z.oxygenUsed, 'mmol/step'),
        metric('CO₂ estimate', z.co2Produced, 'g/step'), metric('Total feed supplied', z.cumulativeFeed, 'L'),
        metric('Total base supplied', z.cumulativeBase, 'L'), metric('Total acid supplied', z.cumulativeAcid, 'L'), metric('Time below ½ DO setpoint', z.oxygenLimitedHours, 'h'),
        metric('pH deviation time', z.phDeviationHours, 'h'), metric('Peak volume', z.peakVolume, 'L'),
        metric('Working-volume excess', z.workingVolumeExcess, 'L'), metric('Stop check', t.stopReason || 'Continue to next step')],
      final: [...poolMetrics(t.after), metric('Filtered DO carried forward', t.after.filteredDo, '%'),
        metric('Agitation carried forward', t.after.rpm, 'rpm'), metric('Aeration carried forward', t.after.vvm, 'vvm'),
        percent('Inlet O₂ carried forward', t.after.oxygenFraction),
        metric('Recoverable product in broth', t.after.productMass * scenario.product.recoverableFraction, 'g')]
    };
  }
  function restrictions(t) {
    const n = t.nodes, g = n.growth, r = scenario.reactor;
    const effects = [];
    if (g.phFactor < 0.95) effects.push('pH suppresses growth');
    if (g.oxygenTerm < 0.95) effects.push('oxygen suppresses growth');
    if (g.substrateTerm < 0.95) effects.push('substrate suppresses growth');
    if (g.availabilityFactor < 1) effects.push('respiratory capacity caps reactions');
    const exhausted = n.oxygen.doAfter < scenario.process.doSetpoint && n.controller.rpm >= r.maxRpm * .98 &&
      n.controller.vvm >= r.maxVvm * .98 && n.controller.oxygenFraction >= model.inletOxygenLimit(r) * .98;
    return {
      controller: exhausted ? 'DO below setpoint with all cascade outputs ≥98% of their maxima.' : '',
      feed: [n.feed.pumpLimited && 'Pump cap reached', !n.feed.active && 'Feed is off in this interval'].filter(Boolean).join(' · '),
      growth: effects.join(' · '), acetate: !n.acetate.enabled ? 'Acetate overflow / reuse disabled.' : '',
      ph: n.ph.acidUnmet > 0 ? 'Acid remains in the inventory until neutralized or removed.' : '',
      oxygen: n.growth.oxygenTerm < .5 ? 'Low solved oxygen restricts the coupled reaction rates.' : '',
      final: [t.after.workingVolumeExcess > 1e-9 && `Working volume exceeded by ${fmt(t.after.workingVolumeExcess)} L; no volume cap or stop.`, t.stopReason].filter(Boolean).join(' · ')
    };
  }
  function render(result) {
    current = result;
    displayedScenario = structuredClone(scenario);
    const readouts = allReadouts(result.trace), limits = restrictions(result.trace);
    for (const [id, item] of nodeElements) {
      const fragment = document.createDocumentFragment();
      for (const [label, value] of readouts[id]) {
        const pair = create('div', 'node-metric'), dt = create('dt', '', label), dd = create('dd', '', value);
        if (item.previous.has(label) && item.previous.get(label) !== value) dd.classList.add('is-changed');
        item.previous.set(label, value); pair.append(dt, dd); fragment.append(pair);
      }
      item.values.replaceChildren(fragment);
      item.limit.textContent = limits[id] || ''; item.limit.hidden = !limits[id];
    }
    surface.classList.remove('is-stale'); surface.setAttribute('aria-busy', 'false'); errorBox.hidden = true;
    const t = result.trace;
    $('inspect-time-label').textContent = `${val(t.before.time, 'h')} → ${val(t.after.time, 'h')}`;
    status.textContent = `${result.clamped ? `The example stopped before the requested ${val(selectedTime, 'h')}; showing its final available interval. ` : ''}Step ${result.actualStep + 1}: ${val(t.before.time, 'h')} → ${val(t.after.time, 'h')}. ${t.stopReason || 'Updated oxygen and pH feed into the next step.'}`;
    $('previous-step').disabled = result.actualStep <= 0;
    $('next-step').disabled = Boolean(t.stopReason);
    selectNode(selectedNode);
  }

  function equationDetail(id) {
    const t=current.trace,n=t.nodes,s=displayedScenario,f=fmt;
    const g=n.growth,b=n.biomass,a=n.acetate,p=n.product,h=n.ph,o=n.oxygen,l=n.flows,c=n.controller;
    const details={
      initial:["Read the complete resource and controller state from the preceding interval.",
        "At inoculation: MX = X0 V0 = "+f(current.initialState.biomassMass)+" g; MS = S0 V0 = "+f(current.initialState.substrateMass)+" g.\n"+
        "Interval starts at "+f(t.before.time)+" h; Δt = "+f(t.dt)+" h.\nAcid inventory = "+f(t.before.acidExcessMmol)+" mmol."],
      environment:["Apply scheduled temperature/induction events exactly at interval boundaries.",
        "T = "+f(n.environment.actualTemperature)+" °C; Cair = 0.28 exp[-0.025(T-25)](1+Pg) = "+f(n.environment.oxygenReference)+" mmol/L.\nDO = 100 C/Cair."],
      controller:["Filter DO, update the retained PI integral with anti-windup, and allocate output to agitation, then airflow. " +
        (s.reactor.oxygenSupplyMode === 'fixed' ? "Inlet oxygen is fixed at " + f(s.reactor.fixedOxygenFraction * 100) + "% from t = 0." : "Adaptive mode adds enrichment as the final stage, starting at 21% O₂."),
        "e = (setpoint - filtered DO)/100; u = clamp(I + Kp e, 0, 1).\n"+
        "Kp = "+f(c.kp)+"; integral time = "+f(c.integralTimeSeconds)+" s; I = "+f(c.integral)+"; u = "+f(c.output)+".\n"+
        "Filtered DO += (DO - filtered DO)(1-exp(-Δt × 3600/τsensor)); τsensor = "+f(c.sensorTimeSeconds)+" s.\n"+
        "Actuator += (requested - actuator)(1-exp(-Δt × 3600/τactuator)); τactuator = "+f(c.actuatorTimeSeconds)+" s.\n"+
        "Filtered DO = "+f(c.filteredDo)+"%; applied rpm = "+f(c.rpm)+"; vvm = "+f(c.vvm)+"; O2 fraction = "+f(c.oxygenFraction)+"."],
      feed:["Calculate requested feed and apply a pump limit only when specified. Volume does not cap delivery; excess is reported.",
        "Pump capacity = "+(n.feed.pumpMaximumMlMin == null ? "unlimited" : f(n.feed.pumpMaximumMlMin)+" mL/min")+".\n"+
        "Exponential request = F0 exp(μfeed × elapsed).\nRequested = "+f(n.feed.requestedMlMin)+" mL/min; delivered = "+f(n.feed.appliedMlMin)+" mL/min.\n"+
        "ΔVfeed = F Δt = "+f(l.inflowVolume)+" L; ΔMSfeed = ΔVfeed Sfeed = "+f(l.substrateAdded)+" g."],
      flows:["Apply feed and any continuous outflow to every material inventory. Feed is assumed oxygen-free and at the pH reference.",
        "V after feed = "+f(l.volume)+" L; MX = "+f(l.biomassMass)+" g; MS = "+f(l.substrateMass)+" g.\n"+
        "X = MX/V = "+f(l.X)+" g/L. All reaction rates use this frozen biomass mass."],
      growth:["Solve substrate, oxygen, growth and product allocation together before applying any reaction increment.",
        "S1 + qS(S1,C1) MX Δt/V = S0\nC1 = C0 + (O2 transferred - O2 consumed)/V\n"+
        "Growth substrate = max(0,S1 - threshold); fS = growth substrate/(KS + growth substrate).\nfO = C1/(0.006 + C1).\n"+
        "S1 = "+f(g.S)+" g/L; C1 = "+f(g.oxygen)+" mmol/L.\n"+
        "μpotential = μmax fS fO fT fpH fAcetate burden = "+f(g.unrestrictedMu)+" h⁻¹.\n"+
        "Overflow diverts substrate; respiratory capacity scales all reaction fluxes by "+f(g.availabilityFactor)+".\n"+
        "Final μ = "+f(g.mu)+" h⁻¹; qS = "+f(g.qS)+" g/(gDCW·h). True growth yield = "+f(g.yxS)+" g/g."],
      biomass:["Apply the already resource-feasible growth and substrate increments.",
        "ΔMX = μ MX0 Δt = "+f(b.biomassGrowth)+" g.\nΔMS = qS MX0 Δt = "+f(b.substrateUse)+" g (growth + maintenance + product allocation).\n"+
        "MX = "+f(b.biomassMass)+" g; remaining MS = "+f(b.substrateMass)+" g."],
      acetate:["Overflow diverts part of growth substrate into acetate; reuse also consumes oxygen and allocates carbon to biomass and CO2.",
        "qA = min(0.55 qGrowthSubstrate, 0.34 max(0,qGrowthSubstrate+qMaintenance-threshold)).\n"+
        "qReuse = min(MA/(MX Δt), 0.08[A/(0.3+A)][0.25/(0.25+S1)] fO).\n"+
        "Apply respiratory capacity scale to both.\nAcetate formed = "+f(a.acetateProduced)+" g; reused = "+f(a.acetateUsed)+" g.\n"+
        "Biomass from reuse = 0.22 × reused = "+f(a.acetateBiomass)+" g; MA = "+f(a.acetateMass)+" g."],
      product:["Product is funded by substrate and respiration. Degradation goes into a tracked inert pool.",
        "qP = αμ + β fSubstrate fO when active; scale by respiratory capacity.\n"+
        "qP = "+f(p.qP)+" g/(gDCW·h); ΔMP = qP MX0 Δt = "+f(p.productFormed)+" g.\n"+
        "Substrate allocated = ΔMP/YP/S = "+f(p.substrateForProduct)+" g.\n"+
        "MP1 = (MP0 + ΔMP) exp(-kdeg Δt) = "+f(p.productMass)+" g.\nDegraded product = "+f(p.productDegraded)+" g."],
      ph:["Carry signed acid inventory between intervals. Base corrects positive H (low pH); acid corrects negative H (high pH). Only one pump doses per interval.",
        "ΔH = 0.45 ΔMXtotal + 1000(acetate formed - reused)/60.05 = "+f(h.acidEquivalentMmol)+" mmol.\n"+
        "Base request = max(0,H)/(1000 Nbase); acid request = max(0,-H)/(1000 Nacid).\n"+
        "Each delivery = min(request, its pump capacity); no working-volume cap.\n"+
        "Base delivered = "+f(h.baseDelivered)+" L; acid delivered = "+f(h.acidDelivered)+" L; residual H = "+f(h.acidUnmet)+" mmol.\n"+
        "pH = setpoint - H/(buffer capacity × V) = "+f(h.phAfter)+".\nContinuous acid/base-matching outflow = "+f(h.baseOutflow+h.acidOutflow)+" L."],
      oxygen:["Report the oxygen allocation solved jointly at the growth node; then account for acid/base dilution and continuous level-control outflow.",
        (o.klaMethod === 'measured-fixed' ? "Fixed measured kLa override.\n" :
        "kLa = 3600 × 0.026 × (Pg/Vm³)^0.4 × Ug^0.5.\nPg/V = "+f(o.powerDensityWm3)+" W/m³; Ug = "+f(o.superficialGasVelocity)+" m/s.\n")+
        "kLa = "+f(o.kla)+" h⁻¹; C* = "+f(o.cStar)+" mmol/L.\n"+
        "Transferred O2 = min[kLa(C* - C1)V Δt, inlet O2] = "+f(o.oxygenTransferred)+" mmol.\n"+
        "Consumed O2 = qO2 MX0 Δt = "+f(o.oxygenUsed)+" mmol.\n"+
        "C1 = C0 + (transferred - consumed)/V = "+f(o.oxygenAfterReaction)+" mmol/L before acid/base.\n"+
        "After liquid handling C = "+f(o.oxygenAfter)+" mmol/L.\nOUR = "+f(o.our)+"; interval OTR = "+f(o.otr)+" mmol/(L·h)."],
      totals:["Accumulate realized resource use and check physical, harvest and duration events.",
        "O2 consumed = "+f(n.totals.oxygenUsed)+" mmol; gas supplied = "+f(n.totals.gasVolumeL)+" L.\n"+
        "Carbon to CO2 = 0.4(substrate consumed + acetate reused - acetate formed) - 0.5(biomass formed + product formed).\n"+
        "CO2 = carbon to CO2 × 44.0095/12.011 = "+f(n.totals.co2Produced)+" g.\n"+
        "Time = "+f(t.after.time)+" h; stop = "+(t.stopReason||"none")+"."],
      final:["Carry the complete resulting state into the next interval, including acidity and degraded-product carbon.",
        "V = "+f(t.after.volume)+" L; MX = "+f(t.after.biomassMass)+" g; MS = "+f(t.after.substrateMass)+" g.\n"+
        "MP = "+f(t.after.productMass)+" g; MA = "+f(t.after.acetateMass)+" g; degraded product = "+f(t.after.degradedProductMass)+" g.\n"+
        "C = "+f(t.after.oxygen)+" mmol/L; H = "+f(t.after.acidExcessMmol)+" mmol; pH = "+f(t.after.ph)+".\n"+
        "Fixed kinetic, feed and equipment parameters remain those in the controls."]
    };
    return [...details[id],"Glucose-equivalent screening assumptions: biomass/product 50% carbon and reduction degree 4.2. This example has strict failure rules off. Nutrient co-limitation, mechanistic survival kinetics, ATP and detailed species metabolism remain outside the model. See the reference for the complete equations."];
  }
  function selectNode(id) {
    selectedNode = id;
    const incoming = edges.filter(edge => edge[1] === id).map(edge => edge[0]);
    const outgoing = edges.filter(edge => edge[0] === id).map(edge => edge[1]);
    for (const [key, item] of nodeElements) {
      const selected = key === id;
      item.node.classList.toggle('is-selected', selected);
      item.node.classList.toggle('is-input', incoming.includes(key));
      item.node.classList.toggle('is-output', outgoing.includes(key));
      item.button.setAttribute('aria-expanded', String(selected)); item.detail.hidden = !selected;
      item.action.textContent = selected ? 'Hide equations & connections' : 'Equations & connections';
      item.dependency.textContent = incoming.includes(key) ? 'Supplies the selected node' : outgoing.includes(key) ? 'Uses the selected node' : '';
      if (selected && current) {
        const [description, equations, caveat] = equationDetail(key);
        item.detail.replaceChildren(create('h4', '', 'This interval’s calculation'), create('p', '', description), create('pre', '', equations), create('p', '', caveat));
        [['Inputs from', incoming], ['Outputs used by', outgoing]].forEach(([title, nodes]) => {
          const links = create('p', 'dependency-links', `${title}: `);
          if (!nodes.length) links.append(document.createTextNode(key === 'final' ? 'the next interval’s initial state.' : 'the configured example and previous state.'));
          nodes.forEach((nodeId, i) => {
            if (i) links.append(document.createTextNode(' · '));
            const link = create('a', '', nodeElements.get(nodeId).title); link.href = `#map-node-${nodeId}`;
            link.addEventListener('click', event => { event.preventDefault(); selectNode(nodeId); nodeElements.get(nodeId).button.focus(); });
            links.append(link);
          });
          item.detail.append(links);
        });
        const link = create('a', '', 'Read the full model reference ↗'); link.href = '#' + item.anchor; item.detail.append(link);
      }
    }
    requestAnimationFrame(drawEdges);
  }
  function drawEdges() {
    const svg = $('dependency-lines'); svg.replaceChildren();
    if (!selectedNode || $('calculation-map').hidden) return;
    const bounds = surface.getBoundingClientRect(), ns = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const definitions = document.createElementNS(ns, 'defs'), marker = document.createElementNS(ns, 'marker');
    marker.id = 'dependency-arrow'; marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9'); marker.setAttribute('refY', '5'); marker.setAttribute('markerWidth', '5'); marker.setAttribute('markerHeight', '5'); marker.setAttribute('orient', 'auto');
    const arrow = document.createElementNS(ns, 'polygon'); arrow.setAttribute('points', '0,0 10,5 0,10'); arrow.setAttribute('fill', '#295c7a');
    marker.append(arrow); definitions.append(marker); svg.append(definitions);
    const relevant = edges.filter(edge => edge.includes(selectedNode));
    relevant.forEach(([from, to], index) => {
      const a = nodeElements.get(from).button.getBoundingClientRect(), b = nodeElements.get(to).button.getBoundingClientRect();
      const left = a.left - bounds.left, gutter = Math.max(3, left - 7 - (index % 5) * Math.max(1, (left - 12) / 5));
      const y1 = a.top - bounds.top + a.height / 2, y2 = b.top - bounds.top + b.height / 2;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M ${left} ${y1} H ${gutter} V ${y2} H ${b.left - bounds.left}`);
      path.setAttribute('marker-end', 'url(#dependency-arrow)'); svg.append(path);
    });
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => requestAnimationFrame(drawEdges)).observe($('flow-nodes'));
  window.addEventListener('resize', drawEdges);

  function showTab(map, focus = false) {
    $('model-reference').hidden = map; $('calculation-map').hidden = !map;
    $('top').classList.toggle('explorer-visible', map);
    for (const [id, active] of [['reference-tab', !map], ['map-tab', map]]) {
      $(id).setAttribute('aria-selected', String(active)); $(id).tabIndex = active ? 0 : -1;
      if (active && focus) $(id).focus();
    }
    if (map && !started) { started = true; updateTime(selectedTime); schedule(); }
    if (map) requestAnimationFrame(drawEdges);
  }
  ['reference-tab', 'map-tab'].forEach(id => {
    $(id).addEventListener('click', () => {
      const map = id === 'map-tab'; showTab(map);
      history.replaceState(null, '', map ? '#calculation-map' : '#model-reference');
    });
    $(id).addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const map = event.key === 'End' || (event.key !== 'Home' && id === 'reference-tab');
        showTab(map, true); history.replaceState(null, '', map ? '#calculation-map' : '#model-reference');
      }
    });
  });
  function applyHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = $(id);
    if (id === 'calculation-map' || id.startsWith('map-node-')) {
      showTab(true);
      if (target && id.startsWith('map-node-')) { selectNode(id.replace('map-node-', '')); target.scrollIntoView(); }
    } else if (target && (id === 'model-reference' || $('model-reference').contains(target))) {
      showTab(false); target.scrollIntoView();
    }
  }
  window.addEventListener('hashchange', applyHash);
  $('calculation-map').addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link && $('model-reference').contains($(link.hash.slice(1)))) {
      showTab(false); // Unhide before native anchor navigation, including an unchanged hash.
    }
  });
  document.querySelector('.reference-tabs').hidden = false;
  applyHash();
})();
