# Using Evozyme: from the overview to a recoverable campaign

App workflow update · 9 September 2026 · Evozyme 1.2

Start on the process overview. Follow **Plan → Test → Learn**, then open the planner at the stage you need. Laboratory work sits between the app stages; completing a form does not demonstrate an assay or enzyme improvement.

## A short starting path

In **Campaign**, enter a campaign name, parent enzyme and exact clone ID, the intended improvement, metric and units, and the conditions for comparison. Choose a measurement route. Guided view exposes starting information first; **Show complete forms** reveals the same records in full. Switching views preserves your entries. Later documentation stays in expandable sections.

If you change the campaign parent before its first analysis, screening and confirmation references that still match the old parent follow the change. Once results exist, references are explicit historical choices. Explain any intentional difference between campaign, screen and confirmation references.

The next-action list changes with the stage. Expand the list across all stages to see unresolved work. It distinguishes missing information, missing evidence, planning inconsistencies, settings review and analysis blockers. The status concerns recorded information, not biological validity.

## Before the first screen

1. Define the intended reaction and confirmation method. Record demonstrated range, background, timing, repeatability and clone recovery.
2. Review equipment access, accessories, software export and stock tracking. Record actual acceptance evidence. Blank purchase prices mean unquoted; zero is an explicit entered amount. Totals update while you type. Changing currency relabels values without conversion.
3. Match the library to usable screening capacity. The supported analyser uses 96-well linear-rate screens, one candidate preparation per clone per plate, and independent plate comparisons.
4. Match the budget reservation to the assay. Minimum controls are blank wells + host wells + independent parent preparations × technical wells. Six parent preparations, two technical wells, four blanks and four host wells require 20 controls. With four 96-well primary plates and two technical wells per candidate, primary capacity is 152 clones. Additional reserved controls are retained.
5. Review costs and analysis thresholds. Prefilled values are teaching assumptions. An acknowledgement is tied to the exact analysis configuration, including the reference clone. Changing configuration invalidates it.

Other plate formats and preparation counts may be planned, but require external analysis. Endpoint and nonlinear assays need another validated method. The app does not convert detector units into catalytic activity.

## Import measurements without rewriting the CSV

### 1. Choose files

Select CSV exports with any filenames. You can include a plate map, clone register and a settings JSON file. Files remain in the browser. Maximum combined uploaded text is 10 MB; expanded canonical inputs also have a 10 MB limit. Proprietary binary exports and Excel workbooks are not supported.

The existing `plate_map.csv`, `clone_register.csv`, `measurements.csv` and `assay.json` examples continue to work. Map/register files may be omitted if you prepare their identities in the editor. This does not infer clone identity from well position.

### 2. Assign roles, columns and formats

Assign exactly one measurements file and at most one map, register and settings file. Mark unrelated files as ignored. Review the suggested columns; suggestions are starting points.

- **Long layout:** one well/time/signal observation per row. Map the time, well and signal columns. Plate and run metadata can come from mapped columns or the explicitly displayed settings.
- **Wide layout:** one time column; every other column is a well such as A01 or H12. One plate per wide file. Choose the time column and supply the plate ID. Non-well metadata columns must be removed from this defined wide layout before import.
- Choose seconds, minutes or milliseconds explicitly. Values are converted to seconds before fitting. Choose decimal point or comma and the separator for each CSV: comma, semicolon or tab. Thousands separators are unsupported.
- Supply the raw signal unit. It must agree with the analysis settings. No activity conversion is applied. Metadata absent from the source uses the displayed configuration, and that choice is retained with the import.

A mapping preset stores format and column choices. It does not store plate-map identities. Preview its effect for each new file; column names, units and plate identity may have changed.

### 3. Check the map and units

Inspect the 96-well map, stock references and canonical observation preview. Missing configured times, duplicate observations, unmapped wells and incorrect parent identities are reported with coordinates. Use **Back to columns** to correct a mapping or unit choice.

