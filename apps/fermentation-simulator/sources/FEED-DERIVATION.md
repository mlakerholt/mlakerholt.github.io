# Live feed derivations — UI build 2026-09-17.6

The main Feed strategy box now shows live recommendations and their substituted
equations. **Apply derived values** is the only operation that changes controls.
The no-feed preview uses the shared engine (currently 2026-09-17.6), including
the configured acid/base pH controls. No separate growth implementation is used.

## Calculation

1. A separate worker runs the selected scenario with nutrient feed disabled,
   using the shared engine's 0.001-hour interval, all organism/product parameters,
   vessel geometry, gas limits, initial volume, inoculum, medium and controls.
   The preview runs to the selected duration, with a 480-hour preview ceiling.
2. Suggested feed start is the first state with glucose-equivalent substrate
   `S <= max(0.1 g/L, growth-substrate threshold + Ks)`. This is a labeled
   carbon-low planning threshold, not a universal species-specific trigger.
   Initial biomass for feeding is the resulting **mass**, not inoculum
   concentration multiplied by an unrelated nominal vessel volume.
3. Start with the organism preset's growth target, or the disclosed heuristic
   `0.6*muMax` when the preset has no target. This is an explicit 60% planning
   heuristic, with no generic 0.16 h⁻¹ ceiling. Bound it by 80% of
   environmentally adjusted muMax, the no-overflow condition and respiratory
   capacity. Existing engine observed-yield maintenance correction is reused.
4. The carbon-demand estimate is `qS = mu/Yxs + ms + qP/Yps`, with
   `qP = alpha*mu + beta` when product is active at any point in the feeding
   horizon. Full maintenance/product allowances are conservative screening
   assumptions; the full engine includes substrate/oxygen dependence.
5. `F0 [mL/min] = qS [g/g/h] * M0 [g] / Sf [g/L] * 1000/60`.
   An exponential envelope uses `M=M0*exp(mu*t)` and
   `V=V0+F0[L/h]*expm1(mu*t)/mu`. A bounded search reduces mu to respect the
   finite pump maximum (when specified), a 10% reserve of available vessel
   headroom, and an 80% oxygen-transfer allowance. The oxygen check compares
   qO times the highest planned biomass concentration with the lowest transfer
   capacity across the volume range. qO follows the shared carbon/electron
   assumptions, without overflow or acetate reuse. Worst scheduled temperature
   is used for solubility; kinetic temperature/burden bounds and feed-start pH
   are held for this planning envelope.
6. Constant feed uses F0; linear feed uses its initial exponential tangent
   `slope=mu*F0`; DO-stat uses F0 as its on-rate and a disclosed trigger heuristic
   `min(100, DOsetpoint+15 percentage points)`. These profiles do not maintain
   constant mu. Their capacity display is an exponential envelope, not a
   predicted constant/linear/DO-stat trajectory.
7. Continuous mode instead recommends D, starts at zero, uses `F=D*V`, and
   checks steady carbon-limited `X=D*Sf/qS` against transfer, respiration and
   pump limits. Volume is held by matching outlet. Batch mode disables Apply.

Missing/invalid inputs, absent inoculum, no carbon in feed, a threshold not
reached in the preview, or infeasible capacity produce explanations rather than
fabricated recommendations. A recommendation never changes the pump maximum.
Actual acid/base addition, pH drift, changing yields, overflow, non-carbon nutrients,
cell viability and rheology can invalidate the envelope; use the full run and
measured process data to assess it. The headroom reserve is not an acid/base-volume
prediction. No manufacturer calibration is implied by a vessel name.
Working-volume headroom still constrains recommendations. It does not cap the
actual simulation: manually configured additions can exceed the limit, in which
case the run continues and reports the excess with a red warning.

The exponential feed control is labeled **Target specific growth rate, μset**.
The derivation panel displays current organism μmax, the current μset,
and the recommended rate/percentage and limiting constraint when available.
Immediate advisory warnings distinguish a target exceeding μmax from one
exceeding the condition-adjusted kinetic upper bound. A target above the
more conservative planning recommendation is identified separately; planning
margins are not presented as hard biological limits. Warnings do not overwrite
manual/imported values or block deliberately exploratory runs. Recommendations
still require Apply. Complete organism-preset changes use that preset's target,
or 60% of its μmax if absent. The explicit demo feed target remains 0.16 h⁻¹,
as a demo setting rather than a general recommendation or biological ceiling.

## Sources

- [Wenzel et al. (2011), maintenance-inclusive exponential feed equation](https://journals.asm.org/doi/10.1128/AEM.05219-11).
- [FedBatchDesigner, University of Vienna: product-inclusive substrate demand](https://chemnettools.anc.univie.ac.at/FedBatchDesigner/).
- [Sartorius W3110 application note: biomass/volume/yield-based exponential feeding](https://api.sartorius.com/document-hub/dam/download/202627/Evaluation-Biostat-STR-Microbial-Bioreactor-Application-Note-en-B.pdf).

Sources support equation structure, not the margins, thresholds, heuristics or
generic parameter values chosen here. Organism and vessel evidence remains in
their existing derivation sheets.

## Implementation and checks

- `../feed-derivation.js`: pure planning math and shared-engine batch estimator.
- `../feed-derivation-worker.js`: cancellable off-main-thread preview.
- `../feed-derivation-ui.js`: escaped readouts, current/recommended comparison,
  stale-result rejection and explicit Apply whitelist.
- `node sources/test-feed-derivation.cjs`: independent dimensional formulas,
  organism/volume/feed/transfer changes, finite capacity, modes, no-feed parity,
  zero/invalid cases and actual UI callbacks with controlled worker replies.
- `node sources/build-app.cjs`: rebuild the UI after readable source changes.

The other existing engine and UI suites remain applicable. The core fingerprint
is unchanged because no simulation equation was edited for this feature.
