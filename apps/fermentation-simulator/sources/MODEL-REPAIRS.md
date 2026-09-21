# Model repairs — build 2026-09-13.2

These repairs address the 13 September audit. Predictions intentionally change.
The simulator remains an uncalibrated, well-mixed aerobic screening model, not a
validated process-design or equipment-sizing tool. The written guide and live
calculation map both use the repaired shared engine.

## Implemented

| Audit area | Repair |
|---|---|
| F01: stale biology/process combinations | Complete preset switching resets compatible pH, temperature, product, medium and feed defaults. Explicit biology-only mode retains settings and warns about conflicts. OD600 requires a user-supplied dry-mass calibration. |
| F02–03: unfunded oxygen demand and numerical sensitivity | Coupled, nonnegative substrate/oxygen solve determines feasible reactions before applying growth. Gas transfer cannot exceed inlet oxygen. Maximum internal interval is 0.005 h, with smaller requested intervals honored and exact feed/induction/duration boundaries. |
| F04: pH recovery without base | Retained acid-equivalent inventory replaces free relaxation. Pump- and volume-limited base neutralizes accumulated acidity. Initial pH is independently editable; the artificial pH 3 floor is removed. |
| F05, F07: product/acetate carbon creation | Product draws substrate from the shared pool, including the non-growth term. Overflow diverts growth substrate. Acetate reuse is balanced. Carbon allocation determines CO2; reducing-equivalent allocation determines O2 demand. Degraded product enters a tracked inert pool. |
| F06: yield definitions and threshold | Explicit observed/true yield definition and reference growth rate; observed yields use a Pirt-type maintenance correction. Confirmed CHO/HEK293/C. glutamicum cases are marked accordingly. CHO threshold is exposed as a qualified model adaptation. |
| F08, F13: units and input handling | Carbon g/L, mg/L and identified mmol/L convert to mass consistently. Unsupported molecular weights, inconsistent recipe totals, blank/nonfinite/invalid inputs and infeasible yields are rejected. |
| F10: misleading controls | Inactive induction controls are disabled. Documentation labels the DO cascade as proportional with lag, not PID, and exponential feeding as a schedule, not growth-rate feedback. |
| F11: liquid/pump limits | Nutrient feed and base obey headspace limits. Continuous feed obeys pump capacity; continuous level control also removes the volume added by base. Every pool follows outflow and dilution. |
| F12, F14: reporting and provenance | Actual final-interval rates survive early stops. Harvested biomass is included in biomass-product output. Peak feed is the delivered rate. Editing invalidates old results. Exports retain model version, assumptions, scenario snapshot and selected vessel identity. Reset/unlinked imports are not mislabeled as a manufacturer preset. |
| F15: transfer assumptions | No positive generic kLa at zero agitation/aeration. Optional fixed measured-kLa override. Generic correlations and source-derived respiratory capacity settings remain explicitly uncalibrated. |

## Changed semantics and assumptions

- qO2Max now caps respiration; it is no longer used in the old empirical demand
  formula. A published uptake at one condition is not a proven maximum. Existing
  calibrated scenarios need recalibration rather than a direct old/new comparison.
- Glucose-equivalent substrate and acetate use 40% carbon; biomass and product use
  50% carbon. Assumed reduction degrees are 4 and 4.2, respectively. Product yield
  defaults to 0.5 g/g. These are explicit screening assumptions, not newly measured
  compositions. They make the bookkeeping conservative without proving biological
  feasibility or an ATP balance.
- The resource solver is first-order/semi-implicit with frozen post-feed biomass
  and volume during each reaction interval. It is not adaptive error control.
- CHO's 0.58 g/L threshold is used against instantaneous substrate, not claimed to
  exactly reproduce the publication's original threshold fit. The observed-yield
  correction applies at a stated reference rate, not across all process conditions.
- Feed is oxygen-free and at the model pH reference. Buffer capacity is fixed.
  Base is expressed in equivalents/L. No carbonate or detailed feed-pH chemistry
  has been introduced. Degraded product is inert, not mineralized or reassimilated.

## Verification

Run `node sources/build-app.cjs`, then all `sources/test-*.cjs` suites.

New acceptance tests cover carbon/substrate/oxygen/acid closure, nonnegative pools,
dense oxygen-limited cultures, zero-gas conditions, starvation and product funding,
historical acid neutralization, below-pH-3 operation, pump/headspace constraints,
continuous harvest, fractional endpoints and off-grid events, invalid inputs,
unit conversion, yield algebra, model/input snapshots and real UI-handler logic.
The map tests independently compare traced increments, adjacent state continuity,
continuous base washout, final summaries, main-app records and worker replies.

High-feed 36-hour E. coli example (five times the example's feed/pump settings):

| Internal interval | Final biomass (gDCW/L) |
|---|---:|
| 0.005 h | 94.5452 |
| 0.002 h | 94.7506 |
| 0.001 h | 94.8190 |

The coarse/fine difference is about 0.29% for this case. This is a numerical
refinement check, not an experimental validation or a guarantee for every scenario.
The original 12-case golden baseline and old engine are preserved separately;
the historical audit evidence has not been regenerated to hide the old defects.

All ten test suites passed after the repairs. Browser checks confirmed complete
fungal-to-E. coli preset switching, explicit OD-calibration validation, the
36-hour result and balance readouts, stale-result invalidation, export-button
availability, reset vessel identity, and live pH-slider/node-equation updates.
Save/export reject invalid numeric scenarios; imported model-version notices
survive loading, and unlinked imported vessel names remain intact.

## Still outside scope

F08's independent nitrogen/phosphate/amino-acid limitations and F09's animal-cell
viability, lactate/ammonia, yeast ethanol/diauxic growth and fungal morphology
require additional models and calibration data. Carbon identity is still lumped
into glucose equivalents. F10's true PID/feed feedback and F15's reactor-specific
calibration and fill-dependent equipment envelopes have not been implemented.
The new warnings and explanations do not substitute for those future models.

See [the model guide](simulation.html), [biology evidence](biology/) and the
[historical audit](../audits/2026-09-13/REPORT.md) for context.
