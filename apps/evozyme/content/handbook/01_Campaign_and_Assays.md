# Campaign definition and assay validation

[Handbook home](../Directed_Evolution_Handbook.md)

## Define the useful improvement

Write the goal as a measurable comparison under specified conditions. “More active” leaves too many alternatives unresolved. A brief might ask for greater initial product formation at equal target-enzyme concentration, while preserving a minimum operational lifetime and required selectivity. Values belong in the brief and should reflect the application.

| Objective | Primary measurement | Companion measurement |
| --- | --- | --- |
| Faster catalysis | Product rate at stated substrate concentration and target-enzyme amount. | Enzyme amount, product identity and substrate dependence. |
| Better production | Useful activity or yield per culture volume or production input. | Growth, soluble expression and preparation yield. |
| Operational stability | Residual activity after a defined exposure. | Activity before exposure and absolute activity after exposure. |
| Substrate preference | Rates or conversions on intended and competing substrates. | Comparable enzyme amounts and analytical response factors. |
| Product selectivity | Desired product fraction, including the relevant stereoisomer. | Total conversion and product identity. |

Do not call a single-substrate rate a measured kcat. For the simple Michaelis–Menten model, v = Vmax[S]/(Km + [S]); a change at one concentration can reflect several underlying parameters. Determine a substrate-response series and appropriate enzyme concentration before estimating kinetic constants. [Assay Guidance Manual: enzyme assays](https://www.ncbi.nlm.nih.gov/books/NBK92007/)

## Select a parent using evidence

Compare a small set of plausible starting enzymes before committing to a long campaign. Record evidence rather than assigning unexplained scores.

| Criterion | Evidence to record | Action if weak or unknown |
| --- | --- | --- |
| Starting activity | Product-confirmed activity on the intended or a justified starting reaction. | Establish the baseline or compare another parent. |
| Expression and recovery | Soluble active material in an accessible format. | Test expression before diversifying the gene. |
| Handling stability | Activity after storage and normal bench handling. | Resolve handling losses that could overwhelm variant differences. |
| Assay compatibility | Signal in the proposed matrix and practical confirmation. | Develop the assay before ordering a large primer set. |
| Sequence provenance | Verified coding sequence, boundaries, tags, vector and accession/source. | Resolve identity and mutation numbering. |
| Resource fit | Substrate supply, assay cost, instrument access and cycle time. | Change format or parent if the screen cannot be sustained. |

Use the [campaign brief](../toolkit/templates/Campaign_Brief.md). Record mature-protein versus precursor numbering explicitly; tags and signal peptides can otherwise make mutation names ambiguous.

## Select the readout

1. **Can the intended product or substrate be measured directly at useful throughput?** Evaluate that assay first.
2. **Can a coupled assay report it quantitatively?** Establish coupling capacity, specificity and absence of a limiting reporter step.
3. **Is a surrogate substrate necessary?** Demonstrate that promising variants transfer to the intended substrate before further rounds.
4. **Is a spatial or cellular reporter proposed?** Demonstrate that signal remains linked to its source clone and survives a separate biochemical test.
5. **If none is credible,** resolve measurement or select another starting reaction. Library size cannot compensate for an uninformative score.

For crude preparations, establish that measured activity comes from the target. High protein mass purity alone does not prove enzymatic identity. Coupling reagents can introduce additional activities. [Assay Guidance Manual: identity and purity](https://www.ncbi.nlm.nih.gov/books/NBK91995/)

## Assemble a validation panel

This is a proposed working checklist. Set acceptance limits from repeated pilot measurements and the smallest improvement worth pursuing.

| Check | Evidence | Response to failure |
| --- | --- | --- |
| Detector response | Product/reporter standards in the matrix across the intended range. | Change concentration, optics or analysis range. |
| Reaction progress | Several enzyme amounts and time courses with a useful interval. | Investigate depletion, lag, inhibition or instability. |
| Matrix background | Reagent blank, host/empty-vector preparation and substrate-omission control. | Determine which background matches actual samples. |
| Product recovery | Known product added to the matrix where appropriate. | Investigate quenching, absorption, chemical reaction or analytical loss. |
| Preparation variation | Independent parent cultures/preparations across days. | Improve growth, recovery or normalization. |
| Plate position/order | Distributed controls and deliberate changes in placement/order. | Diagnose evaporation, temperature, dispensing or read delays. |
| Secondary assay | Parent and comparison panel measured on the intended reaction. | Reconsider whether the proxy supports the application. |

Detector linearity and reaction linearity are separate checks. The Assay Guidance Manual describes establishing both and commonly evaluates initial rates before substantial substrate conversion. Apply these principles to the enzyme rather than borrowing inhibitor-screening concentrations indiscriminately. [Enzyme assay development](https://www.ncbi.nlm.nih.gov/books/NBK92007/)

## Analyze rates transparently

Preserve the instrument export. Join observations to plate/well and preparation identifiers. Fit signal versus time in a validated window, retain slopes and residual information, subtract an appropriate matched background, and retain the reaction direction. A falling NADH signal needs the opposite sign convention from a rising product signal.

Converting absorbance slopes to concentration rates requires a justified calibration or extinction coefficient and optical path length. Microplate volume alone is not a universal path length. Without these, report absorbance units/minute. For fluorescence, calibrate in the appropriate matrix and detector settings.

Do not let software choose each variant's most favorable time interval. Record a fitting rule before ranking. High R² can coexist with a saturated detector or biased background; low R² can reflect a genuinely weak reaction. Keep these distinctions in review flags.

## Replication and statistics

**Technical replicates** repeat a measurement from one preparation. **Biological/preparation replicates** repeat the culture and/or preparation process. Average technical wells within a preparation before using preparation counts to describe biological uncertainty. Record what was actually repeated.

- **CV = standard deviation / mean.** Useful for positive measurements above background; unstable near zero and unsuitable as a universal blank criterion.
- **Fold change = candidate mean / matched parent mean.** Require a valid positive denominator and preserve absolute rates.
- **Residual activity = post-challenge rate / pre-challenge rate.** Preserve both rates so weak starting activity does not disappear behind an attractive ratio.
- **Z′ = 1 − 3(σpositive + σnegative) / |μpositive − μnegative|.** A control-separation metric, not proof of specificity or sensitivity to small improvements over an already active parent. [Zhang, Chung and Oldenburg, 1999](https://journals.sagepub.com/doi/10.1177/108705719900400206)

Define the minimum worthwhile improvement, control rules and retest policy before the pilot. Estimate whether preparation variation permits that improvement to be detected. For formal comparisons, use independent preparations as the replication unit and a justified statistical model.

Large screens create chance extremes. Retest from new preparations, randomize confirmation placement, and avoid selecting a parent from the largest single-well result. When making many formal significance claims, specify the comparison set and multiple-testing approach. The supplied program implements screening rules, not hypothesis testing or automatic discovery claims.

Proceed when the brief is filled, signal and controls are demonstrated, fitting/retesting rules are recorded, and the desired improvement is meaningful relative to pilot variation. If the parent or assay needs replacement, record that outcome rather than forcing a campaign.
