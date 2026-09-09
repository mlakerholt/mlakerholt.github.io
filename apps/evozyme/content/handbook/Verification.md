# Verification record

[Handbook home](../Directed_Evolution_Handbook.md)

Edition 2 · 9 September 2026

## Completed checks

| Area | Check and result |
| --- | --- |
| Example analysis | Ran the supplied input through the program and generated the saved CSV, JSON, report and figure outputs. C03/C11 were nominated; C07/C19/C23/C27 were flagged as intended. |
| Automated tests | All 13 tests passed on Python 3.12.14. Coverage includes known slope, expected decisions, input-order invariance, duplicate/missing records, technical identities, stock references, decreasing signals and library statistics. |
| Coverage mathematics | Compared expectation/bounds against exact enumeration of a small sampling problem. Checked zero draws, impossible targets, certain targets and invalid probability inputs. |
| NNK calculation | Checked 20 amino-acid targets and total non-stop probability 31/32. At 96 draws, expected fraction 0.9710028541; completeness lower/upper bounds 0.4200570821/0.9525403327. |
| Workbook calculations | Recalculated formulas in Artifact Tool; scanned for spreadsheet formula errors. Default budget produced 160 primary slots, 144 expected usable clones and NOK 22,869. |
| Workbook input changes | Checked changes to plate count, zero/missing assay cost, invalid control capacity, zero draws, entirely off-target sampling, one uniform target and incomplete equipment quotes. Restored defaults before export. |
| Figures and workbook layout | Rendered and visually inspected all three sheets and the example quality figure. Plotting used Matplotlib 3.11.1. |
| Multiple-plate output | Exercised a two-plate input; both figures were generated and correctly linked from the report. |
| Export and navigation | Checked 87 formulas in the exported workbook with no stored error cells; checked 71 local document links with none broken. |
| Content consistency | Linked the chapters, templates, worked examples, analysis and planners; distinguished the 32-candidate teaching layout from the 40-clone capacity example. |

The [toolkit instructions](../toolkit/README.md) provide commands to repeat the software checks and describe supported inputs and limits.

## What remains application-specific

No biochemical experiment, instrument acceptance test, sequence verification or physical-stock recovery was performed. The three enzyme workflows are proposed adaptations grounded in cited research. The first has synthetic demonstration data; the other two explain the required changes in measurement and confirmation.

The workbook was not opened or recalculated in native Excel or LibreOffice. Check its documented default outputs in the intended application before relying on edited inputs. Equipment prices are blank pending local quotations; recurring cost values are assumptions, not current market estimates.

The program is a teaching primary-screen workflow. It does not establish active-enzyme normalization, detector calibration, product identity, statistical significance, or assay suitability. Set quality and retest rules from the actual parent assay and pilot. Documented model limitations are part of interpreting its output.
