# When to extend the platform

[Handbook home](../Directed_Evolution_Handbook.md)

These methods can address specific limitations. Adopt one after demonstrating an active parent, an informative assay and a way to recover the corresponding genotype. Throughput claims from one system do not transfer automatically to a different enzyme.

| Method | Prerequisites and additional capabilities | Main limitations | Adoption criterion |
| --- | --- | --- | --- |
| Colony imaging | Spatially localized assay, suitable illumination/camera/optics, image analysis and colony recovery. | Colony size, diffusion, growth and position can influence signal. | A panel of known variants retains its ranking after recovery and biochemical retest. |
| Droplet screening | Compartment-compatible expression/reaction, controlled loading, fluidics, detection/sorting and genotype recovery. | Leakage, occupancy, emulsion behavior and specialist operation; confirmation remains necessary. | Reaction and genotype remain linked through compartment handling and recovery. |
| Cell sorting with fluorescent readout | A validated cellular reporter or display system, sorter access and recovery workflow. | Signal can reflect expression, transport or reporter behavior rather than catalysis. | Reporter rankings predict the intended enzyme property in independent tests. |
| Growth selection | A credible link between desired enzyme function and a selectable cellular phenotype. | Bypass mechanisms, host adaptation and growth advantages can dominate. | Recovered coding changes reproduce the intended biochemical improvement in a clean background. |
| Cell-free expression | Suitable expression chemistry, DNA tracking, matrix-compatible assay and recovery strategy. | Reagent cost, background and variable active-enzyme yield. | The host or transport limitation is demonstrated, and parent performance is reproducible in the new format. |
| Liquid-handling automation | Stable transfers, compatible labware and a repeatable manual method. | Setup, dead volume, consumables, cleaning, interruption recovery and maintenance. | Measured net capacity/cost benefit after full workflow validation. |
| Model-guided libraries | Suitable sequence/structure information and trustworthy assay labels. | Data leakage, small datasets, extrapolation and objective mismatch. | Prospective improvement over a simple baseline at the same experimental budget. |

## York's imaging route: reproduce the capability, then adapt

York's sensor work combined whole-plate imaging with custom illumination/control and Python-based analysis. Its nitrocellulose-transfer approach helped control the chemical environment around colonies. Treat this as a coherent assay-and-instrument system: camera sensitivity alone is not the method. [Experimental appendix](https://andrewgyork.github.io/relaxation_sensors/appendix.html)

For an enzyme, first establish whether substrate delivery, product retention and colony recovery support spatial ranking. Compare image scores with individually measured activity. Write down which custom parts need alignment, calibration, repair and software support before comparing its cost with shared reader access.

The magnetic-field hardware in the MagLOV work addressed that sensor's specific readout. It is not a general requirement for evolving enzymes. [MagLOV appendix](https://andrewgyork.github.io/gfp_magnetofluorescence/appendix.html)

## Droplets and sorting

Agresti and colleagues demonstrated droplet-based directed evolution of horseradish peroxidase. This is evidence that a suitable compartmentalized enzyme assay can support a high-throughput campaign, not that any soluble product assay can be transferred unchanged. [Primary study](https://pmc.ncbi.nlm.nih.gov/articles/PMC2840095/)

Before adopting, test loading distribution, signal retention, negative controls, stability through the actual handling sequence and recovery of known positive genotypes. Include downstream retesting and failed-sort recovery in capacity calculations. A shared specialist facility may make a feasibility test more practical than constructing an entire platform.

## Cell-free and selection-based routes

For cell-free work, compare the parent and a characterized variant panel with the existing expression route. Measure useful activity per reaction and, where needed, per target-enzyme amount. Include the expression mix in background and interference tests. Preserve a reliable link to the template DNA.

For a selection, establish that the desired enzyme property causes the phenotype. Retesting only in the selected host can preserve an unrelated adaptation. Reconstruct recovered enzyme changes and use an independent biochemical assay. The guide does not prescribe a universal selection circuit: it must be designed around the particular reaction.

## Model-guided design

Wu and colleagues provide a primary example of machine-learning-assisted directed evolution; the paper has a published figure correction. [Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6500146/), [correction](https://pmc.ncbi.nlm.nih.gov/articles/PMC6955331/)

Start with a traceable dataset: full sequence, lineage, assay version, preparation identity, measured values, quality flags and failed measurements. Do not turn invalid measurements into zero activity. Separate expression failure from measured low activity when the data support that distinction.

Compare predictions with simple alternatives such as the existing focused library strategy. Evaluate on sequences not used to fit or tune the model, avoiding near-duplicate or lineage leakage where possible. The strongest practical check is prospective: nominate a fixed-size batch before measuring it and compare its confirmed performance with an equal-budget baseline.

For the starter workflow, a normal workstation is sufficient for recordkeeping and the supplied analysis. Cloud compute or a dedicated accelerator should follow a specific modeling requirement. Include model/tool version, input sequence and prediction output in the record; predictions alone do not establish enzyme performance.

## A bounded adoption experiment

Define the limitation, select a small parent/variant panel, specify an acceptance rule and reserve a fixed evaluation budget. Measure useful recovered results, staff effort, repeat demand and agreement with the existing confirmation assay. Scale only after this comparison supports the change. Keep the established route available until the new method can reproduce its essential decisions.
