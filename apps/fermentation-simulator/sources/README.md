# Vessel source records

## Simulation reference and interactive map (13 September 2026)

`simulation.html` retains the written guide and adds a progressively enhanced
**Interactive calculation map** tab (`#calculation-map`). It runs an isolated
E. coli / 10 L / 36 h teaching preset; it never reads or changes saved scenarios.

- `../simulation-core.js` is the shared numerical engine for the app and map.
  `simulate(scenario)` preserves the original result shape. `inspectStep` replays
  controller history and returns the exact initial/intermediate/final step states.
- `simulation-example.js` defines all starting parameters explicitly.
- `simulation-map.js` provides controls, accessible tabs, node equations and
  dependency highlighting. The worker coalesces pending requests; stale results
  are ignored. If workers are unavailable the same engine runs on the main thread.
- `simulation-worker.js` evaluates the selected step off the UI thread.
- `simulation-map.css` provides the responsive, code-native flow chart.

Build 2026-09-13.2 repairs resource coupling, pH inventory, time boundaries,
flow limits and reporting. See [MODEL-REPAIRS.md](MODEL-REPAIRS.md) for changed
semantics and remaining limitations. Golden fixtures remain unchanged and are
checked against the preserved old engine in `fixtures/simulation-core-2026-09-13.1.cjs`.
They are historical regression evidence, not acceptance targets for repaired predictions.

```powershell
node sources/build-app.cjs
node sources/test-model-baseline.cjs
node sources/test-model-repairs.cjs
node sources/test-simulation-map.cjs
node sources/test-simulation-guide.cjs
```

The build command regenerates the eight UI payloads from `../tmp/app-source.js`
and the vessel-selector payload from `../tmp/vessel-catalog-source.js`.
The shared engine is loaded separately. If its code changes, review the written
reference and node equations before updating the HTML model-core fingerprint.

## Reviewed parameter data (11 September 2026)

`audit-vessels.cjs` contains the field-by-field selection rules, model configurations,
page locators and source qualifications. It generates readable `vessel-records.json`,
both compressed app catalogues, `audited-sheets.json` and `audit-results.json`.
Do not edit the compressed payloads independently.

Rebuild from the app folder:

```powershell
node sources/audit-vessels.cjs
node sources/test-audit.cjs
python sources/build_audited_pdfs.py
python sources/build_archive_index.py
```

Python requires reportlab and pypdf (available in the bundled runtime on this machine).
Refresh the app after rebuilding. Previously saved scenarios are user data and are
not migrated; reselect a vessel to apply its reviewed preset.

The original pre-review catalogues and PDF sheets are preserved in `audit-baseline/`.
`originals/` contains byte-preserved publisher downloads with SHA-256 identities.
The generated `pdfs/` are local derivation sheets, NOT original manufacturer documents.
Online-only Merck citations explicitly identify missing local originals. Fields with
no matching verified specification are retained as assumptions, never auto-labelled
source-supported just because a family webpage exists.

Scope qualifications: D-DCU is now the documented 200 L 3:1 configuration; WAVE 25
is the documented 20 L Cellbag configuration (2-10 L working), not a mixed bag-family
envelope. STR Gen3 selects DeltaV / dual-3-blade hardware. RM presets select basic
bags. Mixed impeller arrangements and rocking/microfluidic physics remain model
approximations. Constant RPM ceilings cannot reproduce fill-dependent envelopes.

This directory contains the local source and provenance library used by the Fermentation Simulator vessel selector.

- `index.html` renders either the complete source index or one vessel record selected with `?id=<preset-id>`.
- `source-records.payload` is a gzip-compressed, Base64-encoded JSON catalogue containing one locally authored evidence record for every vessel preset.
- `source.css` provides the retro presentation layer.

The records preserve cited preset facts, clearly identify simulator-derived values, and link to original manufacturer documentation. `originals/` now separately backs up accessible manufacturer PDFs and raw webpage responses for local reference; see `ARCHIVE-README.md` for provenance and limitations.

- `pdfs/` contains one local PDF source record per vessel preset plus a checksum manifest.

September 11, 2026 addendum: the user-supplied SP1237EN00 Ver. 4.0 (October
2021) is archived byte-for-byte, with a SHA-256 identity and page-numbered text.
Its original publisher download URL is unknown. Four separate Mobius 2021 presets
(50, 200, 1000 and 2000 L) bring the catalogue to 71 models and the archive to
25 original PDFs. None of this document's data is applied to iFlex. Liquid height
remains calculated; the source's diameter convention is qualified in each sheet.
The import is reproducible with `node sources/import-mobius-2021.cjs` while the
Desktop original is present; normal archive rebuilds retain the archived copy.

The subsequent iFlex import, MK_DS12340EN Ver. 4.0 (March 2025), brings the archive
to 26 PDFs. It confirms the 200 L and 2000 L specifications and replaces their
assumed pressure warning limits with documented process/interlock limits. See
`IFLEX-2025-COMPARISON.md` for the field-by-field comparison and qualifications.
The 50 L and 1000 L iFlex presets are unchanged. Local citations no longer depend
on the previously inaccessible online PDF for the two reviewed sizes.

AN12431EN follow-up: `AN12431-REVIEW.md` records qualified development-design
updates for iFlex 50/1000 L, the 3 L power-number correction, unresolved geometry
conflicts, and a condition-specific validation assessment. Four additional original
PDFs bring the archive to 30 documents (626 pages). The 2023 3 L datasheet is now
backed up locally. `node sources/assess-an12431.cjs` checks 30 published arithmetic
points against the actual core function; this is not empirical kLa validation.

Thermo pressure/geometry follow-up: `THERMO-GAP-REVIEW.md` lists the 12 updated
presets, retained conflicts, source-search outcomes and all remaining stirred-vessel
gaps. The archive now holds 32 PDFs (875 pages). SUB speed ceilings are conservative
constant choices for minimum fill, not the unrestricted hardware maxima; the core
simulator still has no fill-dependent equipment governor. Reproduce the comparison
with `node sources/build-thermo-gap-review.cjs` and run `node sources/test-audit.cjs`.
