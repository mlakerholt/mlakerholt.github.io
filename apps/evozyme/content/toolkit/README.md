# Evozyme companion toolkit

[Handbook home](../Directed_Evolution_Handbook.md)

This toolkit provides editable records, a planning workbook, and a runnable primary-screen example. **All example measurements, clone IDs, stock locations and confirmation results are synthetic.** Budget inputs are teaching assumptions. No sequences or experimentally validated enzyme improvements are supplied.

## Start without installing software

Open the [saved screening report](example/results/report.md), [worked examples](../handbook/04_Worked_Examples.md), and [planning workbook](../outputs/01a084fa-2400-76c2-b42b-dfc42ca3fbad/Evozyme_Planners.xlsx). Copy the [campaign brief](templates/Campaign_Brief.md) into a new campaign folder. The example report includes the actual output from running the supplied program.

## Run the example

Use Python 3.10 or newer. The calculation core uses its standard library. Matplotlib is required only to regenerate figures. Tested versions: Python 3.12.14 and Matplotlib 3.11.1 on Windows. The commands below assume the working folder contains the handbook and `toolkit` directory.

Create an isolated environment and install plotting support on Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r toolkit/requirements.txt
.\.venv\Scripts\python.exe toolkit/evozyme.py analyze --input toolkit/example --output toolkit/example/results_local
```

On macOS/Linux, the environment interpreter is `.venv/bin/python`. To run without installing plotting packages:

```text
python toolkit/evozyme.py analyze --input toolkit/example --output toolkit/example/results_local --no-plots
```

Outputs go into a separate folder. Existing files of the same output names are replaced; use a new run-specific output directory to preserve prior analyses. The program does not modify its input files.

Expected result: plate `DEMO01` passes the example control rules; **C03 and C11** are nominated for independent retesting. **C07, C19, C23 and C27** require measurement review. A nomination is not a confirmed enzyme improvement.

## Files and identifiers

| Input | Purpose and required structure |
| --- | --- |
| [plate_map.csv](templates/plate_map.csv) | One row per plate/well. `sample_type` is `candidate`, `parent`, `blank` or `host`. Use well coordinates A01–H12. |
| [clone_register.csv](templates/clone_register.csv) | One row per clone ID, including parent/round, sequence status/file and stock location. |
| [measurements.csv](templates/measurements.csv) | One row per run/plate/well/time. `time_s` is seconds; `signal` is a finite number; units must match the assay settings. |
| [assay.json](example/assay.json) | Machine-readable analysis settings. Copy and validate for a new assay; retain a version with the run. |
| [assay_record.csv](templates/assay_record.csv) | Human-readable experimental conditions and provenance. Retain alongside the settings; the program does not parse this file. |
| [confirmation.csv](example/confirmation.csv) | Separate illustrative intended-product measurements. Not processed by the primary-screen program. |

Preserve the column headers. Use UTF-8 CSV and a decimal point for numeric data. The map and register must resolve every candidate and parent to a nonempty stock location. Preparation IDs distinguish independent preparations; technical-replicate IDs distinguish repeated wells within each preparation. The example uses invented locations beginning `DEMO_ONLY`; replace these with real recoverable locations for laboratory work.

The program rejects duplicate map positions, clone IDs, technical-replicate IDs and observations; unrecognized coordinates; unmapped observations; and run/assay/unit mismatches. It verifies that a stock-location field exists, not that a physical stock is viable or a sequence is correct. Those checks remain part of campaign review.

## Analysis settings

| Setting | Meaning in this program |
| --- | --- |
| `run_id`, `assay_id`, `data_origin`, `signal_unit` | Identity, provenance and measurement units. |
| `signal_direction` | +1 for increasing signal, −1 for decreasing signal. |
| `fit_times_s` | Exact timepoints expected in every fitted well; at least three distinct nonnegative times. Extra observations are retained in the input but excluded from fitting. |
| `signal_ceiling` | Upper detector limit; any fitted observation at or above it is flagged. This is a configured assumption, not a detector calibration. |
| `minimum_r2` | Fit-quality threshold for parent/candidate traces. Blanks and host controls may be nearly flat and are not held to this rule. |
| `maximum_parent_cv` | CV limit across valid independent parent-preparation means. |
| `maximum_technical_cv` | CV limit within a preparation. |
| `maximum_host_fraction` | Largest allowed mean blank-corrected host rate as a fraction of the parent mean. |
| `minimum_blank_wells`, `minimum_host_wells` | Minimum valid control wells per plate. |
| `minimum_parent_preparations` | Minimum independent parent preparations per plate; use at least two for a between-preparation CV. |
| `minimum_technical_wells` | Minimum valid wells per parent/candidate preparation. |
| `minimum_fold_for_retest` | Fold increase nominating an otherwise valid candidate for retesting. |

Use positive integer replicate/control counts, finite times and thresholds, and assay-justified values. Controls should be appropriate to the actual sample matrix. This example uses one plate-level reagent-blank correction plus a host-background acceptance rule; it does not automatically model well-specific or clone-specific backgrounds.

## What the calculations do

1. Join observations to the map and register, checking identity.
2. Fit a straight line over the configured times. Missing times prevent a partial fit from qualifying as a hit.
3. Flag high signal and poor parent/candidate fits. Subtract the mean valid blank slope and apply the reaction sign.
4. Average technical parent wells within each preparation, then calculate the plate's parent mean and variation.
5. Check control counts, failed control measurements, parent variation and host background. A failed plate cannot nominate candidates.
6. Check candidate measurement quality and technical agreement. Only unflagged candidates receive a fold-change value and decision.
7. Save well-level results, quality information, candidate decisions and optional figures.

| Output | Interpretation |
| --- | --- |
| `well_results.csv` | Raw slopes, R², corrected rates, identities and measurement flags. |
| `candidates.csv` | One candidate preparation per plate, technical CV, valid fold change, decision and stock reference. |
| `quality.json` | Copied settings/provenance, per-plate control metrics and failure reasons. |
| `report.md` | Human-readable control summary, retest candidates, flagged measurements and figures. |
| `quality_plots.png` | Single-plate heatmap, control-well values and selected traces; multiple plates receive numbered image files. |

Rates are signal units/minute. Technical wells do not establish between-culture reproducibility. Descriptive Z′ uses parent-preparation means and host-control wells; it is not used as a discovery threshold. Figures show raw individual control wells, while parent CV uses preparation means.

## Boundaries when adapting

The example supports 96-well primary screens with one preparation per candidate per plate. It evaluates multiple plates independently and does not pool repeated candidates across plates. It does not estimate kinetic constants, active-enzyme concentration, statistical significance, sequence coverage from observed reads, or corrected rankings across different assays.

It does not automatically correct evaporation, read-order bias, lower detector clipping, path length, reporter stoichiometry, matrix interference or nonlinear kinetics. Inspect these during validation. Falling signals are supported by the sign convention, but a lower detection limit needs an additional assay-specific check. The illustrative threshold values must be replaced before interpreting laboratory data.

The confirmation file deliberately uses independent product measurements to show a changed ranking: C03 averages 1.295× parent; C11 averages 1.017× parent. These arithmetic ratios are presented in the worked example, without a significance claim. Sequence verification, actual product identity and secondary-property checks have not been performed on these invented samples.

## Coverage calculation

```text
python toolkit/evozyme.py coverage --probabilities toolkit/example/nnk_probabilities.csv --draws 96
```

Expected output: 20 target amino acids, 19.420 expected distinct targets, 97.100% expected coverage, and a probability-of-complete-coverage lower/upper bound of 42.006%/95.254%. The bounds are not an exact completeness probability.

For a custom library, fill [probabilities.csv](templates/probabilities.csv). Each row gives a distinct target and its probability per independent draw. Probabilities must be finite, between zero and one, and sum to at most one. Omitted probability mass represents off-target material. Zero-probability targets cannot be observed. Draws must be a nonnegative integer.

The [library chapter](../handbook/02_Libraries_and_Expression.md) explains the assumptions. For combinatorial libraries, enumerate joint variants and probabilities; the calculator does not infer them. Repeated measurements from a single clone are not additional draws.

## Use the workbook

Yellow cells are editable inputs. Blue numeric text identifies input values. Formula cells calculate outputs. Keep a fresh copy before editing.

- **Round budget:** enter primary/repeat plates, controls, technical/preparation replication, usable fraction, confirmation workload and recurring costs. Example output: 160 primary sample slots, 144 expected usable clones, NOK 22,869 total and NOK 158.81 per usable clone.
- **Coverage:** compare uniform targets with an ideal one-site NNK library. The NNK table includes all 20 amino acids and already accounts for TAG stop. Additional off-target loss must exclude that built-in loss. The required-draw outputs apply to the uniform model only.
- **Equipment quotes:** assign each capability to existing/shared access or purchase. Enter quantity, dated price and source/exclusions for purchases. Missing quotes remain unavailable and block a misleading complete total. Shared operating charges belong in the round budget.

The operating budget assumes routine laboratory infrastructure is available. Add missing capabilities and control-preparation expenses to your actual budget. Its full-plate assay cost is conservative when some wells are unused. Confirmation costs are an allowance, not a demonstrated analytical quote. Include tax, shipping and service charges consistently; the workbook does not estimate them automatically.

Formula recalculation and representative input changes were tested in the authoring engine. Native Excel and LibreOffice were not tested. When opening in your spreadsheet application, recalculate and check the default outputs above before relying on edited values. [Verification record](../handbook/Verification.md)

## Recordkeeping, backup and tests

Use a campaign folder with separate `raw`, `maps`, `sequences`, `analysis` and `reports` subfolders. Keep original exports unchanged. Save the exact analysis settings and software version alongside derived output. Record protocol/instrument versions in the assay record. Copy raw data, sequences and stock registers to a second managed location; test restoration by regenerating a report in a separate folder.

Run the supplied checks with:

```text
python -m unittest discover -s toolkit/tests -v
```

The 13 tests exercise expected candidate decisions, missing/duplicate data, recovery identifiers, row ordering, signal direction, fitting and coverage bounds. They do not replace instrument acceptance or biochemical validation.

Use the [equipment acceptance record](templates/Equipment_Acceptance.md) when arranging access, and the [round review](templates/Round_Review.md) to decide which confirmed variants and conditions enter the next round.
