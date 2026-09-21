# Vessel parameter review - 11 September 2026

The 67 preset sheets were rebuilt from field-level evidence. The simulator and the
HTML/PDF sheets now share the same reviewed data and calculations.

## Results

- 303 parameter-value changes, including changes caused by corrected geometry.
- 408 source-supported fields; 234 derived fields; 702 retained or selected app
  assumptions; 63 fields belonging to the three custom templates.
- 24 original publisher PDFs (550 pages) in the local archive, with SHA-256 identities.
- All 67 PDF sheets regenerated. Automated checks passed for 1,206 comparisons
  between actual preset-to-form loading and the derivation model.
- Browser check: HyPerforma Glass 1 L loads 0.3 L initial, 0.97 L maximum working,
  and 1.42 L total. The minimum explanation links to original PDF page 2 and
  preserves the manufacturer's approximation symbol.

## Important corrections and choices

- HyPerforma Glass minima: approximately 0.3 / 1.2 / 2.8 / 6 L. Loaded working
  volumes and total loaded volumes are distinct from nominal model names.
- Univessel Glass minima and internal dimensions now use its Inside Dimensions
  table; absolute dimensions take precedence over inconsistent rounded ratios.
- Cplus uses the selected aspect-ratio column, not a generic 20% minimum.
- D-DCU now represents the 200 L, 3:1 microbial configuration (41-200 L), not the
  full product family's 10-200 L model-size envelope.
- STR Generation 3 uses DeltaV / dual-three-blade specifications; the 1000 L
  preset uses the 70 rpm full-fill limit instead of the less restrictive 90 rpm.
- HyPerforma SUB total capacities and single-impeller counts are corrected.
- DynaDrive 5 L minimum is 1 L. DynaDrive 50/500 L dimensions and four-impeller
  arrangements are documented; the 50 L manual contains conflicting drive/motor
  speed ranges, so the selected 200 rpm ceiling is explicitly a conservative
  app assumption.
- SUF maximum speed depends on fill. The current constant-ceiling simulator uses
  the minimum-fill limit; the full manufacturer envelope is recorded in notes.
- XDR-50 minimum is 25 L. X-platform downflow limits are 285 / 185 rpm; the X-200
  upflow limit is a different 215 rpm configuration.
- Mobius 3 L working range is 1-2.4 L, not 0.75-3 L. Merck iFlex 200/2000 L uses
  process agitation limits, not broader instrument ranges.
- WAVE 25 now represents the documented 20 L Cellbag (2-10 L working). RM bags
  explicitly select basic configurations; sensor bags can require higher minima.

Every changed field's old value, new value and reason is in `audit-results.json`.
Every specification's document identity, PDF page and configuration is in
`vessel-records.json` and its human-readable sheet.

## Remaining limitations

No parameter in these four presets has been upgraded to a verified model-specific
specification: Merck iFlex 50 L and 1000 L; DynaDrive 3000 L and 5000 L. The available
local family documents are insufficient for a complete specification, and relevant
downloads remain blocked. Their existing values are clearly marked unverified.

Merck Breez, Mobius 3 L, and iFlex 200/2000 L have primary datasheet values checked
through online retrieval, but their original PDF downloads are unavailable locally.
The sheets preserve the observed values, document names, URLs and page references,
and explicitly distinguish online-only evidence from a backed-up original.
STR Microbial's working range is supported by a locally archived manufacturer
technical article; its datasheet PDF remains unavailable.

Many model-specific pressures, starting process settings and empirical power
numbers remain assumptions. Published jacket pressures, sensor measurement ranges,
burst ratings and outside dimensions were not repurposed as vessel operating data.
Mixed impeller types, rocking bags and microfluidic devices remain approximations
in the stirred-tank engine. These presets are not operating instructions or safety
certifications for real equipment.

Pre-review catalogues and sheets are preserved in `audit-baseline/`. Saved user
scenarios have not been rewritten; reselect a vessel to apply its reviewed values.
