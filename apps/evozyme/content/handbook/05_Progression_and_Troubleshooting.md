# Campaign progression, scheduling, and troubleshooting

[Handbook home](../Directed_Evolution_Handbook.md)

## Decide from confirmed performance

Treat each round as a decision, with the [round-review worksheet](../toolkit/templates/Round_Review.md) recording evidence and the next action. Retain the original parent and representative lineages so comparisons remain possible.

| Observation | Next decision | Evidence required before proceeding |
| --- | --- | --- |
| Plate controls fail | Review or repeat the affected measurements. | A documented cause or reproducible correction; do not rank candidates from the failed plate. |
| Primary candidates fail independent retesting | Investigate selection noise and preparation effects. | Raw traces, recovery/sequence checks, and matched parent preparations. |
| Improvement persists only per culture volume | Decide whether improved production meets the campaign objective. | Target-enzyme amount and per-enzyme performance where catalysis is the objective. |
| Intended reaction improves, with acceptable secondary properties | Consider the variant as a next parent. | Independent confirmation, verified identity, recoverable stock and the predefined improvement criterion. |
| Different variants improve different properties | Retain distinct lineages or test combinations. | A comparison showing the tradeoff in application-relevant units. |
| No useful improvement despite valid measurements | Reassess exploration, parent choice or the objective. | Library representation, active-expression fraction and coverage estimates. |
| Assay or substrate changes | Re-establish comparability before continuing. | Parent and characterized comparison variants measured in both conditions. |

The largest primary-screen value is a nomination. It is not enough to select a new parent. Re-grow candidates independently, preserve technical-versus-preparation identity, verify the coding region and relevant boundaries, and measure the intended product or validated endpoint. Resolve unexpected changes by reconstructing the intended genotype when needed.

## Combine mutations deliberately

For two confirmed changes A and B, compare the original parent, A, B and AB in matched conditions. This reveals whether the combination retains each benefit and whether tradeoffs emerge. Specify the measurement scale before interpreting additivity: adding absolute-rate differences is different from multiplying fold changes. A comparison against the original parent should continue even when the immediate parent has changed.

Do not pool different lineages so early that useful alternatives become unrecoverable. Preserve separately identified stocks and sequences. When comparing stability and activity, retain the absolute values as well as ratios; the next parent should meet the campaign's required combination of properties.

A plateau has several explanations: insufficient exploration, a noisy or misleading assay, inaccessible combinations, or an unsuitable starting enzyme. Use the library and assay records to distinguish them before increasing library size. Changing several workflow components simultaneously makes that diagnosis harder.

## Schedule the whole cycle

The following is an illustrative work sequence for a manual campaign, not a promised biological turnaround. Expression duration, sequencing service, assay development and facility queues determine actual elapsed time.

| Block | Work to reserve | Exit condition |
| --- | --- | --- |
| Before the first round | Parent identity, active expression, assay validation and inventory. | Parent-to-pilot criteria satisfied. |
| Planning and construction | Library design, orders, construction, initial sequence checks. | Library identity/quality acceptable; required materials available. |
| Tracking pilot | Known clones through cultivation, preparation, assay and recovery. | Usable capacity and sample continuity demonstrated. |
| Primary screening | Staggered cultivation/preparation, timed measurements and daily quality review. | Valid measurements linked to archived clones. |
| Repeats and confirmation | New candidate preparations, parent comparisons, sequencing and product analysis. | Improvement and tradeoffs assessed independently. |
| Review and archive | Final records, stock checks, budget reconciliation and next-round choice. | A named parent or documented alternative decision. |

Book the confirmation instrument while planning the primary screen. Include handling and cleaning between batches, failed preparations, raw-data review and stock recovery in labor estimates. Capacity is limited by the slowest sustained stage, not by the reader's shortest advertised measurement time.

Keep two clocks: **hands-on hours** for cost and **elapsed days** for delivery. Waiting for sequencing can increase elapsed time without adding the same amount of labor. Parallel preparation can improve throughput only when downstream measurement remains within the validated handling window.

## Use costs to choose improvements

