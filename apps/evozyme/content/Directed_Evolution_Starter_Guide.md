# Starting directed evolution of enzymes

The expanded [Directed Evolution Handbook](Directed_Evolution_Handbook.md) now provides detailed campaign guidance, three worked examples, planning tools, and a tested example analysis. This starter guide remains the short equipment-oriented introduction.

A practical equipment and software guide for Evozyme · 9 September 2026

**Recommended starting configuration:** access to a standard molecular-biology laboratory, a 96-well activity assay, a compatible plate reader, manual multichannel liquid handling, outsourced DNA sequencing, and a simple system linking every measurement to a recoverable clone.

This guide assumes a small team working with a benign enzyme that can be expressed in a standard laboratory host. The default is an *E. coli* workflow; proteins requiring another host may need additional expression equipment. Recommendations below are a starting design for Evozyme, informed by the cited work. They are not a universal validated protocol or a priced purchasing list.

The reusable platform consists of library construction, sample handling, measurement, analysis, and record keeping. The enzyme-specific component is the assay: substrate, reaction conditions, and a signal that reliably reports the desired activity.

## 1. Decide what the screen must measure

Before choosing equipment, write down the enzyme, intended substrate, operating conditions, and the property to improve. Choose one primary score and any properties that must be preserved.

| Objective | What the assay must distinguish |
| --- | --- |
| Faster catalysis | Product formation rate at comparable enzyme amounts. |
| Better production | Useful activity obtained per culture volume or production input. |
| Greater operational stability | Activity retained after a defined challenge, alongside starting activity. |
| Different substrate preference or selectivity | Desired conversion relative to competing substrates or products. |

These distinctions determine the equipment. An optical reporter may support rapid screening, while confirmation of a particular product or stereoisomer may require chromatography or another analytical method.

