# AN12431EN: source decisions and validation assessment

Review date: 2026-09-11. This is a source review and validation plan, not a claim
that the simulator has been experimentally validated. Manufacturer PDFs are
archived unchanged, with hashes and retrieval provenance in originals/manifest.json.

## Sources and precedence

- [AN12431EN Ver. 1.0, July 2023](originals/merck-an12431-v1-2023-9372dd222c24.pdf): user-provided application note; Table 1 p. 2; calculated performance Table 2 p. 4.
- [PG12163EN Rev. 2, March 2024](originals/merck-iflex-pg12163-rev2-2024-bc57dac53baf.pdf): manufacturer follow-up guide; p. 4 gives absolute impeller diameters and repeats the ambiguous height ratio.
- [SP2345000 Rev. B, August 2010](originals/merck-cellready-sp2345000-revb-2010-18845b61faea.pdf): historical 3 L datasheet with 137 mm inner diameter.
- [DS26770000 Ver. 3.0, May 2023](originals/merck-mobius3-ds26770000-v3-2023-49b70bf7f7c8.pdf): dedicated 3 L datasheet, selected 135 mm inner diameter on p. 2; now locally backed up.
- Existing [DS12340EN Ver. 4.0, March 2025](originals/merck-iflex-ds12340en-v4-2025-3e5f3a2ab18a.pdf) remains preferred for iFlex 200/2000 L.

## Applied model decisions

| Model | Changes | Qualification |
|---|---|---|
| Mobius 3 L | Power number 0.4 -> 0.3; generic count 2 -> 1 | Np is published in AN Table 1. Single-impeller count is an explicit app interpretation of the depicted shaft-mounted design, not a numeric source specification. |
| iFlex 50 L | Minimum 10 -> 15 L; D = 0.340 m; pitched four-blade design; Np = 3.6; X-baffle; impeller D = 0.117 m | Development-design evidence. Absolute impeller diameter from PG p. 4, not rounded ratio multiplication. Count 1 remains a qualified interpretation. |
| iFlex 1000 L | Range 200-1000 L confirmed; D = 0.919 m; pitched four-blade design; Np = 3.6; X-baffle; impeller D = 0.311 m | Development-design evidence; same qualifications as 50 L. |
| iFlex 200/2000 L | Add corroboration and conflict notes; numeric values unchanged | Dedicated 2025 datasheet remains preferred. |

Both development presets are labelled as such in the selector and stat sheets.
No 500 L preset was added. No non-iFlex Mobius 2021 records were changed.
RPM ceilings, gas-flow ceilings and pressure assumptions lacking matching direct
specifications were not replaced with experimental test settings.

## Geometry conflict investigation

**3 L diameter:** AN p. 2 uses 137 mm, agreeing with its cited 2010 SP2345000
datasheet, which explicitly says inner diameter. The May 2023 DS26770000 says
135 mm, also explicitly inner diameter, with the same CR0003L200 product code.
Thus an inner-versus-outer explanation is not supported. No manufacturer erratum
or revision explanation was found in the inspected sources. Retain 135 mm from
the newer dedicated datasheet and retain both originals as conflicting evidence.
Do not average them. The application note's July date does not establish that its
geometry supersedes the dedicated May datasheet; it cites the older specification.

**Liquid-height ratios:** AN p. 2 and PG p. 4 both label minimum/maximum fluid
height but give ratios greater than one. A reversed heading is plausible, not
confirmed. The 3 L ratio of 2.7 also differs from its 2.4/1 working-volume ratio;
volume ratios need not equal height ratios in non-cylindrical geometry. No exact
corrected minimum liquid height is established. The nominal maximum-fluid/total-
height ratio 0.8 and H:D can produce another derived height, not a direct absolute
measurement. Keep the existing transparent cylinder estimate and its limitations.

**200 L impeller:** PG gives 21.1 cm; the 2025 datasheet gives 21.0 cm.
Retain 21.0 cm, noting the edition difference. Do not replace absolute dimensions
with rounded di:D products. AN's 20 micrometre high-performance sparger and the
later guide/datasheet's 25 micrometre version are not interchangeable for kLa tests.

## Validation opportunities and limits

| Evidence | Suitable use | Conditions and limitations |
|---|---|---|
| Table 2 p. 4: RPM, P/V, tip speed | Arithmetic consistency of power and tip speed against 30 points for existing scales | Published calculated points, not independent empirical validation. Simulator uses density 1000 kg/m3 and P/V in W/L; multiply by 1000 for W/m3. Keep rounded-data and edition differences visible. |
| Mixing p. 3 and Figure 2 p. 5 | Future mixing-time model benchmark, including trends with P/V | Maximum working volume; DI water with 1 ppm phenolphthalein; pH initially 4; alternating acid/base; 99% response endpoint. Representative acrylic iFlex tanks; one probe at 3/50 L, two at larger sizes. Replicate count is not stated for this AN mixing plot. Do not label probe count as independent replication. |
| kLa, Table 3 p. 5, Figures 5-8 pp. 6-7 | Sparger- and fluid-specific calibration/held-out comparison | Actual test volumes 2 L and 200 L; 20/100 W/m3; 37 C in figures. PBS with/without 4 g/L P188 and 50 ppm antifoam; actual perfusion medium comparison at 3 L. 3 L n=2 vessels, one trial each; 200 L two probes, n=3 runs per condition. Preserve mean +/- SD, not invented confidence intervals. |
| Bubble sizes, Table 5 p. 8, Figures 9-10 p. 9 | Future bubble-size/shear submodel | Spargers removed into a 20 L rectangular tank, no mixing; 50-100 traced bubbles per condition from 7-10 images. Bubbles are not independent bioreactor replicates. Not in-vessel bubble distributions. |
| CO2 removal, Figures 12-13 pp. 10-11 | Future CO2 stripping submodel and scale-up trends | 2 L/200 L, 20 W/m3, stated mock medium at 37 C; removal rate evaluated over 10-5% CO2. 3 L n=2 vessels; 200 L two probes, n=2 runs per condition. |
| Theoretical VCD, Table 4 p. 7 | Oxygen balance scenario check only | Assumes qO2 = 5 pmol/cell/day, 100% oxygen and specified sparger flow. Not measured cell-growth validation or universal achievable density. |

The app's actual powerAndKla function was inspected. Its kLa correlation uses
generic power-density, gas-rate, impeller, sparger and baffle factors; it does not
explicitly represent PBS/P188/antifoam formulation or drilled-hole size/count.
No dedicated mixing-time or bubble-size output was found in the core bundle.
Therefore do not tune a single global kLa coefficient to all these curves, or
claim whole-simulator validation from power agreement. No physics code was changed.

`AN12431-ARITHMETIC-CHECK.json` records calculations using the actual extracted
runtime function, not a duplicate implementation. Reproduce with
`node sources/assess-an12431.cjs`. Points above existing RPM ceilings are flagged,
not used to redefine equipment limits. Graph digitization and experimental
calibration remain future work; no numerical graph points or error bars were invented.

Next validation sequence: extract/digitize matched-condition kLa means and SD with
axis uncertainty; separate calibration from held-out conditions; report residuals
by sparger, medium, scale and P/V. Any model extension requires a separate change.
