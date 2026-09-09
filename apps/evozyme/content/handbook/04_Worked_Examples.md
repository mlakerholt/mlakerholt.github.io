# Three worked examples

[Handbook home](../Directed_Evolution_Handbook.md)

**Evidence key:** “Published” paragraphs describe cited observations. “Proposed” workflows are adaptations for planning. Every supplied data value, candidate identifier and cost scenario is synthetic or illustrative. No example establishes that a particular mutation improves an enzyme.

## Example 1: LipA and a colorimetric screen

**Published starting point.** A study of *Bacillus subtilis* lipase A used tributyrin agar activity screening followed by a microplate assay with p-nitrophenyl butyrate. The study also examined stability and hydrolysis of different chain-length esters. This supports an accessible optical screening concept while highlighting that substrate choice matters. [LipA study](https://pmc.ncbi.nlm.nih.gov/articles/PMC7139672/)

**Proposed campaign.** Improve activity on a selected intended ester substrate while retaining adequate stability. Use p-nitrophenyl-butyrate hydrolysis as a first-pass assay only if it provides a useful ranking for that objective. Start from a verified LipA construct and active-parent preparation. The choice of soluble lysate versus secreted material must be demonstrated for the chosen construct; secretion should not be assumed from the enzyme name.

### Step 1: define equipment and success

Use configuration A or B: routine lab equipment, compatible culture handling, reproducible preparation, a multichannel pipette, absorbance reader suitable for the p-nitrophenol readout, and a separate confirmation method for the intended product. Include protein quantification/purification access if the goal is activity per target-enzyme amount.

In the illustrative brief, a ≥20% first-screen increase nominates candidates for independent testing. This is a teaching rule, not a demonstrated limit of detection. The real threshold should reflect preparation variation and the application's minimum worthwhile improvement.

### Step 2: validate the parent assay

Check product calibration in the chosen matrix, spontaneous substrate hydrolysis, host background, pH dependence of the optical response, a usable time window and sensitivity to preparation/dilution. Maintain common conditions during variant comparisons. Test whether the intended product assay supports the screening interpretation.

The example software measures absorbance units/minute. It does not contain a p-nitrophenol calibration or extinction coefficient and does not calculate concentrations or kcat.

### Step 3: track a small library

Choose a bounded defined-variant set or a small separately tracked saturation library after the pilot. Verify the library and retain source stocks before destructive preparation. In the supplied teaching dataset, C01–C32 are invented clone IDs with no sequences; the code is demonstrating data handling, not providing a mutation list.

The 96-well teaching plate contains 32 candidates with two technical wells each, eight independent parent preparations with two wells each, eight blanks and eight host controls. Thus, 64 + 16 + 8 + 8 = 96 wells. Positions are reproducibly shuffled to illustrate distributed controls. Each candidate has one preparation, so its first-screen replicate count is not evidence of reproducibility between cultures.

### Step 4: inspect the analysis

Run the [toolkit example](../toolkit/README.md) or open the [saved report](../toolkit/example/results/report.md). It joins the plate map to the clone register and seven timepoints per well, fits a fixed interval, checks control quality, subtracts blank drift and compares candidate rates with the parent.

| Synthetic sample | Intended teaching behavior | Correct action |
| --- | --- | --- |
| C03 | Higher first-screen rate with acceptable measurements. | Retest independently. |
| C11 | Higher first-screen rate with acceptable measurements. | Retest independently. |
| C07 | Curved time traces. | Investigate the time window or reaction; no candidate rank. |
| C19 | Technical-well disagreement. | Check preparation/dispensing and repeat. |
| C23 | Signal above the configured measurement ceiling. | Dilute or change validated settings and repeat. |
| C27 | Nonpositive corrected rate in a rising-signal assay. | Inspect background/identity/readout; no favorable rank. |

![Synthetic quality plots](../toolkit/example/results/quality_plots.png)

The ceiling and R²/CV limits are example settings, not measured instrument properties. The program retains quality flags instead of making partial or failed measurements look like confirmed hits.

### Step 5: confirm on the intended reaction

Recover C03 and C11, obtain independent cultures/preparations, confirm their coding sequences and test the intended substrate. Where the goal is intrinsic catalytic performance, compare equal quantified target-enzyme amounts and verify product identity. Test required stability/selectivity in the same confirmation batch.

The supplied **synthetic** confirmation file illustrates how rankings can change:

| Sample | Independent product rates (µM/min) | Mean relative to parent |
| --- | --- | --- |
| Parent | 1.00, 1.04, 0.98 | 1.000 |
| C03 | 1.30, 1.33, 1.28 | 1.295 |
| C11 | 1.02, 1.00, 1.05 | 1.017 |

All rows specify the same illustrative enzyme concentration, 0.1 µM. These are rates at a fixed assay condition, not fitted kinetic constants. The first-screen increase for C11 does not transfer to this product assay. Expression or surrogate-substrate behavior would be hypotheses to investigate, not conclusions proven by these numbers.

### Step 6: choose the next parent

In this scenario C03 merits further consideration; C11 does not meet the example improvement objective in confirmation. C03 becomes a next-round parent only after sequence, product and secondary-property checks are satisfied. The table alone supplies none of those missing experimental observations. Record the decision in the [round review](../toolkit/templates/Round_Review.md) and preserve the original parent.

### Step 7: schedule and budget the round

The following is a planning sequence, not guaranteed turnaround. Standard procedures and incubation details remain in local protocols.

| Block | Work | Release criterion |
| --- | --- | --- |
| Assay establishment | Active parent, calibration, matrix controls and repeatability. | Reliable parent assay; duration is enzyme-dependent. |
| Construction and identity | Library construction and representative sequence checks. | Acceptable library before extensive screening. |
| Screening batch | Culture/preparation, controls, measurement and analysis. | Valid observations and recoverable candidates. |
| Confirmation | New preparations, sequencing, target-product and secondary-property tests. | Supported candidate decision. |
| Review | Archive, costs and next-round design. | Updated brief and available capacity. |

For an illustrative established campaign, reserve a first work block for construction, a second for expression/screening, a third for confirmation and a final review block. Insert actual growth times, sequencing turnaround and shared-instrument bookings before assigning calendar dates. Do not report the readout time as the full cycle time.

The workbook models a separate four-primary-plate budget example with 40 clones per plate, not the richer teaching control layout above. Adjust controls, replicate counts, preparation expenses and analytical confirmation costs before using it for this enzyme.

## Example 2: an alcohol dehydrogenase and a cofactor readout

**Published starting point.** The (S)-specific alcohol dehydrogenase described from *Lactobacillus kefir* DSM 20587 is NADH-dependent, was expressed in *E. coli*, and reduced acetophenone to (S)-phenylethanol. The study provides a defined parent candidate; it is not a directed-evolution campaign implemented here. Do not conflate it with differently named NADPH-dependent enzymes from the same species. [Parent characterization](https://pubmed.ncbi.nlm.nih.gov/19082766/)

**Proposed adaptation.** Evaluate a focused variant set for improved reduction of the intended ketone under stated conditions. Use NADH loss at 340 nm for a first screen after verifying the direction and stoichiometric relation to the intended product. Confirm product conversion and stereoselectivity independently.

| Layer | Change from the LipA example |
| --- | --- |
| Equipment | Demonstrated 340-nm reader/plate compatibility; analytical access capable of resolving the relevant products/enantiomers. |
| Sample flow | Prepare active parent/variants, run cofactor-controlled reactions, then analyze selected product samples. |
| Records | Exact enzyme identity, cofactor identity/concentration, substrate, direction, preparation ID and product-assay method. |
| Controls | NADH stability, no-substrate reaction, host background, matrix absorption and parent preparation variation. |
| Analysis | Falling-signal sign convention; rate limits and saturation rules recalibrated for this assay. |
| Confirmation | Quantified target enzyme, intended ketone, product calibration and suitable selectivity analysis. |
| Cost drivers | Cofactor, substrate, analytical standards and chromatography time. |

A cofactor-regeneration system changes the interpretation of net cofactor concentration. Separate the activity screen from process demonstrations using recycling, or model and validate both reactions explicitly. Net NADH absorbance in a regenerating mixture is not automatically the target-enzyme turnover rate.

If cofactor disappearance is fast but desired product is low, test substrate dependence, background consumption, analytical recovery and product identity before advancing the variant. The delivered synthetic LipA settings must not be reused unchanged.

## Example 3: P450 BM3 and product-specific analytics

**Published comparison.** Gärtner and colleagues compared NADPH-depletion screening with multiplexed capillary electrophoresis for P450 BM3 oxidation of α-isophorone. Cofactor consumption could include uncoupling and side products; product-based screening was more effective at identifying beneficial variants in that experiment. [P450 BM3 study](https://www.nature.com/articles/s41598-019-52077-w)

**Proposed adaptation.** Decide whether the goal is the amount of one hydroxylation product, total conversion or a specified product distribution. Obtain a product-resolving assay before treating NADPH loss as a ranking metric.

| Layer | Practical implication |
| --- | --- |
| Equipment | Shared HPLC/GC/LC–MS or another validated product-resolving method. The published 96-capillary instrument is not mandatory. |
| Sample flow | Expression/preparation, reaction under controlled conditions, sample handling, analytical separation, identified product quantification and candidate recovery. |
| Records | Product standards, sample preparation, analytical run/sample IDs, peak assignments, response factors and enzyme amount. |
| Controls | No-enzyme/background, parent, cofactor loss without target substrate, product recovery and analytical carryover. |
| Analysis | Quantify desired product and side products separately; use cofactor use as additional context. |
| Confirmation | Independent preparations and target-product yield/selectivity under the intended conditions. |
| Cost drivers | Standards, extraction/preparation, analytical consumables, method development and instrument booking. |

If the optical and product assays disagree, preserve both results and investigate the reason. Do not simply average incompatible measures into a composite score. If analytical capacity is limited, a smaller well-characterized library may be more economical than a large screen whose hits cannot be confirmed.
