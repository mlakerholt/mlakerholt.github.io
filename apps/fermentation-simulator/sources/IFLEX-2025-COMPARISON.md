# iFlex local-source comparison

Reviewed 2026-09-11 against the existing records. Source: user-supplied
MK_DS12340EN Ver. 4.0, March 2025, 16 pages. Archived unchanged as
`originals/merck-iflex-ds12340en-v4-2025-3e5f3a2ab18a.pdf`.
SHA-256: `3e5f3a2ab18af511e560342b4f7e5f41b6b8b7183a2e13a185e1dbb2de3a5a44`.
The original publisher download URL was not supplied; the previously cited
online MilliporeSigma document is not claimed to be byte-identical to this file.

| Parameter | iFlex 200 L | iFlex 2000 L | Comparison and source |
|---|---|---|---|
| Working volume | 40-200 L | 400-2000 L | Existing values confirmed, p. 7 |
| Total volume | 240 L | 2400 L | Existing values confirmed, p. 7 |
| Vessel diameter | 54.6 cm | 115.8 cm | Existing values confirmed, p. 7; metric preferred to rounded inch equivalents |
| Impeller diameter | 21 cm | 40.6 cm | Existing values confirmed, p. 7 |
| Impeller geometry | Four-blade down-pumping pitched | Four-blade down-pumping pitched | Existing type confirmed, p. 7; bottom mounted 15 degrees from centre |
| Power number | 3.6 | 3.7 | Existing values confirmed, p. 7 |
| Baffle | X-baffle | X-baffle | Existing values confirmed, p. 7 |
| Process RPM range | 0-144 | 27-102 | Existing maximum confirmed, p. 9; lower bound recorded in notes |
| Bag material | Ultimus film | Ultimus film | Existing material confirmed, p. 4 |
| Pressure warning ceiling | 0.5 bar assumption -> 0.0344737865 bar | 0.5 bar assumption -> 0.0275790292 bar | p. 9 directly states 0.5/0.4 psi process limits and MFC-stop interlocks; converted to bar |
| Default operating pressure | 0.05 -> 0 bar(g) | 0.05 -> 0 bar(g) | App assumption reset because the previous default exceeded both process limits |

All previously online-only citations for these two models now resolve to the
archived PDF with page numbers and checksum. Pressure ceilings are process/interlock
limits, not mechanical design-pressure ratings. The sensor's 0-6 psi span is not
the operating range; interlock detection tolerance is +/-0.05 psi.

No direct liquid height is given. The total H:D of 2:1 and external equipment
dimensions on p. 7 must not replace liquid geometry. Liquid height and liquid H:D
remain explicitly derived using the published diameter and working volume.
Gas-flow defaults remain assumptions: individual MFC capacities are configuration
dependent and are not a directly stated overall vvm limit.

The detailed tables cover only 200 L and 2000 L. iFlex 50 L, iFlex 1000 L,
the separate 2021 Mobius models, and all other presets remain unchanged.
