# Equipment, software, and purchasing

[Handbook home](../Directed_Evolution_Handbook.md)

## Choose a complete configuration

The following are proposed configurations, not vendor bundles. All require routine molecular-biology infrastructure. “Access” may mean ownership, a shared facility, or a service agreement.

| Component | A: shared laboratory pilot | B: dedicated manual screening | C: partly automated screening |
| --- | --- | --- | --- |
| Construction | Shared thermocycler, gel system, centrifuge and cloning tools. | Same tools with booked or dedicated capacity. | Same, with batch construction handling if justified. |
| Expression | Small culture batches; compatible shaking access. | Plate culture fixtures, reproducible seals and plate centrifugation. | Validated plate logistics and sufficient growth capacity for automated batches. |
| Liquid handling | Single-channel and multichannel pipettes. | Multichannel/electronic pipetting or a dispenser for repetitive additions. | Liquid handler for validated transfers plus manual exception handling. |
| Assay instrument | Shared compatible reader. | Dedicated reader matching the actual assay. | Same detection requirement, plus reliable integration and recovery after interruption. |
| Sample identity | Written labels and digital plate maps. | Consistent identifiers, inventory and retained stocks. | Barcodes where helpful, checked transfer maps and event records. |
| Confirmation | Sequencing and shared analytical access. | Same, with enough booking capacity for candidate batches. | Same, scaled to prevent confirmation becoming the limiting step. |
| Software | Sequence editor, spreadsheet, reader software and example analysis. | Reusable acquisition methods and batch analysis. | Versioned transfer scripts, supported interfaces and monitored exceptions. |
| Best initial use | Demonstrating feasibility with limited acquisition spending. | Repeated campaigns with a stable assay and regular workload. | A documented repetitive bottleneck after the manual workflow is stable. |

## Routine equipment inventory

List these without elaborating standard procedures: pipettes/tips/reservoirs, thermocycler, DNA gel and imaging access, microcentrifuge, vortex mixer, heating block/water bath, incubator and shaking incubator, balance, pH meter, water/sterilization facilities, refrigeration and freezing, long-term stock storage, DNA/protein quantification, protein gel and purification access. Confirm sequencing access before screening.

Electroporation is conditional on the chosen construction/transformation workflow. A low-speed plate spinner does not substitute for a centrifuge capable of the intended cell-pelleting operation. A sonicator is unnecessary if a different preparation method is effective and reproducible.

## Verify compatibility before buying

Follow the physical sample: culture vessel → shaker fixture → centrifuge carrier → transfer device → assay plate → reader → retained source stock. Check actual plate height, working volume, sealing requirements, rotor compatibility and instrument software. A component can meet its individual specification and still fail to fit this chain.

For a reader, demonstrate the intended sample and assay rather than relying on a generic sensitivity claim:

| Requirement | Demonstration |
| --- | --- |
| Correct detection mode | Absorbance wavelength, fluorescence excitation/emission, or luminescence matches the assay. |
| Useful measurement range | Matrix-matched standards and parent dilution series resolve relevant signals without saturation. |
| Reaction timing | Full-plate reading and reagent-addition delays resolve the intended time interval. |
| Temperature | Required range, equilibration and stability work with the actual plates and volumes. |
| Mixing | Mixing is adequate without bubbles or unacceptable settling. |
| Export | Raw well-level observations, times and settings can be retained in an accessible format. |
| Computer support | Software, license, drivers, cables and operating-system compatibility are established. |

