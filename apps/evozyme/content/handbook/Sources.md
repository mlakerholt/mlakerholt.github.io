# Evidence and source map

[Handbook home](../Directed_Evolution_Handbook.md)

Prepared 9 September 2026. The handbook separates reported observations, proposed workflow adaptations, mathematical calculations and synthetic teaching data. Primary research supports the scientific examples; official documentation supports software and equipment capabilities. Sources do not experimentally validate the supplied adaptation as a complete platform.

## Scientific and methodological sources

| Source | Used for | Scope of evidence |
| --- | --- | --- |
| [York: relaxation-sensor experimental appendix](https://andrewgyork.github.io/relaxation_sensors/appendix.html) | Imaging configuration, construction/screening lessons and colony handling. | Original project methods/notes for sensors; general enzyme adaptations are proposed here. |
| [York: MagLOV appendix](https://andrewgyork.github.io/gfp_magnetofluorescence/appendix.html) | Follow-on construction, imaging and specialized magnetic hardware. | Campaign-specific implementation; historical costs are not current quotes. |
| [York: MagLOV project](https://andrewgyork.github.io/gfp_magnetofluorescence/) | Context for the specialized readout. | Sensor findings under reported conditions. |
| [Assay Guidance Manual: Basics of Enzymatic Assays for HTS](https://www.ncbi.nlm.nih.gov/books/NBK92007/) | Assay range, reaction progress and kinetic interpretation. | Methodological reference; the guide's validation panel is an adaptation. |
| [Assay Guidance Manual: enzyme identity and purity](https://www.ncbi.nlm.nih.gov/books/NBK91995/) | Target attribution and interfering activities. | Assay-development principles. |
| [Zhang, Chung and Oldenburg (1999)](https://journals.sagepub.com/doi/10.1177/108705719900400206) | Z-factor definition and screening-control quality. | Control separation does not establish improved catalysis. |
| [Firth and Patrick (2005): Statistics of protein library construction](https://academic.oup.com/bioinformatics/article/21/15/3314/195665) | Library diversity and completeness distinctions. | DOI 10.1093/bioinformatics/bti516; supplied bounds are explicitly derived occupancy calculations. |
| [GLUE: authors' library-statistics resource](https://guinevere.otago.ac.nz/STATS/glue.html) | Optional background and alternative calculator. | Method/model assumptions must match the library. |
| [BSLA deletion and randomization study (2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7139672/) | LipA optical-screening starting point. | Published enzyme assays; the supplied 32-candidate dataset is invented. |
| [Cloning, expression, and characterization of a novel (S)-specific alcohol dehydrogenase from Lactobacillus kefir](https://pubmed.ncbi.nlm.nih.gov/19082766/) | Identity and characterization of the NADH-dependent parent candidate. | Parent characterization, not a directed-evolution campaign carried out here. |
| [Gärtner and colleagues (2019): P450 BM3 screening comparison](https://www.nature.com/articles/s41598-019-52077-w) | Product-resolved screening versus cofactor depletion. | Comparison in a specific enzyme/substrate system. |
| [An Open-Source Plate Reader (2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7144579/) | Feasibility of custom instrument construction. | Published build and benchmarks; new builds require acceptance testing. |
| [Agresti and colleagues (2010)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2840095/) | Droplet-based enzyme evolution example. | Specialist compartmentalized assay, not a universal platform. |
| [Wu and colleagues (2019)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6500146/), [published correction](https://pmc.ncbi.nlm.nih.gov/articles/PMC6955331/) | Machine-learning-assisted evolution example. | Method demonstration; proposed adoption checks are the handbook's guidance. |

## Official implementation references

| Capability | Documentation |
| --- | --- |
| Method-specific primer design | [Q5 method overview](https://www.neb.com/en-us/tools-and-resources/video-library/overview-of-the-q5-site-directed-mutagenesis-kit), [NEBaseChanger](https://nebasechanger.neb.com/) |
| Expression considerations | [NEB: obstacles in protein expression](https://www.neb.com/tools-and-resources/feature-articles/bypassing-common-obstacles-in-protein-expression) |
| Plate optics and selection | [Corning selection guide](https://www.corning.com/catalog/cls/documents/selection-guides/CLS-DD-081.pdf) |
| Reader incubation/mixing | [BMG Labtech](https://www.bmglabtech.com/en/incubation-and-shaking/) |
| Liquid-handler transfer specifications | [Opentrons Flex pipettes](https://docs.opentrons.com/flex/system-description/pipettes/) |
| Sequence editing | [ApE](https://jorgensen.biology.utah.edu/wayned/ape/) |
| Spreadsheet work | [LibreOffice](https://www.libreoffice.org/) |
| Analysis and plotting | [Jupyter](https://jupyter.org/), [pandas](https://pandas.pydata.org/docs/getting_started/), [SciPy](https://scipy.org/), [Matplotlib](https://matplotlib.org/) |
| Sequence-file handling | [Biopython SeqIO](https://biopython.org/wiki/SeqIO) |
| Imaging | [Fiji](https://fiji.sc/), [Micro-Manager](https://micro-manager.org/) |

Vendor documentation establishes supported features for specified products, not performance in an untested assay. Obtain model-specific specifications, license terms, compatible accessories and dated quotations before purchasing. No current vendor prices are asserted by the workbook.

## Locally generated material

The campaign matrices, equipment configurations, decision rules, schedules and templates are proposed practical guidance. The cost values are explicitly stated assumptions. Coverage examples are mathematical outputs under independent sampling with replacement. The screening and confirmation datasets are synthetic; the code and workbook were checked as described in the [verification record](Verification.md).