The supplied [workbook](../outputs/01a084fa-2400-76c2-b42b-dfc42ca3fbad/Evozyme_Planners.xlsx) budgets 160 distinct sampled clones across four primary plates, with one repeat plate and eight confirmation candidates. With its teaching assumptions, 144 clones yield usable primary results and recurring cost is NOK 22,869, or NOK 158.81 per usable clone. This is not cost per unique sequence or per confirmed improvement. It excludes equipment acquisition, which has its own worksheet.

Replace assumptions with measured labor, actual consumable use and dated local charges. Reconcile predicted and observed preparation failure, repeat demand and confirmation workload after the pilot. Culture/preparation costs for controls must be included in the general assay allowance or added explicitly; the default preparation count covers sample slots.

For ownership versus shared access, compare annualized acquisition, maintenance, training and operating costs with shared fees and handling/queue burden. Avoid counting staff time twice. A simple automation payback estimate is:

**Payback rounds = acquisition and setup cost / net recurring savings per round**, provided net savings are positive.

For example, an assumed NOK 120,000 installed system saving NOK 6,000 per round after maintenance and extra consumables has a 20-round simple payback. These invented values demonstrate the calculation; financing, downtime, useful life and resale are excluded. If the manual assay changes frequently, integration and revalidation can dominate this estimate.

## Troubleshooting by distinguishing causes

| Symptom | Plausible causes | Distinguishing check | Next action |
| --- | --- | --- | --- |
| Little signal in parent and variants | Inactive material, inappropriate reaction, detector mismatch. | Compare known active material, product standard and fresh reagents separately. | Restore the failed layer before screening more clones. |
| Strong signal in host controls | Host activity or matrix chemistry. | Host, reagent and substrate-omission controls; intended-product measurement. | Change preparation or assay specificity; use matched backgrounds. |
| Curved progress trace | Lag, depletion, inhibition, instability or detector saturation. | Compare enzyme amounts, product standards and time courses. | Establish a justified fitting window or change assay conditions. |
| Edge or read-order pattern | Evaporation, temperature variation, timing or dispensing. | Redistribute parent controls; inspect plate maps and actual timestamps. | Correct the source and repeat affected comparisons. |
| Technical wells disagree | Transfer error, mixing, bubbles or heterogeneous sample. | Inspect wells and traces; repeat transfers from a common preparation. | Repair handling; do not silently remove the lower well. |
| Technical wells agree but preparations differ | Cultivation, expression, recovery or instability. | Independent parent preparations with recorded yields and timing. | Standardize the variable process or choose appropriate normalization. |
| Primary hit disappears on purification | Abundance, host contribution, preparation loss or context dependence. | Compare target-enzyme amount and activity across preparation stages. | Resolve the cause before attributing intrinsic catalytic improvement. |
| Surrogate assay improves but intended product does not | Changed substrate preference or reporter interference. | Separate product assay on the intended substrate. | Revise the screen or reject the candidate for this objective. |
| Sequence differs from the record | Mislabeling, contamination or unintended construction changes. | Re-isolate from stored material and check coding region/boundaries. | Correct provenance; reconstruct where needed. |
| Apparent hit cannot be recovered | Stock failure, transfer error or selection from a mixed sample. | Check stock and register against original map and lineage. | Repeat recovery/identity checks; do not advance an untraceable hit. |
| A large library has few distinct active variants | Sampling bias, carryover, failed expression or excessive changes. | Representative sequences plus parent expression controls. | Adjust construction or expression based on the diagnosed failure. |

## Maintenance and continuity

Before a batch, check instrument readiness, correct methods/plates, reagents, labels and an accessible output location. Use a recurring parent comparison to notice drift. Follow manufacturer and local schedules for pipette checks, reader performance, temperature verification, cleaning and centrifuge inspection; intervals depend on usage and equipment.

After a batch, preserve original exports, record deviations, save analysis settings and check a backup. Periodically restore a complete run into a separate folder and reproduce its report. Archive sequence files and stock locations together with decisions. A successful campaign requires a recoverable enzyme as well as an attractive graph.
