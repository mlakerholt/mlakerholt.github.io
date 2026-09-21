# Fermentation Simulator

Browser-only beta for configuring and simulating a well-mixed microbial or animal-cell process. The app is designed for GitHub Pages and has no server dependency.

## Run from the desktop

Double-click the **Fermentation Simulator** desktop shortcut. It starts a local server and opens the app at http://127.0.0.1:8765. Node.js is required and is already installed on this computer. No package installation is needed.

Use the shortcut instead of opening `index.html` directly: browsers block the file requests used by the compressed simulator and vessel records when opened directly from disk. The server accepts connections only from this computer. It stays running until Windows exits; opening the shortcut again reuses it.

Edit the files in this folder and refresh the browser to see changes. The local server disables caching. Saved scenarios belong to this local browser address, separately from the GitHub website; use JSON export/import to transfer scenarios.

For a visible server you can stop with Ctrl+C, run `node local-server.cjs` in this folder when the desktop server is not already running.

## Included in beta 0.1

- Manufacturer-filtered vessel catalogue covering Sartorius, Merck, Thermo Fisher Scientific, Cytiva and custom systems
- Single-use animal-cell and microbial-cell reactor configurations with fixed molded impeller type/count
- Configurable impeller type and count for reusable glass and stainless-steel reactors
- Vessel geometry, impeller, sparger, agitation, airflow and oxygen-enrichment limits
- Grouped animal-cell and microbial presets, including CHO and hybridoma mAb production, HEK293 recombinant protein production, S. cerevisiae and A. niger
- Published growth-data links and explicit clone-, construct- and morphology-dependent limitations for the new biology presets
- A searchable biology databank and a field-level source/derivation sheet for every organism and cell-line preset
- Generalized multi-study profiles for nine species/host groups, including representative values, reported ranges and confidence labels
- Batch, fed-batch and continuous operation
- Grouped animal-cell and microbial base-media and feed recipes, with editable compositions
- Constant, linear, exponential and simple DO-stat feed profiles
- Live feed-parameter derivations inside Step 5, with scenario-specific recommendations and an explicit Apply button
- Biomass, carbon substrate, product, acetate, oxygen-transfer and approximate pH-control balances
- Equipment-constraint warnings, final-state report, JSON scenario export and CSV time-series export
- Local browser storage; scenario information is not uploaded
- Direct links to the selected vessel's readable derivation sheet and the complete reactor databank
- Clickable explanations in each derivation sheet for every derived or assumed vessel value
- Step 3 model-reference link with an interactive calculation-map tab: replay a predefined E. coli process, adjust sliders, and inspect actual intermediate values and resource pools

The interactive map lives at `sources/simulation.html#calculation-map`. It uses
`simulation-core.js`, the same calculation engine as the main simulator, and
does not read or overwrite saved scenarios. See `sources/README.md` for build
and numerical regression checks.

## Vessel source records

Every vessel selection links directly to its source and derivation sheet, where manufacturer sources, saved dates, working-volume and material values, and support status can be reviewed.

The `sources/` directory contains one permanent, readable source sheet for every vessel option. The source sheets preserve the exact values used by the app, clearly separate manufacturer-supported fields from editable simulator assumptions, and make every estimate or assumption expandable so its complete derivation can be reviewed. The records are stored locally in `sources/source-records.payload`; `sources/index.html` renders them as ordinary browser pages.

## Core model

UI and engine build **2026-09-17.6** treat working and total vessel volumes as
warning thresholds, not hard caps. Feed, acid and base continue according to
their schedules/controller and pump limits, even in legacy volume-harvest runs.
Red Process warnings show peak volume, excess litres/percent and first working-
volume exceedance time. Initial overfill is allowed and flagged. CSV/report
outputs include excess metrics. Beyond-limit results are extrapolations, not a
physical spillage model. Pump capacities, numerical safeguards, duration and
selected substrate harvest still apply; feed recommendations retain a headroom margin.