Click a well to load its identity. For bulk assignment, enter coordinates separated by commas, such as `A01, A02`, and supply the sample type, clone ID, independent preparation ID and stock location. The selected wells share that preparation and receive sequential technical replicate numbers. A second independent preparation needs a different preparation ID. Check existing replicate numbers after editing a subset of a preparation; duplicate IDs are rejected by the analyser.

Blank and host controls may have empty clone/preparation identities. Parent controls must all use the declared reference clone. Remove accidental map entries with **Remove selected map entries**; a measured well still requires a valid map entry before analysis.

### 4. Review settings, then analyse

The full analyser checks the prepared files and displays plate control status. Review any failures. The comparison shows changes from current settings and the complete effective configuration: references, raw units, fitting times, detector limits, replicate requirements and thresholds.

Click **I have reviewed these imported settings**, then **Analyse and retain this import**. A previous acknowledgement cannot approve a new import. Going back to edit the map or columns requires review again. Failed controls may be retained for inspection, but block nomination under the configured rules.

Cancel at any point to discard the staged import. A failed or cancelled import does not replace existing files or analysis snapshots. Saving a mapping preset is a separate explicit campaign edit.

## Synthetic wide-file walkthrough

Open the worked example, then select its map and register with [the wide minute export](../toolkit/example/measurements_wide_minutes.csv) and the example settings. Set measurements layout to **Wide**, time column **Minutes**, source time unit **minutes**, and plate ID **DEMO01**. Confirm columns, inspect the map, review settings and analyse. The converted measurements reproduce the original numeric results: C03 and C11 are nominated for retesting. The data are synthetic and demonstrate software behaviour only.

## Understand what was retained

Each mapped analysis keeps three kinds of records:

| Record | Purpose |
| --- | --- |
| Original uploaded text and SHA-256 fingerprints | Exact source exports, including files marked ignored |
| Versioned mapping recipe and reviewed configuration | Column choices, conversions, explicit map edits and the acknowledged settings |
| Canonical analysis inputs and results | The three CSV files actually submitted to the analyser and its immutable snapshot |

Use **Export this run's raw inputs** to choose original files, canonical files or the recipe. Quality/settings export includes the recipe and fingerprints. The complete JSON backup includes all of them. A later analysis keeps earlier snapshots; the current assay form may differ from the settings that produced a historical result.

## Confirmation and the next round

The Review stage presents the written goal beside the reference, normalization and observations. Optional structured criteria compare a dimensionless mean ratio in an exact named confirmation assay with matching normalization. A target match is descriptive evidence, not an automatic decision or significance claim. Free-text goals and secondary properties still need interpretation.

Record independent preparations, sequence and product checks, stock recovery, secondary properties, evidence locations and the rationale. Evidence completeness and the analyst decision are separate. Justified tradeoffs belong in the rationale; the app does not impose a universal biological success threshold.

**Create one linked round** creates exactly one new round with the selected clone as its parent. “Retain several lineages” and “Plan a combination library” document intentions. They do not automatically create several rounds or a multiple-parent model. Create each lineage separately and document additional parents and comparison panels.

## Saving, conflicts and restoration

Browser saves have revision checks. If two tabs edit a campaign, a stale draft cannot overwrite the newer saved record. Use the conflict panel to export the draft, save it as a separate campaign, or load the latest saved version. Locally retained recovery drafts can be opened from **Recovery drafts**. Storage failures require an external export; the app does not claim a failed local save is protected.

Export after important changes and record the external backup location. In Review, choose **Check a backup by restoring a separate copy**. Select a JSON backup, then inspect its imported files, results, confirmation decisions and round links. The restored copy has its own campaign ID. The original saved record remains available through Saved campaigns. A successful structural/hash check does not verify that external evidence files exist: open those separately.

Version 1 records migrate while preserving historical results and decisions. Earlier analyses are labelled as predating explicit reference/review checks. Review the current configuration and run a new analysis to apply the current engine. Close older tabs if a storage upgrade is waiting. Recovery requires a compatible current app and a known-good backup; rolling back the website code alone does not reverse a data migration.
