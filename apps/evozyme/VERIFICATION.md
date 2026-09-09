# Evozyme 1.2.0 verification

9 September 2026. This verifies software behaviour on synthetic fixtures, not an experimental assay or enzyme improvement.

## Release checks

- All 41 JavaScript tests pass, including the original 26 and regression coverage for reference identity, exact-settings acknowledgement, migration, capacity consistency, generic long/wide conversion, minute/decimal conversion, missing preset columns, map editing, recipe replay, backup provenance and compatible confirmation targets.
- All 14 Python reference checks pass. Valid fixture numerical results retain parity; synthetic C03 and C11 are nominated.
- The isolated browser storage harness passes all five checks: blocked legacy upgrade with archived record, atomic competing saves, separate recovery drafts, imported revision rejection, and closure on a newer database version.
- Build passes: 14 handbook sections, browser module syntax, overview/home/planner and guide local file links. Runtime architecture and existing GitHub Pages hosting are preserved.

## Browser walkthrough, Codex browser on Windows

Verified live quote and quantity totals (12,345 then 24,690 NOK), missing quote handling, visible two-tab conflict and recovery as a separate campaign. Both saved versions remained listed. The six-parent-preparation case invalidated the settings acknowledgement and proposed 20 control wells, 152 primary clone slots, and a round cost of 22,649 NOK from the original 160 slots and 22,869 NOK.

Completed toolkit long-file and wide-minute imports through role/column confirmation, map preview, control checks, explicit configuration review and retained analysis. Three snapshots remained accessible after reload. The wide screen retained the expected 1.463× and 1.359× screening folds. An intentionally incorrect parent at DEMO01/A02 was rejected at that coordinate, then corrected in the map editor. A mapping preset saved, and the raw-input dialog separately listed original exports, recipe and canonical inputs.

A changed settings file displayed a 1.5 nomination threshold and required a new acknowledgement; cancelling left all three existing analyses intact. A synthetic version-one backup restored as a new campaign while the source campaign stayed listed. Its historical result retained engine 1.0.0 and an explicit warning that current identity/review checks were not retroactively applied. Current mapped records and presets also survived save/reload validation.

Guided/complete views preserve entries. Expandable sections retain their state across field edits. Confirmation targets showed C03 meeting the recorded 1.2 ratio and C11 below it while analyst decisions remained separate. Desktop and 390px viewport setup/review displays were inspected; document width stayed within the viewport, with tables independently scrollable. Visible focus, form labels and stage/handbook navigation were checked. No browser console errors were recorded in the final walkthrough. This is not a multi-browser or screen-reader certification.

## Limits and recovery

Only generic supported CSV layouts and supplied synthetic data were tested; no reader-specific compatibility or user-pilot finding is claimed. The pilot kit is prepared, with participant sessions and representative exports still pending. External sequence, product and property evidence remains outside the JSON backup unless explicitly imported. A compatible app and a known-good backup are the recovery path; reverting code alone does not undo a database migration.

The earlier numerical/performance record below remains useful context; version-specific walkthrough claims apply to the version identified.

# Evozyme 1.1.0 verification

9 September 2026. 32 JavaScript tests and 14 Python checks pass, retaining numerical fixture parity. Five isolated browser storage checks pass: blocked legacy upgrade/archive, concurrent saves, draft isolation, imported revision rejection and version-change closure. Visible two-tab conflict recovery and immediate quote/quantity totals were checked in the Codex browser. Scientific and cross-browser limitations below still apply.

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

Read-summary and navigate-stage tools are registered only if the browser provides `document.modelContext`. Registration and representative valid/invalid behavior passed a test shim, then passed native calls in the Codex in-app browser on the published site. Both invalid inputs were rejected; read-back confirmed unchanged campaign values, and valid navigation updated the visible stage. Ordinary app functionality does not depend on this optional interface.

## Publication checks

GitHub Pages successfully published application release `5224a4053877cdd0d4f97ec709977fa599a608ea`. All 57 release files were checked against their uploaded Git blob hashes. The live app, modules, worker, guide, PowerPoint, workbook, templates, Python download, and release notes returned HTTP 200. The Apps listing contains the Evozyme entry. Both browser walkthroughs passed again against the public URL, including imports, backups, reanalysis, confirmation, linked rounds and reports. Native in-app-browser navigation and the skip link were also verified; the initial form had no unlabeled fields.

## Process overview update

The default-entry follow-up was checked in the in-app browser: opening the app shows the overview, “Open the planner” opens Campaign, the planner's overview link returns home, the old `/#screen` route opens Screen, and the handbook's return link opens the planner. No browser errors were reported. The static homepage is generated from the same overview source, and planner storage remains on the same origin and database.

The graphical Plan → Test → Learn page was checked in the Codex in-app browser at desktop width and a 390px viewport. The diagram switches to one column with downward connectors, retains the next-round return path, and has no horizontal page overflow at the tested narrow width. All seven numbered links opened their corresponding selected app stage; each app stage returned to the overview. The handbook entry and return link were also checked. No browser errors were reported during this walkthrough. The build checks local links in the planner, overview and generated handbook; all 26 existing Node tests passed after integration. The overview uses semantic HTML and CSS without a script dependency. Its named landscape print rules are scoped to the overview; print output was not visually verified in this update.