Reader incubation and shaking capabilities differ between models; manufacturer documentation is a starting point for acceptance tests. [BMG Labtech incubation and shaking](https://www.bmglabtech.com/en/incubation-and-shaking/)

For NADH/NADPH assays, verify 340-nm operation and plate transmission. Clear plates commonly serve absorbance assays, black plates reduce fluorescence background/crosstalk, and white plates commonly serve luminescence. Check exact plate properties, including bottom-reading requirements. [Corning selection guide](https://www.corning.com/catalog/cls/documents/selection-guides/CLS-DD-081.pdf)

A basic absorbance reader may meet one colorimetric assay. Absorbance plus fluorescence provides flexibility for multiple planned assays. Fast reactions may require injection, smaller read batches, or another assay format. Additional detection modes should follow a specific need.

## Custom imaging and low-cost construction

York's photography system used a roughly 10-cm field of view, a PCO edge 4.2 bi camera, Zeiss 100-mm lens, filtered LEDs, NI control hardware and Python. The reported throughput was approximately 10⁴ colonies/day. [York setup](https://andrewgyork.github.io/relaxation_sensors/appendix.html)

An enzyme-oriented build needs a stable camera/lens, controlled illumination, suitable filters, a light-excluding enclosure, repeatable positioning and quantitative image analysis. Define minimum resolvable spot separation, acceptable lighting variation and signal range using the actual assay. Test product diffusion and clone recovery. Do not infer catalytic performance from colony brightness alone.

Custom and open-source readers are a possible route when engineering capacity is available. Published designs provide useful component and benchmarking examples. Their published cost and sensitivity do not establish the price or performance of a new local build. Include assembly, calibration, maintenance and failed-development time in the comparison. [An Open-Source Plate Reader](https://pmc.ncbi.nlm.nih.gov/articles/PMC7144579/)

## Software: one default route

| Function | Starting choice | Retained output |
| --- | --- | --- |
| Sequence editing | [ApE](https://jorgensen.biology.utah.edu/wayned/ape/) or an existing sequence editor. | Annotated parent/variant files and traceable numbering. |
| Primer design | Method-matched software such as [NEBaseChanger](https://nebasechanger.neb.com/) for Q5. | Primer design, target and construction-method record. |
| Tracking and planning | [LibreOffice Calc](https://www.libreoffice.org/) or existing spreadsheet software. | Plate maps, clone register, budget and assay record. |
| Acquisition | Supported vendor software. | Raw measurements and saved settings. |
| Primary-screen analysis | Supplied Python program and, for plots, [Matplotlib](https://matplotlib.org/). | Quality report, candidate list, well-level calculations and plots. |
| Larger analysis work | [JupyterLab](https://jupyter.org/), [pandas](https://pandas.pydata.org/docs/getting_started/) and [SciPy](https://scipy.org/), when needed. | Reproducible notebooks/scripts and recorded environment. |
| Sequence batches | [Biopython](https://biopython.org/wiki/SeqIO), when useful. | Sequence parsing and trace/quality processing. |
| Imaging | [Fiji](https://fiji.sc/) and supported control software. | Original images, segmentation settings and spot-to-clone map. |

The supplied example intentionally keeps the calculation core in Python's standard library; plotting is the only external dependency. [Toolkit instructions](../toolkit/README.md) give installation, commands, expected outputs and adaptation limits. A normal workstation is sufficient. A GPU or machine-learning service is not required for this starter route.

For custom imaging, [Micro-Manager](https://micro-manager.org/) supports many devices, but check the exact hardware and driver combination. Avoid choosing hardware on the assumption that an undocumented interface can be automated later.

Keep raw files unchanged and separate from derived outputs. A stable clone ID should link parent/round, preparation, plate/well, verified sequence and physical stock. Back up records and test restoration. Source control is useful for scripts and definitions; it does not replace a raw-data backup or physical-stock archive.

## Costs and procurement

Use the workbook's **Round budget** to estimate recurring costs. Its default example has four primary plates, one repeat plate, 160 primary clone slots and an assumed 90% usable fraction. It budgets eight confirmation candidates with three independent preparations each. Under its deliberately illustrative NOK inputs, total recurring cost is **22,869 NOK**, or **158.81 NOK per expected usable clone**. These are model outputs, not a price quote or prediction of biological success.

The **Equipment quotes** sheet leaves purchase prices blank. Enter dated local quotes, specify tax/freight/service exclusions, and mark available/shared items accordingly. Shared access may have zero acquisition cost while still carrying an operating fee. Routine lab infrastructure is assumed available; add missing infrastructure to the inventory and budget before interpreting the configuration as affordable.

Compare ownership with shared access using incremental costs. A simple screening-equipment break-even calculation is purchase/setup cost divided by annual access fees avoided minus added annual maintenance, consumables and labor. Use it only when the denominator is positive and the compared service levels are equivalent. A low capital price can be offset by integration time or unreliable access to repairs.

For used equipment, check optics/installed modules, service history, instrument health, transferable license, compatible computer, consumables availability, calibration/verification options and a return or acceptance arrangement. Use the [acceptance checklist](../toolkit/templates/Equipment_Acceptance.md) with real samples before relying on the instrument.

Before automation, quantify time and errors in the manual method. Verify transfers at the actual volumes and liquid properties, including carryover and dead volume. Vendor accuracy specifications are volume- and hardware-specific; they are not proof of performance with a different liquid or protocol. [Opentrons pipette specifications](https://docs.opentrons.com/flex/system-description/pipettes/)
