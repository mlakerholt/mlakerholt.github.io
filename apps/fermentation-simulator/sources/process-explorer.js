/* Presentation only: both diagrams consume one shared-engine interval trace. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FermentationExplorer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const stages = [
    ['start', 'Read starting state', ['initial', 'environment'], 'The previous endpoint becomes the starting resource pool. Apply scheduled temperature and induction settings. Organism kinetics, vessel geometry and control settings remain inputs, not newly calculated results.', 'X = MX / V; S = MS / V; A = MA / V\nDO = 100 C / Cair(T, pressure)'],
    ['control', 'Update DO control', ['controller'], 'The sensor follows starting DO with a lag. A retained PI controller, with anti-windup, requests agitation and airflow. Adaptive mode also requests oxygen enrichment; fixed mode retains the selected inlet composition. Actuators approach the requested values with a lag.', 'e = (DOset − DOfiltered) / 100\nu = clamp(I + Kp e, 0, 1)'],
    ['mix', 'Calculate feed and mix flows', ['feed', 'flows'], 'Evaluate the selected feed schedule, then apply any specified pump limit. Only DO-stat feeding uses DO feedback. Feed adds substrate and volume, diluting other concentrations. Continuous operation also removes mixed broth. Working volume does not cap additions.', 'ΔVfeed = F[mL/min] × 0.06 × Δt[h]\nΔMSfeed = ΔVfeed × Sfeed'],
    ['solve', 'Solve resources and cell activity', ['growth'], 'Solve end-interval substrate and oxygen together with growth, maintenance, product and enabled acetate reactions. Transfer depends on current gas delivery and mixing; uptake depends on viable biomass. Respiratory capacity scales the coupled reaction rates. These are not independent sequential calculations.', 'S1 + qS(S1, C1) MXviable Δt / V = S0\nC1 = C0 + (O₂ transferred − O₂ consumed) / V\nTransfer ≤ inlet oxygen supplied'],
    ['material', 'Apply material changes', ['biomass', 'acetate', 'product'], 'Apply the funded increments from the coupled solve: biomass formation, substrate consumption, optional acetate formation/reuse and product formation. Track degraded product separately. Reaction amounts use the same frozen, post-flow viable biomass for the interval.', 'ΔMX = μ MXviable Δt + biomass from acetate\nΔMS = qS MXviable Δt\nMP1 = (MP0 + product formed) exp(−kdeg Δt)'],
    ['titrant', 'Apply pH control and dilution', ['ph', 'oxygen'], 'Add metabolic acid equivalents to the signed acid inventory. In controlled mode, positive inventory requests base and negative inventory requests acid. Separate pump capacities limit delivery. Recalculate volume, concentrations and pH. Oxygen is carried forward from the coupled solve, not solved a second time.', 'H += metabolic acid + acid dosed − base dosed\nV += delivered acid + delivered base\npH = pHset − H / (buffer capacity × V)'],
    ['record', 'Check failure rules and record', ['totals', 'failures'], 'Accumulate delivered resources and record endpoint values. Optional strict rules evaluate exposure durations and failure thresholds. Stress changes the next interval; irreversible culture death moves biomass into the nonviable pool. Warnings or volume excess do not themselves stop the run.', 'Cumulative addition += actual delivered amount\nExposure timers use interval endpoint conditions'],
    ['finish', 'Continue or finish · final pool', ['final'], 'Check duration and the selected stopping condition. Carry the resulting resource pools, controller history and failure state into the next interval. Final concentrations are based on final volume. The terminal interval is the final run state; earlier endpoints are not final harvest results.', 'State(t + Δt) → State(t) for the next interval\nConcentrations = resulting amount / resulting volume']
  ];
  const overview = [
    ['feed', 'Medium and feed', ['initial', 'feed', 'flows'], 'Initial medium establishes the starting substrate pool. Feed supplies additional substrate and liquid. Scheduled feeding is open-loop; only DO-stat responds to DO and residual substrate.', 'ΔMSfeed = F × Sfeed × Δt\nFeed also changes V and therefore concentrations.'],
    ['do', 'DO controller', ['controller'], 'Broth DO is the feedback signal. Sensor lag, a retained PI integral and actuator lag separate the measurement, requested action and actual gas/mixing settings.', 'Broth DO → sensor → PI → agitation / aeration\nAdaptive mode only: also change inlet O₂ fraction.'],
    ['cells', 'Cells and product formation', ['growth', 'biomass', 'acetate', 'product', 'failures'], 'Cells consume substrate and oxygen and form biomass and product. Their activity changes the environment they depend on. Acetate formation/reuse is optional; when enabled it links carbon allocation, inhibition and acidity. Strict failure rules can reduce viable biomass.', 'Substrate + O₂ → biomass + product + metabolites\nMore viable biomass can increase total OUR, even at the same specific uptake rate.'],
    ['broth', 'Broth conditions', ['initial', 'flows', 'final'], 'The shared environment links feed, gas transfer, cells and titrant addition. Resource availability and pH affect cell activity; cell activity changes those resources. Values on this node show the interval endpoint. Expand the worked example to compare starting and final pools.', 'X = MX / V; S = MS / V; A = MA / V\nDO = 100 C / Cair; pH = pHset − H / (buffer capacity × V)'],
    ['gas', 'Reactor and gas supply', ['controller', 'oxygen'], 'Vessel geometry, impellers, actual agitation and aeration determine the transfer correlation. Inlet oxygen sets gas equilibrium and the available oxygen supply. Transfer and cell uptake compete in the coupled solve.', 'OTR = transferred O₂ / (V × Δt)\nOUR = consumed O₂ / (V × Δt)\nΔ dissolved O₂ = transferred − consumed'],
    ['ph', 'pH control', ['ph'], 'Metabolism changes the signed acid inventory. Controlled pH requests acid or base according to its sign; delivery is limited by the corresponding pump. Both additions change liquid volume and dilute resource concentrations. Uncontrolled mode delivers neither titrant.', 'Cells → acid inventory → pH → acid/base delivery\nAcid/base delivery → pH + volume → cells']
  ];
  const f = x => typeof x !== 'number' ? String(x) : !Number.isFinite(x) ? 'Unavailable' : x === 0 ? '0' : Math.abs(x) < .001 || Math.abs(x) >= 1e6 ? x.toExponential(3) : String(Number(x.toPrecision(5)));
  const m = (label, value, unit = '') => [label, `${f(value)}${unit ? ' ' + unit : ''}`];
  const time = x => String(Number(x.toFixed(8)));
  function overviewEdges(s) {
    const edges = [
      ['feed', 'broth', 'Substrate + liquid', 'material'],
      ['gas', 'broth', 'O₂ transfer', 'material'],
      ['broth', 'cells', 'Resources / inhibition', 'material'],
      ['cells', 'broth', 'Consumption / acidity', 'material'],
      ['broth', 'do', 'DO measurement', 'feedback'],
      ['do', 'gas', s.reactor.oxygenSupplyMode === 'fixed' ? 'rpm / air; O₂ fixed' : 'rpm / air / O₂', 'feedback']
    ];
    if (s.process.phMode === 'controlled') edges.push(['broth', 'ph', 'pH / acid inventory', 'feedback'], ['ph', 'broth', 'Acid/base + liquid', 'material']);
    if (s.process.type !== 'batch' && s.feed.strategy === 'do-stat') edges.push(['broth', 'feed', 'DO-stat only', 'feedback']);
    return edges;
  }
  function summaries(t, s) {
    const n = t.nodes, b = t.before, a = t.after, dt = t.dt;
    const pools = state => [m('Volume', state.volume, 'L'), m('Total biomass', state.biomassMass, 'gDCW'), m('Substrate', state.substrateMass, 'g')];
    return {
      start: [...pools(b), m('Starting pH', b.ph)],
      control: [m('Filtered DO', n.controller.filteredDo, '%'), m('Applied agitation', n.controller.rpm, 'rpm'), m('Applied aeration', n.controller.vvm, 'vvm')],
      mix: [m('Feed delivery', n.feed.appliedMlMin, 'mL/min'), m('Substrate added', n.flows.substrateAdded, 'g/step'), m('Post-feed volume', n.flows.volume, 'L')],
      solve: [m('Growth μ', n.growth.mu, 'h⁻¹'), m('OUR', n.oxygen.our, 'mmol/(L·h)'), m('OTR', n.oxygen.otr, 'mmol/(L·h)')],
      material: [m('Biomass formed', n.biomass.biomassGrowth + n.acetate.acetateBiomass, 'g/step'), m('Substrate consumed', n.biomass.substrateUse, 'g/step'), m('Product formed', n.product.productFormed, 'g/step')],
      titrant: [m('Base delivered', n.ph.baseDelivered * 1000, 'mL/step'), m('Acid delivered', n.ph.acidDelivered * 1000, 'mL/step'), m('Resulting pH', a.ph)],
      record: [m('Cumulative feed', a.cumulativeFeed, 'L'), m('Working-volume excess', a.workingVolumeExcess, 'L'), m('Strict rules', n.failures.enabled ? 'Enabled' : 'Off')],
      finish: [...pools(a), m('Next action', t.stopReason || 'Continue')],
      feed: [m('Feed strategy', s.process.type === 'batch' ? 'Batch · no feed' : s.feed.strategy), m('Feed delivery', n.feed.appliedMlMin, 'mL/min'), m('Carbon added', n.flows.substrateAdded, 'g/step')],
      do: [m('Raw DO at start', n.environment.doPercent, '%'), m('DO target', s.process.doSetpoint, '%'), m('PI output', n.controller.output * 100, '%')],
      cells: [m('Viable biomass at end', n.failures.viableBiomassMass, 'gDCW'), m('Interval growth μ', n.growth.mu, 'h⁻¹'), m('OUR', n.oxygen.our, 'mmol/(L·h)'), m('Acetate reactions', s.biology.enableOverflow ? 'Enabled' : 'Disabled')],
      broth: [m('Substrate', a.substrateConcentration, 'g/L'), m('DO', n.oxygen.doAfter, '% air saturation'), m('pH', a.ph), m('Acetate', a.acetateConcentration, 'g/L'), m('Volume', a.volume, 'L')],
      gas: [m('Agitation', n.controller.rpm, 'rpm'), m('Aeration', n.controller.vvm, 'vvm'), m('Inlet O₂', n.controller.oxygenFraction * 100, `% · ${s.reactor.oxygenSupplyMode}`), m('OTR', n.oxygen.otr, 'mmol/(L·h)')],
      ph: [m('Control mode', s.process.phMode), m('Base delivery', n.ph.baseDelivered / (.06 * dt), 'mL/min'), m('Acid delivery', n.ph.acidDelivered / (.06 * dt), 'mL/min')]
    };
  }
  function mount(root, options) {
    const doc = root.ownerDocument, items = new Map(), open = {overview:null, order:null};
    const tabs = new Map();
    let mode = 'overview', data = null;
    const make = (tag, cls, text) => { const el = doc.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
    const toolbar = make('div', 'explorer-view-tabs'); toolbar.setAttribute('role', 'tablist'); toolbar.setAttribute('aria-label', 'Process diagram view');
    const panels = {}, surfaces = {}, lists = {}, svgs = {};
    for (const [view, title, definitions] of [['overview', 'Process overview', overview], ['order', 'Calculation order', stages]]) {
      const button = make('button', '', title); button.type = 'button'; button.id = `explorer-tab-${view}`;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', `explorer-${view}`);
      button.addEventListener('click', () => showView(view));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault(); showView(event.key === 'Home' ? 'overview' : event.key === 'End' ? 'order' : view === 'overview' ? 'order' : 'overview');
        tabs.get(mode).focus();
      });
      toolbar.append(button); tabs.set(view, button);
      const panel = make('section', 'explorer-panel'); panel.id = `explorer-${view}`;
      panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', button.id);
      const legend = make('p', 'map-legend', view === 'overview' ? 'Solid arrows: material changes and biological effects. Dashed arrows: measurement and control feedback. These are interactions, not execution order.' : 'Numbered nodes: execution order. Solid arrows: this interval. Dashed return: final state becomes the next starting state.');
      const surface = make('div', `graph-surface graph-${view}`);
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('graph-lines');
      const list = make(view === 'order' ? 'ol' : 'ul', 'graph-nodes'); list.setAttribute('aria-label', title + ' and live values');
      definitions.forEach((definition, index) => {
        const [id, title] = definition, key = `${view}-${id}`;
        const node = make('li', `graph-node graph-node-${id}`); node.id = `explorer-node-${key}`;
        const button = make('button', 'graph-node-toggle'); button.type = 'button';
        const caption = view === 'order' ? `${index + 1}. ${title}` : title;
        button.append(make('span', 'node-title', caption), make('span', 'graph-action', 'Inspect calculations'));
        const values = make('dl', 'node-values graph-summary');
        const detail = make('div', 'graph-detail'); detail.id = `explorer-detail-${key}`; detail.hidden = true;
        button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', detail.id);
        button.addEventListener('click', () => { open[view] = open[view] === id ? null : id; refreshNodes(); });
        node.append(button, values, detail); list.append(node);
        items.set(key, {node, button, values, detail, definition, view, tab:'explanation'});
      });
      surface.append(svg, list); panel.append(legend, surface);
      if (view === 'overview') panel.append(make('p', 'graph-loop-note', 'Consumption: broth → cells → resource depletion → broth. Metabolism: cells → acetate/acidity → broth → cells. Control: broth → controllers → gas/titrants → broth.'));
      panels[view] = panel; surfaces[view] = surface; lists[view] = list; svgs[view] = svg;
    }
    root.append(toolbar, panels.overview, panels.order);
    function showView(view) {
      mode = view;
      for (const [key, panel] of Object.entries(panels)) {
        panel.hidden = key !== view; tabs.get(key).setAttribute('aria-selected', String(key === view)); tabs.get(key).tabIndex = key === view ? 0 : -1;
      }
      draw();
    }
    function metrics(parent, rows) {
      parent.replaceChildren();
      for (const [label, value] of rows) {
        const pair = make('div', 'node-metric'); pair.append(make('dt', '', label), make('dd', '', value)); parent.append(pair);
      }
    }
    function renderDetail(item) {
      const [id, , ids, explanation, equation] = item.definition, key = `${item.view}-${id}`;
      const focusedTab = item.detail.querySelector('[role="tab"]:focus')?.textContent;
      item.detail.replaceChildren();
      const nav = make('div', 'node-tabs'); nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', item.definition[1] + ' details');
      const body = make('div', 'node-tab-content'); body.id = `explorer-content-${key}`; body.setAttribute('role', 'tabpanel');
      for (const [tab, label] of [['explanation','Explanation'], ['example','Worked example']]) {
        const button = make('button', '', label); button.type = 'button'; button.id = `explorer-${key}-${tab}`;
        button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', body.id); button.setAttribute('aria-selected', String(item.tab === tab)); button.tabIndex = item.tab === tab ? 0 : -1;
        const activate = () => { item.tab = tab; renderDetail(item); item.detail.querySelector(`#explorer-${key}-${tab}`).focus(); draw(); };
        button.addEventListener('click', activate);
        button.addEventListener('keydown', event => {
          if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
          event.preventDefault(); item.tab = event.key === 'Home' ? 'explanation' : event.key === 'End' ? 'example' : item.tab === 'example' ? 'explanation' : 'example';
          renderDetail(item); item.detail.querySelector(`[aria-selected="true"]`).focus(); draw();
        });
        nav.append(button);
      }
      body.setAttribute('aria-labelledby', `explorer-${key}-${item.tab}`);
      item.detail.append(nav, body);
      if (item.tab === 'explanation') {
        body.append(make('p', '', explanation), make('pre', '', equation));
        if (item.view === 'overview' && data) {
          const links = overviewEdges(data.scenario).filter(edge => edge[0] === id || edge[1] === id);
          const list = make('ul', 'graph-connections');
          for (const [from, to, label] of links) {
            const names = [from, to].map(key => overview.find(node => node[0] === key)[1]);
            list.append(make('li', '', `${names[0]} → ${names[1]}: ${label}`));
          }
          body.append(list);
          if (id === 'feed') body.append(make('p', '', data.scenario.feed.strategy === 'do-stat' && data.scenario.process.type !== 'batch' ? 'DO-stat feedback is active for this example.' : 'No automatic DO feedback to this feed schedule.'));
          if (id === 'ph' && data.scenario.process.phMode !== 'controlled') body.append(make('p', '', 'pH control is off in this example: both titrant delivery paths are inactive.'));
        }
      } else if (!data) body.append(make('p', '', 'Waiting for the first calculated interval…'));
      else {
        body.append(make('p', 'graph-interval', `${time(data.trace.before.time)} → ${time(data.trace.after.time)} h · Δt ${f(data.trace.dt * 3600)} s. Rates refer to this interval; final pools refer to its endpoint.`));
        for (const source of ids) {
          const section = make('section', 'worked-section');
          section.append(make('h4', '', options.titles[source] || source));
          const detail = data.detail(source);
          section.append(make('p', '', detail[0]), make('pre', '', detail[1]));
          if (data.limits[source]) section.append(make('p', 'node-limit', data.limits[source]));
          const values = make('dl', 'node-values'); metrics(values, data.readouts[source] || []); section.append(values); body.append(section);
        }
        if (ids.includes('initial') || ids.includes('final')) {
          const raw = make('details'); raw.append(make('summary', '', 'Complete state and fixed parameters'));
          raw.append(make('pre', '', JSON.stringify({startingState:data.trace.before, resultingState:data.trace.after, parameters:data.scenario}, null, 2))); body.append(raw);
        }
      }
      const related = make('p', 'graph-related');
      if (item.view === 'overview') {
        related.append(doc.createTextNode('Calculation stages: '));
        stages.forEach((stage, index) => {
          if (!stage[2].some(source => ids.includes(source))) return;
          const button = make('button', '', `${index + 1}. ${stage[1]}`); button.type = 'button';
          button.addEventListener('click', () => { open.order = stage[0]; showView('order'); refreshNodes(); items.get(`order-${stage[0]}`).button.focus(); }); related.append(button);
        });
      } else {
        const index = stages.findIndex(stage => stage[0] === id);
        for (const next of [index - 1, index + 1].filter(index => index >= 0 && index < stages.length)) {
          const button = make('button', '', `${next + 1}. ${stages[next][1]}`); button.type = 'button';
          button.addEventListener('click', () => { open.order = stages[next][0]; refreshNodes(); items.get(`order-${stages[next][0]}`).button.focus(); }); related.append(button);
        }
      }
      body.append(related);
      const ref = make('a', '', 'Read the full model reference'); ref.href = '#' + (options.anchors[ids[0]] || 'time-step'); body.append(ref);
      if (focusedTab) [...nav.children].find(button => button.textContent === focusedTab)?.focus();
    }
    function refreshNodes() {
      const slots = {feed:[1,1], do:[1,3], cells:[2,1], broth:[2,2], gas:[2,3], ph:[3,2]};
      const expandedRow = open.overview ? slots[open.overview][0] : null;
      for (const item of items.values()) {
        const selected = open[item.view] === item.definition[0];
        if (item.view === 'overview') {
          const [row, col] = slots[item.definition[0]];
          item.node.style.gridRow = selected ? row : expandedRow && row >= expandedRow ? row + 1 : row;
          item.node.style.gridColumn = selected ? '1 / -1' : col;
        }
        item.node.classList.toggle('is-selected', selected); item.button.setAttribute('aria-expanded', String(selected)); item.detail.hidden = !selected;
        item.button.querySelector('.graph-action').textContent = selected ? 'Close calculations' : 'Inspect calculations';
        if (selected) renderDetail(item);
      }
      draw();
    }
    function draw() { requestAnimationFrame(drawNow); }
    function drawNow() {
      const surface = surfaces[mode], svg = svgs[mode], bounds = surface.getBoundingClientRect(); svg.replaceChildren();
      if (!bounds.width || !data) return;
      const ns = 'http://www.w3.org/2000/svg', el = (tag, attrs) => {const item = doc.createElementNS(ns, tag); for (const [key,value] of Object.entries(attrs)) item.setAttribute(key, value); return item;};
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      const defs = el('defs', {});
      for (const kind of ['material', 'feedback']) {
        const marker = el('marker', {id:`graph-${mode}-${kind}`,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto'});
        marker.append(el('path', {d:'M0,0 L10,5 L0,10 Z',class:`arrow-${kind}`})); defs.append(marker);
      }
      svg.append(defs);
      const rect = id => items.get(`${mode}-${id}`).node.getBoundingClientRect();
      const edges = mode === 'overview' ? overviewEdges(data.scenario) : [...stages.slice(0,-1).map((stage,index) => [stage[0], stages[index+1][0], '', 'material']), ['finish','start','Next interval','feedback']];
      const narrow = bounds.width < 720;
      edges.forEach(([from,to,label,kind], index) => {
        const a = rect(from), b = rect(to), reverse = edges.some(edge => edge[0] === to && edge[1] === from);
        let d, lx, ly;
        if (mode === 'order' && from !== 'finish') {
          const x1 = a.left + a.width/2 - bounds.left, x2 = b.left + b.width/2 - bounds.left;
          const y1 = a.bottom - bounds.top, y2 = b.top - bounds.top;
          d = `M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`;
        } else if (narrow || (mode === 'order' && from === 'finish')) {
          const x1 = a.left - bounds.left, x2 = b.left - bounds.left, y1 = a.top + 28 - bounds.top, y2 = b.top + 28 - bounds.top, gutter = 4 + index%4*5;
          d = `M${x1},${y1} H${gutter} V${y2} H${x2}`;
        } else {
          const horizontal = Math.abs(a.left-b.left) > a.width/2;
          const sign = reverse ? (from < to ? -1 : 1) : 0;
          const x1 = (horizontal ? a.left < b.left ? a.right : a.left : a.left+a.width/2+sign*23)-bounds.left;
          const x2 = (horizontal ? b.left < a.left ? b.right : b.left : b.left+b.width/2+sign*23)-bounds.left;
          const y1 = (horizontal ? a.top+a.height/2+sign*22 : a.top < b.top ? a.bottom : a.top)-bounds.top;
          const y2 = (horizontal ? b.top+b.height/2+sign*22 : b.top < a.top ? b.bottom : b.top)-bounds.top;
          d = horizontal ? `M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}` : `M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`;
          lx = (x1+x2)/2; ly = (y1+y2)/2 - 5;
        }
        const path = el('path', {d,class:`graph-edge edge-${kind}`,'marker-end':`url(#graph-${mode}-${kind})`});
        const title = el('title', {}); title.textContent = `${from} → ${to}: ${label || 'next calculation'}`; path.append(title); svg.append(path);
        // Keep labels on selected connections only; every connection is also listed as text in its node.
        if (!narrow && label && open[mode] && (from === open[mode] || to === open[mode]) && lx !== undefined) {
          const text = el('text', {x:lx,y:ly,'text-anchor':'middle',class:'graph-edge-label'}); text.textContent = label; svg.append(text);
        }
      });
    }
    if (typeof ResizeObserver !== 'undefined') for (const list of Object.values(lists)) new ResizeObserver(draw).observe(list);
    window.addEventListener('resize', draw);
    showView('overview');
    return {
      update(next) { data = next; const values = summaries(next.trace, next.scenario); for (const item of items.values()) metrics(item.values, values[item.definition[0]]); refreshNodes(); },
      draw,
      selectLegacy(id) { const stage = stages.find(stage => stage[2].includes(id)); if (!stage) return; open.order = stage[0]; showView('order'); refreshNodes(); items.get(`order-${stage[0]}`).button.focus(); },
      showView
    };
  }
  return {mount, stages, overview, overviewEdges, summaries};
});
