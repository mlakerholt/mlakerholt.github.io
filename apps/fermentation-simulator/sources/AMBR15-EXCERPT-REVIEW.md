# Ambr 15 Generation 2 screenshot review

Three user-supplied PNG screenshots are archived byte-for-byte with SHA-256 hashes in `originals/manifest.json`, under the matching Ambr 15 preset. These are excerpts, not a downloaded or reconstructed original PDF. The cover identifies Sartorius, Ambr 15 Cell Culture Generation 2, Technical Specification. Revision, publication date and original page numbers are unknown.

User-provided listing: https://www.scribd.com/document/721675734/Ambr-15-Cell-Culture-Generation-2

## Applied

- Working volume 10-15 mL; total volume 18 mL.
- Construction materials polycarbonate and polyethylene.
- Pitched-blade impeller, diameter 11.4 mm, power number 2.15.
- Maximum agitation 2500 rpm from the technical-specification excerpt. **Conflict:** existing archived manufacturer brochure says 2000 rpm. The excerpt was selected with user approval; it is not known to be newer or applicable to every installed configuration.
- Maximum total gas flow is directly stated as 1 mL/min. The app's fixed ceiling is conservatively selected as 1/15 vvm, with starting aeration 0.05 vvm. These are labelled app assumptions, not the manufacturer's literal VVM specification. A fill-dependent flow cap is not implemented.

## Preserved separately, not substituted into incompatible controls

- Internal dimensions L x W x H: 28.0 x 14.6 x 59.7 mm. These do not establish a cylindrical diameter or working liquid height. Existing geometry remains a simulation approximation.
- Agitation minimum: 150 rpm, recorded but not enforced by the current app.
- kLa: 17.6 per hour for sparged vessels at 13 mL DI water, 1500 rpm and 1 mL/min gas. Reference benchmark only, not a universal calibration.
- Temperature: standard 33-40 C +/-0.5 C (+8 C above ambient); cooled 20-40 C +/-0.5 C; shift >=5 C per 30 minutes.
- pH: setpoint 6.5-7.5; monitoring 6.0-8.0; accuracy +/-0.1 pH unit.
- DO: monitoring 0-200% air saturation; accuracy +/-2% at 100%. Not an inlet oxygen or control limit.

These additional specifications are retained in the model's technicalSpecifications object and configuration notes, with source identities. No pressure rating is provided; the existing pressure ceiling remains unverified. The earlier THERMO-GAP-REVIEW is a historical snapshot: Ambr 15 impeller diameter and power number gaps are now filled by this qualified excerpt evidence.
