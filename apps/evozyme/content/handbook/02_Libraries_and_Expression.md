# Libraries, coverage, and expression

[Handbook home](../Directed_Evolution_Handbook.md)

## Choose diversity that the screen can examine

For a small first campaign, consider defined substitutions or a small number of separately tracked single-site libraries. Broader exploration becomes practical when capacity and assay quality support it.

| Strategy | Useful when | Main burden | What to verify |
| --- | --- | --- | --- |
| Defined substitutions | Specific hypotheses or very limited capacity. | Explores only proposed changes. | Construct identity and rationale. |
| Single-site saturation | A residue should be explored broadly. | Repeated/unequal variants in degenerate libraries. | Codon design, representation and background. |
| Gene-wide single-residue scan | Whole-protein exploration fits the screen. | Many construction reactions and repeated sampling. | Site-pooling balance and coverage. |
| Random mutagenesis | Distributed changes/combinations and sufficient throughput. | Variable mutation counts, nucleotide bias, unchanged/inactive clones. | Mutation distribution in representative sequences. |
| Recombination | Several confirmed changes or lineages exist. | Combinations may interact. | Parent sequences, linkage and combined constructs. |
| Model-guided library | A suitable model/dataset supports testable rankings. | Prediction uncertainty and distribution shifts. | Baseline comparison and prospective performance. |

York's single-residue strategy matched their screen better than the broad random libraries they tried. This is an observation for that campaign, not evidence that random mutagenesis is universally inferior. [York notes](https://andrewgyork.github.io/relaxation_sensors/appendix.html)

Choose a construction method and its corresponding primer rules. NEB's Q5 method uses non-overlapping back-to-back primers, with NEBaseChanger providing matching design support. [Q5 overview](https://www.neb.com/en-us/tools-and-resources/video-library/overview-of-the-q5-site-directed-mutagenesis-kit), [NEBaseChanger](https://nebasechanger.neb.com/)

## Count samples and variants separately

A parent of L amino acids has 19L possible single-amino-acid substitutions excluding the unchanged parent. That is a design-space count; 19L colonies do not guarantee coverage.

The planner assumes independent draws with replacement from a specified distribution. Repeated assays from the same clone add precision, not diversity. Distinguish transformed colonies, sampled clones, valid measurements and unique verified sequences in the round record.

Library statistics distinguish expected diversity from the probability of complete sampling. Firth and Patrick describe this distinction and models for common construction strategies. [Statistics of protein library construction](https://academic.oup.com/bioinformatics/article/21/15/3314/195665)

For target variant i, per-draw probability pᵢ and n sampled clones:

- Probability of observing i: **1 − (1 − pᵢ)ⁿ**.
- Expected distinct targets: **Σᵢ[1 − (1 − pᵢ)ⁿ]**.
- Probability of observing every target is at least **max(0, 1 − Σᵢ(1 − pᵢ)ⁿ)** and at most **minᵢ[1 − (1 − pᵢ)ⁿ]**.

The last quantities are rigorous bounds under the model, not an exact completeness probability. The lower bound can be loose. They follow from missing-variant probabilities and do not assume independence between observing different variants.

### Numerical comparison

For 20 equally likely targets, 96 draws give approximately 99.3% expected coverage. For an ideal single-site NNK library targeting all 20 amino acids, 96 draws give **97.1% expected coverage**, while the probability of seeing every amino acid is bounded between **42.0% and 95.3%**. These are calculations, not measured library quality.

NNK has 32 codons, including TAG stop, and unequal amino-acid representation. The workbook includes codon counts and treats stop as unused probability mass. It includes the parental amino acid among its 20 targets. To consider only 19 substitutions, remove the parent amino acid from the command-line probability input without renormalizing the remaining probabilities.

Additional off-target loss is separate; do not count stop codons twice. Parental carryover needs special care: if the unchanged parent is a target, it adds probability to that target. The workbook's loss fraction represents material outside the entire target set. Use explicit probabilities for complex mixtures.

For multiple sites, use combination-level probabilities. Multiplying site probabilities assumes independent incorporation, which may not describe a real library. The custom input supports an enumerated target set; it does not infer an unknown distribution from a few sequences.

### Library quality checks

Sequence representative clones and record how they were sampled. Look for parental carryover, unexpected changes, stops/frameshifts and uneven site/design representation. Small samples reveal major defects but cannot establish full coverage. Keep sublibrary identities when this helps localize failures.

Many colonies can still yield little usable diversity. Investigate construction and expression separately from activity failure. Verify coding regions and relevant boundaries of confirmed hits; reconstruct changes in a clean parent background when causality is uncertain.

## Choose the host and sample format

Obtain active parent material in the simplest accessible format. Change one major layer at a time so losses can be localized.

| Format | Advantage | Potential confounding factors | Equipment consequence |
| --- | --- | --- | --- |
| Whole cells | Minimal extraction and recoverable clones. | Transport, metabolism, growth and abundance. | Consistent cultivation/mixing and compatible readout. |
| Lysate | Accessible intracellular enzyme without full purification. | Host enzymes, variable lysis and matrix effects. | Reproducible lysis, clarification and background controls. |
| Supernatant | Convenient for secreted enzymes. | Secretion, degradation and medium variation. | Consistent cultivation and cell separation. |
| Purified enzyme | Control of amount and environment. | Recovery and behavior outside the expression context. | Purification, protein assessment and added labor. |
| Cell-free expression | Access to product and expression mixture. | Background, expression variation and reagent cost. | Expression reagents and DNA identity/recovery method. |

Use a default laboratory *E. coli* system only if it supplies active protein. Disulfide formation, localization and folding can justify different strains or export routes. [NEB expression considerations](https://www.neb.com/tools-and-resources/feature-articles/bypassing-common-obstacles-in-protein-expression)

Evaluate yeast or another eukaryotic system when needed processing is absent from the current host. Confirm what modifications are actually necessary and compatible with the application. Account for changes in media, vessels, selection, cycle time and background before moving a library. Request a small active-parent demonstration first.

For format changes, compare a panel containing the parent and several characterized variants in both formats. Investigate ranking disagreements before assuming that a different host, lysis method or concentration preserves the objective.

## Capacity planning

With W wells, C controls, T technical wells per preparation and B preparations per clone:

**Clone capacity per plate = floor[(W − C)/(T × B)].**

The workbook starts with 96 wells, 16 controls, two technical wells and one preparation: 40 clones/plate. Four primary plates give 160 slots. Repeat plates and confirmation are separate. These are illustrative choices; the synthetic analysis plate has a richer teaching control panel and is not this capacity layout.

Proceed when intended diversity is defined, sampling fits usable capacity, active-parent expression is reproducible, and the library can be checked and recovered. Reduce the first library if those checks cannot be sustained at the proposed scale.