UI and engine build **2026-09-17.5** add acid dosing alongside base under
Step 3 Environmental controls. Controlled pH uses base for excess acidity and
acid for alkalinity, limited by separate pump capacities (the original volume cap
was removed in 2026-09-17.6).
Both titrants dilute material pools; continuous culture removes matching mixed
broth. Acid additions are included in conservation checks, CSV/report totals,
reactor graphs and the calculation map. New setups default to 4 eq/L acid and
1 mL/min, both editable; old imports without acid settings retain a disabled
acid pump (0 mL/min). Uncontrolled pH disables both pumps. This is still a
simplified constant-buffer inventory model, not a chemical-equilibrium or pH PID model.

UI build **2026-09-17.4** adds specific growth rate μ (h⁻¹) versus time to
Stage 7 **Process profiles**, using the engine's recorded `growthRate` rather
than the feed exponent. The calculation engine and existing records are unchanged.

UI build **2026-09-17.3** adds a Stage 7 **Reactor parameters** tab alongside
the existing process profiles: stirrer speed, aeration, inlet oxygen, kLa,
feed flow and cumulative feed, interval-average base flow and cumulative base,
working volume and DO-controller output. Configured limits are dashed.
Base flow is calculated from cumulative additions between stored points;
other rates are sampled. Pump speed is shown as liquid flow, not motor RPM.
This is a display-only change; engine 2026-09-16.2 and CSV records are unchanged.

UI build **2026-09-17.2** adds a feed-planning panel without changing engine build
2026-09-16.2. Its worker estimates the no-feed phase using the shared engine;
the recommendation then accounts for organism kinetics, biomass and liquid volume
at feed start, maintenance/product carbon demand, feed concentration, maximum
oxygen transfer, specified pump capacity and available vessel volume. Formulas,
substituted values and assumptions are shown inside the Feed strategy box.
Recommendations update with the scenario; only **Apply derived values** changes
feed controls. Imports/manual values and the optional pump maximum are preserved.
The derivation panel shows organism μmax and the recommended percentage of μmax;
the μset control retains advisory warnings for targets above modeled kinetic bounds. The
recommendation uses a preset target or a disclosed 60%-of-μmax heuristic, without
a generic 0.16 h⁻¹ ceiling; other process constraints can reduce it further.
The exponential planning envelope is a screening estimate, not feedback growth
control or an experimentally validated feeding protocol. See
[feed-planning notes](sources/FEED-DERIVATION.md).

Build **2026-09-16.2** uses a coupled substrate/oxygen solve so growth,
maintenance, product formation and acetate reactions cannot consume unavailable
resources. Product and overflow draw from the same glucose-equivalent carbon
pool. Carbon/reducing-equivalent allocation determines CO2 and oxygen demand.

A retained acid-equivalent inventory replaces artificial pH recovery. Feed and
base obey pump limits; continuous level control includes acid/base. Working-volume
limits have been warning-only since build 2026-09-17.6.
Intervals are capped at 0.001 h (3.6 s), split at scheduled events, and shortened at the
exact final duration. Smaller requested intervals permit refinement checks.

Feed-pump capacity is unlimited by default. Leave Step 5's optional Pump maximum blank,
or enter a nonnegative capacity to impose a limit. The calculation map uses the same
blank/unlimited convention without a 5 mL/min ceiling. Existing saved numeric limits
are preserved; JSON null or omission means unlimited. Feed schedules and vessel-volume
limits still apply. Base-pump limits are unchanged.

DO uses a stateful PI controller with anti-windup and a sequential agitation,
airflow and oxygen-enrichment cascade. Tuning is editable in Step 3. Oxygen
transfer uses the Van’t Riet coalescing-liquid correlation with explicit W/m³
gassed power and m/s superficial gas velocity; a measured kLa can override it.
The default gassed/ungassed power ratio is an unmeasured proxy of 1, not a
manufacturer calibration. See the [oxygen revision comparison](benchmarks/oxygen-revision-2026-09-16/README.md)
for original/controller-only/transfer-only/combined results and remaining discrepancies.

