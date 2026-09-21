# Batch and fed-batch model review

Reviewed 12 September 2026. Scope: the currently shipped simulator, with emphasis on the reported 36-hour E. coli run in a 10 L Rushton vessel, starting at 1.5 L and ending at 1.659 L with 0.15 g DCW. This is a review, not a model correction. No application source, preset, or payload was changed.

## Main conclusion

The reported result is reproducible through incompatible settings retained when changing organism presets. It is not evidence that E. coli normally produces only 0.15 g dry biomass in 36 hours. There are also independent numerical and physiological limitations that must be addressed before treating the simulator as quantitatively predictive.

The user confirmed the retained fungal settings after the reconstruction was presented. This confirms the configuration cause of the reported near-zero growth. The exact exported scenario was not available in the connected browser, so unreported equipment details still use the generic 10 L Rushton assumptions rather than a verified copy of every field.

## 1. High priority: organism changes retain incompatible process settings

Selecting generalized A. niger sets temperature 30 °C, pH 3.0, inoculum 0.1 gDCW/L, feed start 12 h, feed growth exponent 0.12 h⁻¹, a fungal medium/feed, and a secreted product. Subsequently selecting E. coli BL21 updates its biological parameters but does not reset these settings: BL21 lacks the corresponding recommended process, medium, feed, and product entries. The same transition is possible for generalized E. coli.

I executed the actual preset-switch handler with rendering disabled and confirmed that the E. coli optimum becomes pH 7 while the process remains at pH 3. The strain-specific A. niger preset instead leaves pH 4.5; that also almost completely suppresses growth under this model.

With the run duration set to 36 h and other equipment assumptions taken from the generic 10 L Rushton preset:

| Reconstruction | Final volume | Total dry biomass | Dry biomass concentration |
|---|---:|---:|---:|
| Generalized fungal settings retained, pH 3 | 1.65912 L | 0.15000 g | 0.09041 gDCW/L |
| Same settings; **only pH changed to 7** | 1.66404 L | 43.54666 g | 26.16924 gDCW/L |
| Strain-specific fungal settings retained, pH 4.5 | 1.65912 L | 0.15028 g | 0.09058 gDCW/L |

These are outputs of the existing model, not validated experimental predictions. The pH-only comparison retains the fungal medium/feed deliberately to isolate the mathematical cause; it is not a recommended E. coli recipe.

The model multiplies growth by `exp(-((pH - optimum)/0.85)^2)`. For E. coli at pH 3 this factor is approximately 2.4 × 10⁻¹⁰. Biomass consequently remains at its initial mass: 0.1 g/L × 1.5 L = 0.15 g. Feeding continues and gives the reported volume. There is substantial residual substrate, not a shortage of feed carbon in this reconstruction.

The warning system detects deviation from the chosen pH setpoint, not whether the setpoint suits the organism. A perfectly controlled but incompatible pH therefore receives no organism/pH warning.

Recommended correction: provide consistent recommended settings for every preset and explicitly offer to apply compatible process/media/feed defaults when changing species. Preserve deliberate custom settings only with a visible compatibility warning. Report each growth-limiting factor separately.

