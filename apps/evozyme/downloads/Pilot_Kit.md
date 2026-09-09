# Evozyme pilot kit

Prepared 9 September 2026 for the 1.2 workflow. **Status: materials prepared; no participants recruited and no user pilot conducted.**

## Purpose and participants

Observe whether a first-time reader and an experienced laboratory user can connect the overview, handbook and planner, prepare a supported import, interpret evidence and recover a backup. Use one session per participant initially. Recruit only after the project owner supplies participants or authorizes recruitment. Obtain consent for notes or recordings; use appropriately de-identified files if real instrument exports are supplied.

## Preparation

- Use a supported current browser and a fresh test campaign. Keep participants' real records separate.
- Supply the synthetic example, its CSV/JSON files and the wide-minute CSV. State that no experiment occurred.
- Record browser/device, participant experience and prior exposure to Evozyme. Agree whether timing includes handbook reading.
- The facilitator should avoid teaching the workflow before the baseline attempt. Ask the participant to explain what they expect before clicking. Record help when it is needed.
- Keep a known-good backup and external evidence folder for the recovery exercise. Never test by deleting a participant's records.

## First-time reader walkthrough

| Task | Completion evidence | Observe |
| --- | --- | --- |
| Read the overview and explain one round | Participant identifies planning, lab work, screening, confirmation and iteration | Confusion between app stages and laboratory work |
| Start a campaign in guided view | Name, parent ID, improvement, comparison and measurement route entered | Unfamiliar terms, fields skipped, use of examples/chapter links |
| Review access and capacity | A shared reader is recorded and a missing capability identified | Whether illustrative costs are mistaken for quotes |
| Use six parent preparations and two technical wells | Control reservation corrected from 16 to 20; four-plate capacity changes to 152 | Whether preparation and technical replicate are distinguished |
| Import the synthetic screen | Maps and units reviewed, settings acknowledged, result retained | Preparation time, failed imports, assistance and backtracking |
| Explain C03 and C11 | Both require independent confirmation; screen nomination is not proof | Misread control status, folds or evidence completeness |
| Export and restore as a separate copy | Original campaign and restored copy remain available | Backup location, external evidence expectations and recovery confusion |

## Experienced laboratory user walkthrough

1. State the intended reaction, comparison basis and sample-preparation unit. Identify what would need assay-specific validation.
2. Review equipment acceptance, costs and realistic throughput; record the gap between planned and observed workload if actual evidence exists.
3. Import the wide-minute fixture without rewriting it into long CSV. Explain which metadata are supplied by the settings rather than the file.
4. Load a well in the plate editor, correct an intentional identity mismatch, then inspect replicate and stock identities. Test cancellation before retaining the final import.
5. Review a changed settings file. Verify that acknowledgement is requested again and earlier snapshots remain unchanged.
6. Inspect confirmation observations, normalization, optional targets, secondary properties and analyst rationale. Explain exactly what one linked next round creates.
7. Open the same test campaign in two tabs, edit both, and preserve both versions through the conflict panel. Restore a backup as a separate copy and locate original exports, recipe, canonical inputs and external evidence.

If representative reader exports are available, first record their layout, units, missing metadata and preprocessing needs. Attempt an import only within the declared generic CSV contract. Record unsupported cases without claiming reader compatibility from the synthetic fixture.

## Observation sheet

One row per task or failed attempt. Blank values mean not observed, not zero.

| Participant code | Experience | Task | Start/end | Completed without help? | Preparation minutes | Import minutes | Failed attempts | Help supplied | Misunderstood field/label | Expected versus observed result | Planned/observed workload | Severity | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | | | | | |

Record exact words or actions where practical. Distinguish a software defect from missing scientific information, unsupported file format and usability confusion. Record abandoned tasks. Do not combine technical wells with independent preparations when describing workload.

## Debrief

Ask which step was hardest, which labels were unclear, where the participant expected a different action, what they would need before using real data, and which missing capability would save measurable work. Ask them to locate the original source file for one saved result and explain what is outside the backup.

## Decision record and extension rubric

Establish the baseline from observed completion, preparation/import time, failed attempts and help before setting numerical improvement targets. Use this decision table after the pilot; do not fill it with invented findings.

| Proposed change | Observed difficulty / participant evidence | Frequency | Consequence | Representative data available? | Scientific validation cases needed | Implementation effort | Decision and reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Endpoint assays | Pending pilot | | | | Endpoint controls, dynamic range and independent confirmation | | |
| Further plate formats | Pending pilot | | | | Geometry, identities, capacity, control distribution | | |
| Reader-specific adapters | Pending pilot | | | | Representative exports, units, locale, timing, metadata | | |
| Sequence comparisons | Pending pilot | | | | Identity, alignment, numbering and mutation provenance | | |
| Lineage views | Pending pilot | | | | Single/multiple-parent semantics and historical links | | |
| Collaboration | Pending pilot | | | | Permissions, conflict handling, audit and recovery | | |

Prioritize record-loss or incorrect-comparison defects first. Then address repeated blockers within the supported workflow. Choose an analytical extension only when real demand, representative inputs and validation cases are available. Record the decision to defer as well as the decision to proceed. Cloud accounts and automatic significance claims are not prerequisites.
