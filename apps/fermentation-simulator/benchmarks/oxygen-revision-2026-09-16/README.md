# DO control and oxygen-transfer revision — 16 September 2026

Engine: `2026-09-16.1`. This is a controlled implementation comparison, **not a validation of the full fermentation model**.

## What changed

- Stateful PI DO control, with retained integral output, conditional-integration anti-windup and a sequential agitation → airflow → oxygen-enrichment cascade. Actuators with no available range are skipped. At zero error, the required output is retained rather than resetting to minimum settings.
- Editable engineering defaults: gain 0.5 (output fraction per DO fraction), integral time 120 s, sensor time constant 15 s, actuator time constant 10 s. The previous sensor/actuator constants were 432/216 s. Gain 1 was rejected during refinement because it oscillated at the smaller step; gain 0.5 passed finer-step and independent demand-step checks. No biological parameters were fitted.
- Van’t Riet's coalescing, low-viscosity stirred-tank transfer correlation replaces the undocumented `65 × (W/L)^0.45 × vvm^0.4` approximation and equipment multipliers. The new expression is `kLa [h⁻¹] = 3600 × 0.026 × (Pg/V [W/m³])^0.4 × Ug [m/s]^0.5`. The old coefficient's units were implicit; this was not a demonstrated 1000-fold unit-conversion bug.
- `Ug = (vvm × V_m³ / 60) / (π D_tank² / 4)`. Gassed power equals calculated shaft power times an editable gassed/ungassed power ratio. Ratio 1 is an explicitly unmeasured proxy, not a manufacturer property. A ratio of 0.7 is included as a sensitivity case, not a fitted value.
- Calculated kLa has no arbitrary upper clipping. The optional fixed measured-kLa override remains available and unchanged. Inlet oxygen, the conservative coupled substrate/oxygen solve, air-referenced DO, respiratory capacity, biology, feed schedule, product and pH equations are unchanged.
- Internal intervals now cap at 0.001 h (3.6 s) to resolve the faster loop. Existing feed/induction/end-event splitting is retained.
- Main form, scenario import/export, guide, worker and interactive calculation map share the new engine and expose controller memory and transfer inputs. Older scenarios get explicit defaults in result provenance without changing their supplied biology/feed inputs.

## Controlled comparison

`run.cjs` uses the exact saved W3110 / STR Microbial 50 L scenario from `../w3110-str50-2022/scenario-preset.json`. All four variants use the **same 0.001 h interval**, initial conditions, biology, medium, feed, geometry and equipment limits. The two legacy combinations exist only in this diagnostic harness. The archived old engine's SHA-256 must match the original benchmark before it can run.

| Variant | Final biomass, gDCW/L | Mean DO, 6–19 h (% air saturation) | Final glucose, g/L |
|---|---:|---:|---:|
| Original controller + original transfer | 42.342 | 2.631 | 58.838 |
| Revised controller only | 47.401 | 7.541 | 46.966 |
| Revised transfer only | 69.287 | 6.731 | 2.865 |
| Both revised | 69.681 | 31.619 | 1.016 |

DO means are arithmetic means of approximately 0.1-hour records, including interval endpoints; they are not experimental measurements. The historical original run at 0.005 h produced 42.321 gDCW/L. Using a common smaller interval prevents the new integration cap from being mistaken for a controller or transfer effect. All four cases receive exactly 6.032488 L feed at the common step. Different base additions and final volumes are consequences of the changed trajectory, not changed inputs.

**Interpretation:** increased calculated transfer accounts for most of the biomass gain in this reconstruction. Controller repair is important for DO tracking: transfer correction alone still runs far below the target. With both revisions, mean DO over 6–16 h is 34.816% against a 35% target. The final 1.719 h has the cascade at its limits below target; final DO is 0.945%. The revision does not conceal the remaining late-stage capacity shortfall.

## Transfer characterization and remaining discrepancy