See [the written model guide and live map](sources/simulation.html) for equations,
calculation order, controls and limitations, and [repair notes](sources/MODEL-REPAIRS.md)
for changed parameter semantics, acceptance tests and remaining audit items.

## Important limitations

This is not a validated process simulator or equipment-sizing package. Reactor presets are broad equipment archetypes and are not certified manufacturer specifications. Strain kinetic values, complex-medium substrate equivalents, kLa correlations, overflow metabolism, product coefficients, gas balances and pH demand are simplified assumptions.

Product yield cannot be predicted from strain identity alone. Recombinant-protein, plasmid and metabolite scenarios should be calibrated with construct- and process-specific experimental data before interpretation.

## Files

- `index.html` — staged interface and report layout
- `simulator.css` — responsive visual design
- `app.js` — lightweight compressed-bundle loader
- `app.payload.*` — compressed UI source containing presets, state management, charts and exports
- `simulation-core.js` — shared numerical engine used by the main app and calculation map
- `vessel-catalog.payload` — compressed manufacturer/model selector and source-link integration
- `source-derivations.js` — shared parameter-status, formula and derivation logic
- `source-panel.js` — direct derivation-sheet and reactor-databank links below the vessel selector
- `sources/` — readable local source sheets and original manufacturer links for every vessel preset
- `sources/biology/` — biology databank, published-source records, per-preset derivation sheets and generalized multi-study profiles
- `sources/simulation.html` — Step 3 model guide: equations, calculation order, final results, controls and known limitations
- `sources/simulation.css` — model-guide additions to the shared source-sheet style

## Model-guide checks

Run `node sources/test-simulation-guide.cjs` after changing the guide or simulator. This checks the Step 3 link, local navigation, calculation-order sections, numerical pH/DO examples, and a fingerprint of the shipped model functions. A model/build change requires reviewing the guide before updating its recorded version and fingerprint. The guide documents the current repaired engine, including its remaining limitations.

Run `node sources/test-oxygen-revision.cjs` for transfer units, independent controller response and stability, anti-windup, scenario defaults and oxygen-conservation checks. The comparison is reproducible with `node benchmarks/oxygen-revision-2026-09-16/run.cjs`; it preserves the original benchmark artifacts.

## Strict failure rules (2026-09-21.1)

New app scenarios enable `process.strictFailures`; imported scenarios that omit it preserve legacy kinetics. `process.aerobicFailureRules` separately controls low-DO exposure rules, not the reaction pathways. See `sources/failure-modes.html` for organism-group limits, timed triggers, recovery and penalties. These are punitive teaching heuristics, not literature-fitted death kinetics; no N/P balances were added.

The engine retains total/viable/nonviable biomass, episode diagnostics and latched culture/batch flags. Growth/product potentials are scaled once during stress; dead cells cease reactions without deleting biomass carbon. Accepted output is distinct from physical recoverable output. Flows and controllers continue after failure and volume is never capped. Records, reports and the interval trace expose the added state.

`failure-results.js` / `.css` implement results-only category icons with counters (UI build 2026-09-21.2). Warning lists start collapsed; a category click reveals its events/notices, and individual event buttons open the accessible illustrated dialog. Nothing opens automatically. Category selection survives re-rendering of the same result and resets for a new run. No process-warning list is shown during setup. `assets/failures/` contains eight native imagegen lab illustrations and `PROMPTS.md` records their prompts/provenance. Only the selected event image loads when the dialog opens.

Run `node sources/test-failure-modes.cjs` and `node sources/test-failure-results.cjs` for rule boundaries, timers, latching, conservation, no-feed starvation guards, continued operation, category counts, collapsed defaults and scoped UI event navigation. Run all `sources/test-*.cjs` for regression checks. After editing `tmp/app-source.js`, rebuild the shipped payloads with `node sources/build-app.cjs`; review the simulation guide and refresh its core fingerprint after changing the engine.
