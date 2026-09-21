# Literature benchmark: E. coli W3110 / Biostat STR Microbial 50 L

16 September 2026 · Engine 2026-09-13.2 · No production-model changes or fitted biological parameters

## Verdict

**The current app does not accurately reproduce this published process under the documented reconstruction assumptions.** Its existing reactor geometry and W3110 kinetics predict **42.3 gDCW/L**, versus approximately **80 gDCW/L** reported. Substituting the reported maximum oxygen-transfer coefficient improves the endpoint to **70.3 gDCW/L**, but does not reproduce glucose depletion, growth rate, acetate or base consumption. Endpoint agreement alone would therefore be misleading.

This is a **partial literature-reproduction test**, not an independent experimental validation. It executes the same `simulation-core.js` that the app loads, without modifying that engine. It was run directly through the calculation engine, not through the browser interface.

## Source and preset match

Schulze, Leupold, Husemann and Rupprecht, *Evaluation of the Biostat STR Microbial Bioreactor in a High Cell Density E. coli Exponential Fed-Batch Cultivation*, Sartorius application note, printed September 2022. [Publisher PDF](https://www.sartorius.co.kr/wp-content/uploads/2023/07/evaluation-biostat-str-microbial-bioreactor-application-note-1-data.pdf).

The organism matches `ecoli-w3110`; the reactor family matches `sartorius-str-microbial-50`. The tested bag was a prototype with **two** disk impellers; the app assumes **three**, so both were tested. This does not establish that every commercial version has two impellers.

Reported operating inputs: 24 L starting volume, OD600 1, 37 °C, pH 6.8, DO target 35%, 20 g/L initial glucose, 655.3 g/L feed glucose, exponential feed exponent 0.15/h, feeding from 5.3 h. Equation 1 gives an initial feed of **2.2158 mL/min**; its yield constant sets the feed schedule, not the simulator's biological yield. Methods and feeding are on PDF pp. 3-5; outcomes on pp. 7-9.

## Quantitative comparison

All simulated columns use the reported process inputs and unchanged W3110 biology. The measured-kLa column uses two impellers. Values are rounded; full precision is retained in `results.json`.

| Quantity | Published | Existing catalog geometry | Two-impeller variant | Fixed measured maximum kLa |
|---|---:|---:|---:|---:|
| Final biomass, gDCW/L | ~80 | **42.3** | **36.6** | **70.3** |
| Biomass endpoint difference | — | −47.1% | −54.3% | −12.1% |
| Maximum batch growth rate, /h | ~0.70 | 0.469 | 0.465 | 0.479 |
| Glucose at 5.3 h, g/L | Depleted | 13.79 | 13.95 | 12.37 |
| Final acetate, g/L | ~5 | 0.63 | 0.55 | Effectively zero |
| Cumulative base, L | 4.4 | 0.081 | 0.070 | 0.101 |

The endpoint is evaluated at **19 h**, approximately read from Figure 6, not an exact tabulated sample time. Its last DCW point appears closer to 85 g/L than the narrative's 80; the table uses the narrative, without inventing precision or replicate error bars. Simulated growth maxima are from the app's 0.1 h output records.

Diagnostic criteria were ±20% for biomass and batch growth, and <0.1 g/L glucose at the reported depletion time. These are screening bands, not statistical confidence intervals. The measured-kLa case passes only the biomass criterion; neither catalog-based case passes any of the three.

## What the test reveals

1. **The reactor transfer estimate is much too low for this published configuration.** At the characterization condition (40 L, 500 rpm, 1.5 vvm), the app calculates kLa **72.7/h**, against **680/h** measured: a 9.4-fold discrepancy. Two impellers with the same assumed dimensions lower the prediction to 60.5/h. The app's dimensions, power number and correlation are assumptions here, not calibrated manufacturer performance. Do not “repair” this by applying a universal multiplier to all reactors.

2. **A nominal maximum growth-rate setting is not the effective growth rate.** W3110 starts with μmax=0.60/h. Oxygen and pH factors, acetate inhibition and the overflow partition reduce the achieved rate further. Even with high measured kLa it reaches only about 0.48/h in the logged batch phase. At 5.3 h it consequently still has considerable glucose. Feeding at the paper's clock time then overfeeds an already different biological state. The specified feed-start time is an input, not a successful prediction. A separate no-feed diagnostic reaches <0.1 g/L glucose only around 8.5 h with catalog transfer.

3. **Control and metabolite outputs are not quantitatively reproduced.** The app uses a proportional DO cascade with persistent offset, rather than the source's PID control. Its average predicted DO from 6-19 h is only 2.6% in the catalog case and 17.9% in the measured-kLa case. It also lacks a nitrogen/charge balance: base demand comes from a small empirical growth-acidity term plus net acetate. In the high-transfer run, acetate disappears and its reuse temporarily raises pH despite “controlled” mode, which only adds base. These simplified equations cannot validate ammonia consumption or this acetate trajectory.

The apparent improvement to 70.3 g/L is also helped by **underpredicted dilution**: simulated final volume is 30.13 L. Using the same reconstructed feed volume plus the reported base, bolus and antifoam would give roughly 34.9 L before sampling/evaporation. This is an accounting illustration, not a measured final volume or a corrected simulation.

## Assumptions and limits

- Initial biomass is assumed to be **0.30 gDCW/L per OD unit**, not a measured inoculum calibration.
- Only the explicitly specified glucose is represented. The modified medium and second feed are not fully defined in the note. The bolus, antifoam and withdrawals are not replayed. Missing carbon or nutrients can contribute to the discrepancy; it cannot all be assigned to model error.
- The app accepts vvm, whereas the source specifies a gas-flow cascade in L/min. The baseline matches its range at the starting volume but becomes too generous later, reaching about 75 L/min. The alternative 1.5-vvm ceiling gives 36.0 gDCW/L, not a recovery of the result.
- Atmospheric pressure, initial DO 100%, a generic buffer and nonlimiting pump capacities are assumptions. Ammonia is approximated as 11 N; testing 10-12 N does not materially alter biomass.
- Fixed kLa=680/h is a **diagnostic substitution of a measured maximum**, not a reproduced time-varying transfer curve. No μmax, yield, maintenance or overflow parameters were fitted.
- The source is a manufacturer experiment, not an independent peer-reviewed validation. It lacks raw time-series/replicate uncertainty. Table 2's yield unit is dimensionally inconsistent; the feeding calculation interprets it as g/g.

## Robustness checks

Reducing the internal step from 0.005 to 0.001 h changes catalog-case biomass by **0.05%**, far smaller than the literature mismatch. Changing the OD conversion from 0.25 to 0.50 gives **41.0-46.1 gDCW/L**. Choosing an endpoint from 18.7 to 19.2 h gives **41.6-42.8 gDCW/L**. These are one-at-a-time sensitivities, not a comprehensive uncertainty interval.

Carbon, oxygen and acid bookkeeping close to numerical precision. The existing model-repair and simulation-map test suites pass. These establish internal consistency, **not experimental accuracy**.

## Reproduce and inspect

Use **Import scenario** in the app and select one of:

- `scenario-preset.json`: current catalog geometry, with reported operating settings.
- `scenario-two-impellers.json`: reported impeller count, remaining dimensions unchanged.
- `scenario-measured-kla.json`: diagnostic fixed-kLa case; not a validated new preset.

The engine-level JSON round trip was verified. No browser-import test was performed. Import changes the current form values; export your own scenario first if you want to retain it.

To regenerate the comparison from the project directory:

```text
node benchmarks/w3110-str50-2022/run.cjs
```

`evidence.json` records input provenance; `results.json` contains comparisons, sensitivities and source/engine hashes; `trajectory-*.json` stores output records; `diagnostic-traces.json` records representative calculation steps. `source.pdf` is the unchanged source document.

For a defensible calibration/validation exercise, obtain the full recipes, OD/DCW calibration, exact bag geometry, gas/feed/base histories and raw replicate data. Calibrate on one run, then test biomass, substrate, acetate, DO and addition volumes together on a separate run.