At 40 L, 500 rpm and 1.5 vvm, the retained three-impeller app geometry calculates 38.065 W shaft power. Old kLa was 72.665 h⁻¹; revised kLa is 201.922 h⁻¹ with power ratio 1. The publication reports **680 h⁻¹** for its tested equipment. The correlation is more defensible and gives higher transfer here, but does **not** reproduce that measured performance. It must not be treated as universally calibrated for the catalogue.

The source tested two impellers, whereas the historical app preset used three; this discrepancy is deliberately not silently changed in the factorial comparison. With two impellers the revised fermentation gives 67.435 gDCW/L. At power ratio 0.7 with the retained three impellers, it gives 67.783 gDCW/L. These illustrate sensitivity to equipment assumptions.

Fixed measured kLa = 680 h⁻¹ (two impellers) with the new controller gives 70.176 gDCW/L and final DO 34.867%. This is a high-transfer diagnostic, **not** a replay of a measured, time-varying kLa trajectory. Its endpoint remains below the reported approximately 80 gDCW/L; therefore oxygen correction alone cannot establish full agreement.

The original reconstruction's limitations remain: incomplete medium and second-feed recipe; assumed OD-to-DCW factor; vvm rather than fixed-L/min gas limits; approximate endpoint timing; uncalibrated geometry and power; no ammonia nitrogen balance. Base use (~0.116 L versus reported 4.4 L), acetate (~0 versus reported 5 g/L), batch growth and substrate-exhaustion timing are not repaired by this narrowly scoped change. See the preserved original benchmark's README and evidence.json. Do not describe the simulator as experimentally validated.

## Verification and reproduction

Run `node benchmarks/oxygen-revision-2026-09-16/run.cjs` from the project root. This writes only the revision directory's results and four trajectories. The original benchmark artifacts remain untouched. `results.json` contains model hashes, exact inputs, all comparison metrics, checkpoints and sensitivity runs.

- Quartering the step (3.6 → 0.9 s) changes final biomass from 69.680610 to 69.683162 gDCW/L (~0.0037%), mean DO over 6–16 h by 0.0017 percentage point, and time below half the target by 2.7 seconds.
- Carbon residuals in the four matched-step cases are below 7 × 10⁻¹² g; oxygen residuals are below 3 × 10⁻¹⁰ mmol.
- `sources/test-oxygen-revision.cjs` checks independent dimensional arithmetic, power/flow/diameter scaling, no-flow behavior, fixed overrides, integral retention, anti-windup recovery, skipped stages, independent fixed-demand and nonlinear three-stage oxygen plants at refined intervals, validation, imported defaults and inlet-oxygen conservation.
- Existing suites cover material balances, 12 scenario trajectories, map/engine parity and exact state chaining, event splitting, UI import/export, guide fingerprint, historical goldens, biology presets and 71 reactor records.
- UI inspection checks the new tuning fields and interactive map readouts. These tests establish implementation consistency and representative numerical behavior, not accuracy for every reactor/organism or every selectable tuning combination.

## Sources

- [Van’t Riet (1979), review of gas–liquid mass transfer in stirred vessels](https://doi.org/10.1021/i260071a001).
- [BioSTEAM source documentation](https://biosteam.readthedocs.io/en/latest/_modules/biosteam/units/design_tools/aeration.html#kLa_stirred_Riet): explicit Van’t Riet coefficients `(0.026, 0.4, 0.5)`, gassed power W, liquid volume m³, superficial velocity m/s, output s⁻¹. Its function's default coefficient set is different; it is not used here.
- [Sartorius experimental application note: Evaluation of the Biostat STR Microbial Bioreactor](https://api.sartorius.com/document-hub/dam/download/202627/Evaluation-Biostat-STR-Microbial-Bioreactor-Application-Note-en-B.pdf). Manufacturer experiment, not independent validation. Original PDF and extracted evidence remain in `../w3110-str50-2022/`.
