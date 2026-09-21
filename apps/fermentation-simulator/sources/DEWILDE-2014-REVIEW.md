# De Wilde 2014 source review

Reviewed the supplied six-page PDF in full. Title: Superior Scalability of Single-Use Bioreactors. BioProcess International 12(8)s, September 2014, printed pages 14-19. All authors are affiliated with Sartorius Stedim Biotech (PDF p. 6). Archived byte-for-byte with SHA-256 identity. This is manufacturer-authored primary characterization for UniVessel SU/BIOSTAT STR, but its ambr250 characterization cites Bareither et al. 2013 rather than new measurements.

## Decisions

| Models | Comparison and action |
|---|---|
| Ambr 15 | Not covered; unchanged. |
| Ambr 250 Modular microbial | Article concerns a cell-culture design; no geometry, volume, impeller or speed transfer. Added mismatch note and source link. |
| UniVessel SU 2 L | D=130 mm and impeller D=54 mm agree. Historical minimum/total 1/3 L conflict with selected datasheet 0.6/2.6 L. Retained datasheet. Historical liquid height 177 mm not transferred without resolving vessel configuration. |
| BIOSTAT STR Gen3 50/200/500/1000/2000 | Absolute vessel diameters, impeller diameters, liquid heights and total volumes agree with selected Gen3 source. Retained newer configuration-specific source and operating ranges. Added historical corroboration notes. |

No numeric simulation values were changed. Seven records and their derivation sheets gained source-comparison notes. Power-number assumptions now explicitly cite the unresolved coefficient convention for the six UniVessel/STR models.

## Important interpretation limits

- PDF p. 2 Table 1 prints vessel diameter units as “min”; surrounding dimensions and ratios indicate millimetres. This printed defect is not silently treated as a corrected source value.
- Table 1's vessel H/D 1.8 for STR differs from p. 4 text saying 2:1. Neither is liquid H/D.
- PDF p. 5 reports torque-based Ne approximately 1.3 for a two-three-blade-segment configuration at Re above 10000. This does not unambiguously establish a per-impeller coefficient in the simulator. Do not multiply a whole-assembly coefficient by two; resolving the convention requires a separate arithmetic/model check.
- PDF p. 2 Table 2 compares scale-up criteria from a 50 L CHO example at 150 rpm; those RPMs are not equipment ceilings.
- Sparger hole diameters/counts and mixing/kLa curves are retained in the original, not applied as current Gen3 specifications or universal calibration. The current simulator does not represent the ring/micro sparger configurations separately.
- No operating pressure ratings are established.

Remaining useful work: resolve coefficient convention against Table 2; establish UniVessel edition equivalence; review original Bareither study only for a matching cell-culture ambr250 configuration.
