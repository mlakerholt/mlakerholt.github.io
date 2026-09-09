# Example screening report

Data origin: **SYNTHETIC TEACHING DATA; no laboratory experiment**.

Retest labels nominate measurements for independent confirmation. They do not establish improved enzymes.

| Plate | Usable | Parent preparations | Parent CV | Reasons |
| --- | --- | --- | --- | --- |
| DEMO01 | True | 8 | 3.2% | None under example rules |

## Candidates for independent retesting

- C03: 1.463 × parent; stock DEMO_ONLY/boxA/C03.
- C11: 1.359 × parent; stock DEMO_ONLY/boxA/C11.

## Measurements requiring review

- C07: insufficient_valid_technical_wells;nonlinear_or_low_signal.
- C19: technical_disagreement.
- C23: insufficient_valid_technical_wells;signal_at_or_above_ceiling.
- C27: nonpositive_rate.

Rates are blank-corrected signal units per minute. There is no protein-amount normalization or kinetic-constant estimation.
Z-prime is descriptive here and uses preparation means for parents versus host-control wells. It is not a hit threshold.
Inspect traces and plate patterns even when numerical rules pass. Thresholds are illustrative and need assay-specific validation.

![Quality plots](quality_plots.png)