A published P450 BM3 study illustrates the problem: NADPH consumption could include uncoupling and side-product formation, so it did not uniquely measure the desired product. Direct product analysis identified beneficial variants more efficiently in that experiment. Plan access to a suitable confirmation assay from the beginning. [Gärtner, Ruff and Schwaneberg, 2019](https://www.nature.com/articles/s41598-019-52077-w)

## 2. The complete cycle

**Choose a parent → design variants → construct the library → express clones → measure activity → confirm hits → archive and choose the next parents.**

| Stage | Necessary output |
| --- | --- |
| Design | Verified parent sequence, mutation plan, and primer or synthesis order. |
| Construction | A library with checked diversity and acceptable parental background. |
| Expression | Identifiable cultures and a retained source for recovering each candidate. |
| Screening | Raw measurements, controls, plate map, and a defined ranking rule. |
| Confirmation | Repeated activity measurements from independent preparations and verified sequences. |
| Next round | Archived parent and hits, documented selection decision, and updated library plan. |

Standard procedures can follow established local protocols: PCR, mutagenesis or assembly, transformation, colony picking, expression, lysis, plasmid preparation, sequencing, and stock preparation. Choose a coherent construction method and its corresponding primer-design rules. For example, NEB's Q5 method uses back-to-back, non-overlapping primers; these rules should not be assumed to match York's rolling-circle approach. [NEB Q5 method](https://www.neb.com/en-us/tools-and-resources/video-library/overview-of-the-q5-site-directed-mutagenesis-kit)

## 3. Essential laboratory equipment

“Essential” means access is required; it does not mean every item must be purchased.

### Routine laboratory infrastructure

List these in the lab inventory without treating them as special directed-evolution purchases:

- Single-channel pipettes, filtered tips, tubes, racks, and reagent reservoirs.
- Thermocycler; gel electrophoresis and gel-imaging access.
- Microcentrifuge, vortex mixer, and heating block or water bath.
- Incubator and shaking incubator appropriate for the chosen culture format.
- Refrigeration, reagent freezing, and suitable long-term clone storage, usually shared −80 °C access.
- Balance, pH meter, water supply, sterilization, and routine waste handling.
- A method for DNA quantification and routine protein concentration measurements.
- Protein gel electrophoresis and small-scale purification access when confirming purified-enzyme performance.
- Standard cloning/expression consumables, culture media, and access to sequencing services.

### Equipment that determines whether screening works

| Item or capability | Starter requirement | Purchasing implication |
| --- | --- | --- |
| **Activity detector** | Compatible 96-well plate reader with the optical mode and timing the assay requires. | The main assay-dependent instrument; test a shared reader first. |
| **Multichannel pipette** | An 8- or 12-channel pipette accurate at the actual transfer volumes. | High priority for a manual plate workflow. |
| **Plate-compatible growth setup** | Shaker fixtures, culture plates, and seals suited to the expression workflow. | Confirm the incubator accepts and adequately mixes the selected plates. |
| **Centrifuge with suitable plate carriers** | Capacity for the chosen culture plates and sufficient force for the intended pelleting/clarification step. | A low-speed plate spinner used to collect droplets may be insufficient. |
| **Reproducible lysis** | A validated plate-compatible method for intracellular enzymes. | Start with an appropriate existing method; a sonicator is conditional. Secreted enzymes may avoid this step. |
| **Temperature control** | Repeatable reaction temperature and a way to check it. | Reader incubation or a compatible external arrangement, depending on assay timing. |
| **Correct assay plates** | Optical properties, working volume, and chemical compatibility matched to the assay. | Culture plates and measurement plates often serve different purposes. |
| **Hit confirmation** | Appropriate protein preparation and a product-specific measurement method. | Use shared purification, HPLC, GC, LC–MS, or other facilities where needed. |
| **Data workstation and backup** | Instrument-compatible computer and reliable export/storage. | Obtain working software and licenses with any instrument. |

Budget for repeat purchases as well: primers, competent cells, enzymes for construction, plates, seals, tips, lysis reagents, substrate, cofactors, reference standards, sequencing, and confirmation assays. Substrate cost can materially change the economics of a screen.

## 4. Choose the screening instrument

### Default: a 96-well microplate reader

For the first pilot, use individually tracked clones and physically separated reactions. My recommendation is to start in 96-well format and move to 384 wells only after dispensing, evaporation, signal strength, and sample recovery work reliably.

| Assay signal | Detector requirement | Check before choosing |
| --- | --- | --- |
| Color change | Absorbance at the assay wavelength. | The installed filters or spectral range must include it. |
| NADH/NADPH change | Absorbance around 340 nm. | Reader and plate transmission, plus whether cofactor turnover tracks the desired reaction. |
| Fluorescent product or reporter | Fluorescence intensity with suitable excitation and emission bands. | Sensitivity in the actual sample matrix, background, and detector saturation. |
| Luminescence | Luminescence capability. | Timing and any requirement for reagent injection. |
| No dependable optical signal | Suitable direct analytical measurement, or a separately validated coupled assay. | A plate reader alone does not solve this assay. |

Clear plates are commonly used for absorbance; black plates reduce background and crosstalk in fluorescence measurements; white plates are commonly used for luminescence. Check the exact plate specification, especially at UV wavelengths and when reading through the bottom. [Corning plate-selection guide](https://www.corning.com/catalog/cls/documents/selection-guides/CLS-DD-081.pdf)

Use these acceptance criteria when evaluating a reader:

1. **Correct optics:** demonstrate the actual assay with its intended plates, volumes, and sample matrix.
2. **Adequate timing:** repeated reads must resolve the reaction. Check full-plate cycle time and the delay between reagent addition and the first measurement. Fast reactions may need an injector, fewer wells per run, or an alternative assay format.
3. **Appropriate temperature and mixing:** verify the required temperature range and equilibration behavior. Incubation and shaking are available on many readers, but capabilities vary by model. [Manufacturer explanation](https://www.bmglabtech.com/en/incubation-and-shaking/)
4. **Useful raw export:** time, well identity, signal, and measurement settings must be recoverable in a usable format such as CSV or XLSX.
5. **Working software:** confirm operating-system compatibility, license transfer, cables, manuals, and support, particularly for used instruments.
6. **Repeatable measurements:** run blanks, standards, and repeated parent samples across the plate before accepting the instrument for screening.

For one validated colorimetric assay, consider an absorbance reader. For multiple planned assay types, absorbance plus fluorescence provides more flexibility. Additional modes should follow an actual assay requirement.

### Alternative: York-style whole-plate imaging

York's group used a roughly 10-cm field of view to image an entire plate. Their system combined a PCO edge 4.2 bi camera, a Zeiss 100-mm lens, filtered blue/violet LEDs, NI control hardware, and Python. For pH-Countdown, colony transfers onto nitrocellulose allowed control of the chemical environment. Their reported screening capacity was approximately 10⁴ colonies/day. [York setup and screening notes](https://andrewgyork.github.io/relaxation_sensors/appendix.html)

For an enzyme adaptation, the proposed minimum imaging assembly is:

- A camera with reproducible exposure and unprocessed image export.
- A lens resolving individual colonies or assay spots across the plate.
- Suitable illumination and, for fluorescence, excitation/emission filtering.
- A light-excluding enclosure and rigid, repeatable sample positioning.
- Exposure/illumination control; hardware triggering if the assay requires precise timing.
- Image analysis that identifies spots, subtracts background, and maps hits back to recoverable clones.

Proceed only after showing that the signal remains associated with its source clone and predicts activity in a separate assay. Diffusing products, overlapping spots, uneven lighting, and variable colony growth are design issues to test. A faster camera cannot compensate for an unreliable association between signal and clone.

York's MagLOV screen added an electromagnet controlled by an Arduino. That was specific to measuring magnetoresponse and is not part of the general enzyme platform. [MagLOV instrumentation](https://andrewgyork.github.io/gfp_magnetofluorescence/appendix.html)

A custom build deserves a comparison that includes assembly, calibration, maintenance, and operator time. Published open-source plate-reader designs demonstrate another possible route, but their suitability must be checked against the chosen assay. [An Open-Source Plate Reader](https://pmc.ncbi.nlm.nih.gov/articles/PMC7144579/)

## 5. The software needed to make the cycle reproducible

Start with the first four capabilities below. Add the remaining tools when the workload calls for them.

| Capability | Practical starting choice | Role in the workflow |
| --- | --- | --- |
| **Sequence editing and inspection** | [ApE](https://jorgensen.biology.utah.edu/wayned/ape/) or an existing licensed sequence editor. | Maintain the parent plasmid, annotate changes, and review designs. ApE is available without a purchase fee. [Licensing information](https://jorgensen.biology.utah.edu/wayned/ape/Donations.html) |
| **Primer design** | A tool matched to the construction method; [NEBaseChanger](https://nebasechanger.neb.com/) for Q5 site-directed mutagenesis. | Produce method-compatible primers. Batch saturation-library design needs additional checking. |
| **Sample tracking and initial analysis** | [LibreOffice Calc](https://www.libreoffice.org/) or existing spreadsheet software. | Plate maps, clone inventory, raw-data joins, simple rate calculations, and pilot plots. |
| **Acquisition** | The instrument's supported software. | Save reusable measurement settings and export raw data. |
| **Repeatable batch analysis** | Python with [JupyterLab](https://jupyter.org/), [pandas](https://pandas.pydata.org/docs/getting_started/), [SciPy](https://scipy.org/), and [Matplotlib](https://matplotlib.org/). | Import measurements, fit appropriate time windows, compare controls, flag problems, and produce reports. Recommended as plate numbers grow. |
| **Batch sequence processing** | [Biopython](https://biopython.org/wiki/SeqIO). | Read sequence files, including ABI traces and quality scores, and support automated sequence checks. |
| **Image analysis** | [Fiji/ImageJ](https://fiji.sc/). | Process colony/spot images for the imaging route. |
| **Custom instrument control** | Vendor interfaces or [Micro-Manager](https://micro-manager.org/), where the exact devices are supported. | Coordinate cameras and illumination; validate compatibility before buying hardware. |

A normal workstation is adequate for these starting tasks. GPU-based models, machine learning, a laboratory information-management system, and a custom web application are optional later investments.

For sequencing review, ensure the chosen editor or sequencing-service viewer can display chromatograms and alignments. Review ambiguous calls before assigning a verified mutation, and check the full enzyme coding sequence in confirmed hits.

### Minimum data structure

Keep three linked records, using stable identifiers rather than relying on filenames alone:

| Record | Minimum contents |
| --- | --- |
| **Clone/variant register** | Unique clone ID, parent, round, intended mutation, verified sequence status, and physical stock location. |
| **Plate map** | Plate ID, well, clone ID, sample type, condition, dilution, and biological/technical replicate identifiers. |
| **Measurement record** | Run ID, plate/well, timestamp, signal and units, assay version, instrument settings, and raw-file location. |

Preserve raw exports unchanged. Save analysis settings and derived results separately. Retain original sequence traces and the lab record of each preparation. Back up both digital records and the information locating physical stocks. Version control can help with scripts and assay definitions; it does not replace a data backup.

For the pilot, the analysis should produce a plate heatmap, control distributions, relevant time traces, and a candidate table linked to recoverable stocks. Define quality flags for missing controls, saturated signals, non-linear traces, and unusable wells before ranking candidates.

## 6. Run a small pilot before expanding the library

**The first milestone is a trustworthy, repeatable cycle, including clone recovery.** Discovering an improved enzyme is a subsequent biological outcome and is not guaranteed by a successful equipment pilot.

1. **Establish the parent assay.** Show a usable signal above appropriate blanks and host/background controls. Test a dilution series and reaction time course to find a quantitative measurement range. Check the effect of the sample matrix on the readout.

2. **Measure variation across the workflow.** Grow and prepare parent controls independently, then repeat the assay across plate positions and on another day. Technical repeats measure dispensing/reading variation; independent cultures also capture expression and preparation variation. Use the measured noise to decide what improvement is detectable.

3. **Exercise tracking and recovery.** Follow a small set of known samples from stored clone to culture, measurement, analysis, and recovered stock. Include distributed parent controls on every screening plate. Avoid designs that confound a variant group with a plate edge or processing order.

4. **Build a library that fits the pilot.** A focused set of substitutions or a small number of separately tracked saturation libraries is a practical first test. Check sequence identity, mutation distribution, and parental background on representative clones. An ordinary spreadsheet is sufficient to plan this first library.

5. **Screen and confirm.** Rank candidates using the predefined score. Re-grow promising clones from retained stocks and repeat the assay from independent preparations. Confirm sequences; where needed, reconstruct a mutation in the parent background. Use the intended substrate and a product-specific assay for the final comparison.

6. **Choose the next parents.** Archive the previous parent and confirmed hits. Record the improvement, uncertainty, and any loss in another required property. Maintain separate identities when carrying several candidates forward.

For activity-per-enzyme claims, compare appropriately quantified enzyme preparations. Culture density is useful context but is not a measurement of active enzyme concentration. Increased activity per culture can be a useful production improvement; describe it accordingly.

### Size the library using measured capacity

Count the whole workflow: picking, growth, preparation, assay setup, reading, analysis, recovery, and confirmation. Reader speed alone is not throughput.

An illustrative capacity calculation: with 16 wells reserved for controls, a 96-well plate has 80 sample wells. At two technical assay wells per clone, that is 40 clones per plate, or 160 across four plates. Independent cultures and confirmation consume additional capacity. These are planning numbers, not a recommended universal plate layout.

A protein with L residues has 19L possible single-amino-acid substitutions relative to its parent. Sampling that many colonies does not guarantee observing every substitution. Degenerate-codon libraries contain repeats and unequal amino-acid probabilities; common NNK designs also include a stop codon and can regenerate the parent residue. Plan coverage explicitly before claiming an exhaustive scan.

York found single-residue libraries better matched to their screen than broad random mutagenesis. They also reported useful progress from retaining several winners, and regretted postponing screening upgrades. These are relevant design lessons, rather than guarantees for every enzyme. [York's evolution lessons](https://andrewgyork.github.io/relaxation_sensors/appendix.html)

## 7. Purchase in stages

| Priority | Obtain or arrange access to | Evidence needed before spending more |
| --- | --- | --- |
| **First** | Routine molecular-biology facilities, compatible shared reader, multichannel pipette, culture/assay plates, sequencing, and sample-tracking software. | Parent assay works and samples remain recoverable. |
| **Next** | Reliable plate growth/centrifugation, validated preparation method, independent hit-confirmation access, and repeatable analysis. | A small screening batch produces interpretable results across preparations and days. |
| **Then** | Dedicated reader, electronic dispensing, improved temperature control, or other equipment addressing measured delays or errors. | Quantified bottleneck and expected improvement in usable results per unit cost. |
| **Later, if justified** | 384-well miniaturization, liquid-handling robot, automated colony picker, imaging station, droplets, or cell sorting. | The assay remains valid in the new format and the added throughput is usable. |

An electroporator, automated purification system, and in-house sequencer are conditional purchases. Choose them only when transformation efficiency, purification volume, or sequencing demand justifies ownership.

York reported approximately $1,000 for 284 MagLOV primers and approximately $60 to update primers around a new winner. These were historical primer expenses, excluding the rest of a round. Use them as an example of balancing reagent spending against labor, not as a current project budget. [MagLOV library costs](https://andrewgyork.github.io/gfp_magnetofluorescence/appendix.html)

Track total operating cost per confirmed candidate: consumables, sequencing, instrument access, labor, failed batches, and confirmation. Keep initial equipment spending separate so ownership can be compared with shared access.

## 8. Starter checklist

- [ ] Parent enzyme, host, intended substrate, and primary improvement metric are defined.
- [ ] Routine lab infrastructure and standard protocols are available.
- [ ] The activity assay has been demonstrated on the proposed instrument and plates.
- [ ] Reaction timing, temperature, sample preparation, and liquid handling are repeatable.
- [ ] Each measured sample links to a recoverable clone and a plate map.
- [ ] Instrument settings and raw data can be exported and backed up.
- [ ] Controls and an analysis rule are defined before screening.
- [ ] Sequencing and independent hit confirmation are available.
- [ ] Library size fits measured end-to-end capacity, including confirmation.
- [ ] Further equipment purchases address a demonstrated bottleneck.