Code: [preset switching](<tmp/app-source.js#L799>), [generalized fungal defaults](<tmp/app-source.js#L445>), [growth calculation](<tmp/app-source.js#L1484>).

## 2. High priority: oxygen/growth integration is time-step dependent

The model calculates growth from the previous dissolved oxygen concentration, then integrates oxygen using a fixed uptake rate over the step, and clips negative oxygen to zero. The uptake actually allowed by oxygen availability is not reconciled with the biomass already produced. This can produce artificial alternation between growing and oxygen-starved steps.

Controlled tests changed only the integration step:

| Integration step | Reference fed-batch: final gDCW/L | Fivefold initial/max feed: final gDCW/L |
|---|---:|---:|
| 0.100 h | 30.97 | — |
| 0.050 h | 34.53 | — |
| 0.020 h, demo default | 43.49 | 57.60 |
| 0.005 h | 43.50 | 67.24 |
| 0.002 h, smallest supported | 43.50 | 78.53 |

Reference: BL21, 1.5 L initially, 36 h, inoculum 0.039 gDCW/L, demo defined medium, glucose feed, recombinant product and controls. Fivefold feed is a numerical stress test, not an operating recommendation. The reference default step is adequate for its final biomass, but the high-feed case is not converged even at the smallest supported step. Diagnostic in-memory substeps below the supported minimum changed that case further; no such change was made to the application.

All these runs report 100% substrate balance closure. That check verifies bookkeeping, not numerical accuracy or physiological validity.

Recommended correction: integrate growth, uptake, and oxygen together with adaptive or validated substepping; enforce consistent oxygen availability; add time-step convergence tests for oxygen-limited conditions. Do not increase growth parameters just to compensate for this error.

Code: [time-step limit](<tmp/app-source.js#L1332>), [oxygen update](<tmp/app-source.js#L1549>).

## 3. Input units and validation need strengthening

The biomass input is **gDCW/L**, not OD600. There is no OD conversion. One BL21 study calibrated a conversion of 0.39 gDCW/L per OD600 unit; under that calibration, OD600 = 0.1 means 0.039 gDCW/L, or 0.0585 g in 1.5 L. This is a study-specific calibration, not a universal factor. [Abadli et al., 2020, section 6.5](https://orbi.umons.ac.be/bitstream/20.500.12907/37572/1/Abadli2020.pdf).

Entering 0.1 into the existing field therefore starts with more biomass than this OD-based estimate, so the conversion mismatch cannot itself explain the extremely low final growth.

Additionally, an empty numerical field is converted to zero because `Number('')` is zero. The fallback does not protect it. I confirmed that an empty field with a fallback of 37 returns zero, and that a scenario with pH 0 passes the model's error validation. HTML input limits are not enforced by the simulation handler.

Recommended correction: explicit OD600/gDCW/L input selection with an editable, sourced calibration; mandatory finite values and range checks; distinguish total gDCW, gDCW/L, and product mass throughout the results.

Code: [input label](<index.html:331>), [numeric conversion](<tmp/app-source.js#L771>), [validation](<tmp/app-source.js#L1230>).

## 4. Feed settings are not a biomass growth controller

The exponential feed is simply an initial absolute pump rate multiplied by an exponential and capped at the pump maximum. The field called target growth rate sets the exponent; it does not guarantee that growth rate. The initial rate is not calculated from biomass, yield, maintenance, or feed concentration, and changing reactor scale does not rescale it.

In the 36-hour reference test the pump supplies about 0.2993 L of 500 g/L glucose feed. Changing the initial broth volume from 1.5 to 6 L while retaining that feed gives 43.49 versus 17.47 gDCW/L. This difference is principally a substrate-per-volume difference, not an intrinsic disadvantage of the larger reactor.

A substrate-limited feed calculation should relate substrate demand to biomass mass and feed concentration; published mechanistic control formulations explicitly include biomass, volume, and substrate balances. [Abadli et al., 2020, equations 19–21](https://orbi.umons.ac.be/bitstream/20.500.12907/37572/1/Abadli2020.pdf).

Recommended correction: distinguish an arbitrary exponential pump schedule from a biomass-based growth-target schedule, explain pump clipping, and show cumulative carbon supplied and the corresponding yield-based biomass budget.

Code: [feed calculation](<tmp/app-source.js#L1292>).

## 5. Physiological balances remain illustrative

- Nitrogen, phosphate, and other nutrient pools do not constrain growth. Media differences mostly affect an assumed carbon-equivalent pool; carbon entries in units other than g/L are ignored rather than converted. Thus the model cannot validate media compatibility or nutrient sufficiency.
- Acetate is formed after biomass growth without allocating a separate substrate fraction to that pathway; acetate consumption adds biomass without corresponding oxygen uptake. This is not a consistent pathway balance.
- Product formation does not debit a substrate or energy requirement. A nonzero non-growth-associated production term can continue after carbon exhaustion. Conversely there is no biomass death or loss under prolonged starvation.
- Maintenance demand is multiplied by substrate saturation and falls to zero at zero substrate. Together with absent death, this can make long stationary phases misleading.
- Oxygen uptake retains a basal term even without growth or available substrate. Oxygen clipping can hide inconsistency between calculated demand and supply. The reported substrate closure is not carbon, nitrogen, or electron balance closure.
- The kLa correlation is generic. At 1.5 L in a nominal 10 L vessel, actual minimum working volume and impeller submergence need verification; the model assumes all specified impellers contribute power. A Rushton selection alone does not establish oxygen-transfer capacity.
- The DO controller needs a persistent setpoint error to increase actuation. At a 30% DO setpoint its oxygen-enrichment stage starts only below about 11.4% measured DO. This is not an integral controller holding DO at the setpoint.
- Default recombinant induction at 8 h changes temperature to 28 °C and applies a 0.72 burden factor. Together these reduce the modeled maximum growth rate to about 0.203 h⁻¹ before other limitations. This is a generic assumption, not a strain/construct-specific measured response, and does not explain the matching 0.15 g case.

Code: [substrate and product balances](<tmp/app-source.js#L1493>), [carbon pool](<tmp/app-source.js#L991>), [kLa estimate](<tmp/app-source.js#L1261>), [DO controller](<tmp/app-source.js#L1278>).

## Recommended order of work

1. Fix preset compatibility, missing-value handling, and OD/DCW input clarity; add a regression test for fungus → E. coli selection.
2. Correct the coupled oxygen/growth integration and demonstrate numerical convergence before fitting biology.
3. Introduce biomass-based feeding and explicit growth-limitation diagnostics.
4. Reconcile substrate, acetate, product, oxygen, and nutrient balances; calibrate against complete strain/construct-specific time courses, not just one final DCW value.

The basic use of biomass and substrate masses, volume-dependent concentrations, and mL/min-to-L/h conversion is sound. The reported extreme result has a reproducible configuration explanation, but correcting that alone will not validate the wider model.

## Reproducibility

The diagnostic script reads and decompresses the actual eight shipped payload files and asserts exact equality with the readable source before running tests. It also exercises the original preset-change handler with only rendering disabled. The existing biology-preset and generalized-profile checks pass, but they do not test numerical simulation accuracy.

Diagnostics: [review-fed-batch.cjs](<tmp/review-fed-batch.cjs>). Run from the project folder with `node tmp/review-fed-batch.cjs`. Diagnostic substep changes exist only in memory. No live scenario or production model was modified.
