# Directed evolution of enzymes: a practical handbook

Evozyme · Edition 2 · 9 September 2026

**New to the workflow?** Start with the [graphical process overview](https://mlakerholt.github.io/apps/evozyme/overview.html) to see how planning, laboratory work, screening and confirmation fit together.

[PowerPoint presentation](outputs/presentation/Evozyme_Directed_Evolution_v2.pptx): 20 main slides and four reference slides, with speaker notes and editable charts.

**Start with a reliable activity assay, a small traceable library, and access to a compatible plate reader.** A standard molecular-biology laboratory, manual multichannel pipetting, outsourced sequencing, and a simple data workflow can support the first campaign. Expand equipment when a measured limitation justifies it.

This handbook focuses on a cost-efficient platform that can be adapted between benign enzymes. The default starting route uses individually tracked clones, expression in a suitable laboratory host, and 96-well activity measurements. The assay and expression system must be chosen for each enzyme. A general workflow does not imply a universal substrate, host, or detector.

Equipment recommendations and decision rules are proposed starting practices. Published findings are cited near the relevant text. All supplied example measurements and prefilled operating costs are **illustrative**, not laboratory results or current supplier quotations. Software has been exercised on the examples; biochemical adaptations need laboratory validation.

## Read according to the decision in front of you

| Decision | Chapter | Companion resource |
| --- | --- | --- |
| What should improve, and how will we measure it? | [Campaign definition and assay validation](handbook/01_Campaign_and_Assays.md) | [Campaign brief](toolkit/templates/Campaign_Brief.md) |
| Which variants, host, and sample format? | [Libraries, coverage, and expression](handbook/02_Libraries_and_Expression.md) | [Coverage and budget workbook](outputs/01a084fa-2400-76c2-b42b-dfc42ca3fbad/Evozyme_Planners.xlsx) |
| What must the laboratory and computer provide? | [Equipment, software, and purchasing](handbook/03_Equipment_and_Software.md) | [Equipment acceptance checklist](toolkit/templates/Equipment_Acceptance.md) |
| How does a complete example fit together? | [Three worked examples](handbook/04_Worked_Examples.md) | [Synthetic screening report](toolkit/example/results/report.md) |
| Which candidate becomes a parent? What failed? | [Campaign progression and troubleshooting](handbook/05_Progression_and_Troubleshooting.md) | [Round review](toolkit/templates/Round_Review.md) |
| When should the platform change? | [Advanced methods](handbook/06_Advanced_Methods.md) | [Cost-model interpretation](toolkit/README.md) |
| How do I use and check the tools? | [Toolkit instructions](toolkit/README.md) | [Verification record](handbook/Verification.md) |
| What supports the guidance? | [Source map](handbook/Sources.md) | Primary studies and official documentation |

## The first campaign, in six steps

1. **Write a campaign brief.** Identify the parent, exact coding sequence, intended substrate, conditions, improvement metric, properties to preserve, and available effort.
2. **Establish the parent assay.** Measure background, detector range, reaction progress and preparation variation. Demonstrate the intended product or validate the relation between the screen and a separate product assay.
3. **Complete a tracking pilot.** Process known clones from stored material through growth, preparation, measurement, analysis and recovery. Establish usable throughput from the whole workflow.
4. **Construct a library that fits.** Select a mutation strategy, check representative sequences, and reserve capacity for controls, repeats and confirmation.
5. **Screen, inspect and confirm.** Use a predefined ranking rule. Inspect raw traces and plate patterns. Re-grow candidates independently, verify sequences, and confirm performance on the intended reaction.
6. **Archive and decide.** Preserve the parent and confirmed variants, record uncertainty and tradeoffs, and decide whether to continue, change strategy or stop.

Routine protocols remain brief references: PCR, mutagenesis/assembly, transformation, expression, lysis, plasmid preparation, sequencing, purification and stock preparation should follow established local or method-specific procedures.

## Minimum equipment and software

| Need | Initial provision |
| --- | --- |
| Routine laboratory work | Pipettes, thermocycler, gel access, centrifuges, incubators, heating, pH measurement, refrigeration/freezers and standard consumables. |
| Preparation at plate scale | Multichannel pipette, compatible culture plates/shaking fixtures, suitable centrifuge carriers and reproducible recovery/lysis where required. |
| Activity measurements | Reader with the actual assay wavelength, timing, temperature behavior and data export demonstrated. |
| Confirmation | Sequencing and appropriate protein preparation/product-analysis access. Shared services are acceptable. |
| Data continuity | Recoverable stocks linked to plate maps and unchanged raw measurements. |
| Initial software | Sequence editor, method-compatible primer design, spreadsheet software and supported instrument software. |
| Repeatable analysis | The supplied Python example or equivalent validated workflow, with saved settings and quality flags. |

The [equipment chapter](handbook/03_Equipment_and_Software.md) turns these needs into three configurations and acceptance criteria. The workbook contains an operating budget and separate acquisition worksheet; its example numbers are not a purchasing estimate.

## Criteria for moving forward

| Transition | Evidence needed |
| --- | --- |
| Parent to pilot | Target activity is detectable in a useful range; background and interference have been investigated. |
| Pilot to library screen | Noise permits meaningful ranking, the sample chain works, and recovery has been demonstrated. |
| Screen to confirmation | Candidate measurements satisfy the assay's quality rules and the clone is recoverable. |
| Candidate to new parent | Independent preparations support the required improvement; sequence, product identity and secondary properties are checked. |
| Manual work to automation | A stable assay and quantified recurring bottleneck justify added cost and maintenance. |

These are evidence requirements, not universal numerical thresholds. The example software's 20% retest threshold and quality limits demonstrate a workflow; replace them with rules justified by the intended assay.

For an immediate walkthrough, read the [LipA example](handbook/04_Worked_Examples.md), open the [report](toolkit/example/results/report.md), and fill in the [campaign brief](toolkit/templates/Campaign_Brief.md). The earlier [starter guide](Directed_Evolution_Starter_Guide.md) remains available as a compact equipment-oriented introduction.

## App workflow and pilot materials

Read [Using Evozyme](handbook/07_Using_Evozyme.md) for guided setup, CSV mapping, confirmation targets and backup recovery. The [pilot kit](handbook/Pilot_Kit.md) contains beginner and laboratory-user tasks, an observation sheet and a decision rubric. The pilot has not been conducted.
