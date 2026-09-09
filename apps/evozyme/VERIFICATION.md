# Evozyme 1.0.0 verification

9 September 2026. These checks establish software behavior on the stated fixtures; they do not validate an experimental assay or enzyme improvement.

## Numerical and record checks

26 Node tests cover workbook budget/capacity parity, coverage expectation and complete-coverage bounds, NNK loss accounting, missing quotes, fitting, all reference candidate decisions and numeric outputs, plate controls, row-order independence, duplicate/invalid identities, units, missing timepoints, increasing/decreasing signals, lower detector clipping, plate independence, CSV parsing/export, confirmation arithmetic, backup structure, linked rounds, and decision evidence requirements.

The 13 original Python tests also pass. Browser candidate rates, CVs, folds and plate quality metrics agree with saved Python outputs within 1e-10 absolute tolerance where numeric values are defined. The default budget is 160 primary clone slots, 144 expected usable clones, NOK 22,869 total, and NOK 158.8125 per expected usable clone. The 96-draw NNK example gives 19.420057 expected distinct targets, 97.100285% expected coverage, and approximately 42.005708%–95.254033% bounds on complete coverage.

The synthetic screen nominates C03 and C11, and flags C07, C19, C23 and C27. Independent confirmation arithmetic gives approximately 1.294702× and 1.016556× parent for C03 and C11 respectively; evidence checks remain incomplete in the example.

## Browser walkthrough

Tested in Microsoft Edge 152.0.4191.66 on Windows, including its Chromium rendering engine. Firefox, standalone Chrome, and Safari were not available for verification. Do not treat this as a cross-browser certification.

Checked all seven stages, field editing, save/reload, budget scenarios, synthetic example loading, candidate filtering and trace selection, backup export/restore with stable IDs, staged CSV import/cancel, invalid CSV rejection, preserved earlier analyses after reanalysis, confirmation import/edit, confirmation decision gates, linked next rounds, incompatible backup rejection, guide search/navigation, and desktop/mobile layouts. Mobile checks used a 390px viewport; 200% text enlargement was checked. Forms use visible labels, native controls, keyboard focus indicators, and table alternatives to plots. Native screen-reader announcement behavior has not been verified with a screen reader.

The tested browser flow generated same-origin GET requests for app resources only; no raw laboratory-data upload endpoint exists. Imported text is escaped in the interface. Derived CSV text fields neutralize formula prefixes; original raw CSV downloads remain unchanged. The generated printable two-round report contained six nonblank pages.

## Representative performance

Worker parsing/analysis of repeated synthetic plate fixtures on this machine:

| Plates | Observations | Combined input bytes | Worker round-trip |
| --- | --- | --- | --- |
| 1 | 672 | 43,130 | 18 ms |
| 25 | 16,800 | 1,021,826 | 76 ms |
| 100 | 67,200 | 4,080,251 | 238 ms |
| 250 | 168,000 | 10,197,101 | 522 ms |

Main-thread timer callbacks continued during analysis. These are local measurements, not performance guarantees. The screen-import cap is 10 MiB; a long-lived campaign can be larger because it retains raw files and multiple analysis snapshots. Backup restore is capped at 100 MiB and browser storage remains subject to browser quotas.

## Optional agent interface

Read-summary and navigate-stage tools are registered only if the browser provides `document.modelContext`. Registration and representative valid/invalid behavior passed a test shim using the documented interface. A native WebMCP-enabled browser context was unavailable, so native integration is unverified. Ordinary app functionality does not depend on it.

## Publication checks

The build checks module syntax and generated local handbook links. Publication includes the app and its listing together. Verify the live entry point, modules, worker, handbook, downloads, and full synthetic walkthrough after the website finishes publishing.
