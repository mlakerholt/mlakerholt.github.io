# Pressure and geometry gap review

Reviewed 2026-09-11. Updated 12 Thermo presets; 59 other presets remain byte-equivalent as records. No physics-engine changes.

## Applied corrections

- S.U.F. 30/300 L: BPC ceiling 0.03 bar; atmospheric starting pressure. Explicit bar value retained despite rounded psi equivalent. Source: existing fermentor guide, PDF p. 21.
- DynaDrive 50/500 L: conservative 0.030 bar ceiling, explicitly an unresolved choice between 30 and 34 mbar in the archived manual (PDF pp. 6/8). Atmospheric starting pressure.
- Six HyPerforma 5:1 SUBs: direct chamber and impeller diameters, liquid heights, one pitched three-blade impeller, manufacturer-calculated Np 2.1, no baffles; BPC ceiling 0.03 bar. DOC0022 Rev. H, February 2021, PDF pp. 142/145/148/151/154/157 and p. 9.
- SUB speed ceilings use published 20%-fill / 20 W/m3 RPM values (107/85/69/59/50/44), selected as constant app ceilings, not claimed as motor maxima. PDF p. 119 specifies a low-fill P/V restriction; the app still lacks a fill-dependent governor. Base RPM is reduced only where necessary. Published rounded settings assume water-like fluid; not certified operating instructions.
- DynaDrive 3000/5000 L: direct 250 L minima, total volumes 3730/5585 L, 1.37 m chamber, liquid heights 2.05/3.42 m, 0.49 m impeller, 3/5 mixed impeller assemblies and 0.034 bar maximum bag pressure. Source: DOC0176ES Rev. A, February 2022, PDF pp. 48-49. Generic pitched representation and power number remain assumptions.

## Conflicts retained

- Large DynaDrive: guide liquid H/D 1.7/2.9 disagrees with its absolute dimensions. H/D is calculated from the direct dimensions, not silently copied.
- Large DynaDrive: VFD 0-85 rpm on p. 48 versus motor 0-90 rpm on p. 49. Conservative 85 rpm selected as an assumption.
- Large DynaDrive: 3000 L brochure ratio 12.5:1 would imply 240 L if used literally; direct 250 L minimum wins.
- SUB 2000 L: hardware impeller 39.7 cm versus agitation calculation table 39.8 cm. Hardware dimension retained. Table 4.12 also says >50% fill for standard agitation, whereas the operating chapter describes controlled 20-50% fill; no unrestricted low-fill capability is claimed.
- Existing Merck and other-source conflicts are unchanged.

## Search outcomes and follow-up leads

- [Thermo 5:1 SUB guide](https://documents.thermofisher.com/TFS-Assets%2FBPD%2Fmanuals%2F5to1-single-use-bioreactor-users-guide.pdf): archived as originals/thermo-sub-5to1-user-guide-b628fb94036b.pdf and applied.
- [Large DynaDrive datasheet](https://assets.thermofisher.com/TFS-Assets/BPD/Datasheets/3000-and-5000l-dynadrive-sub-data-sheet.pdf): publisher download returned 403; no original claimed. Alternative [manufacturer Spanish setup guide](https://documents.thermofisher.com/TFS-Assets/BPD/Reference-Materials/unpacking-and-setup-guide-3000l-5000l-dynadrive-single-use-bioreactors-spanish.pdf) downloaded and applied; originals/thermo-dynadrive-3000-5000-setup-es-bed67ef725fc.pdf.
- [Sartorius Cplus brochure](https://www.sartorius.com/resource/blob/9612/d0570ac276d516c5bb5882ce982b0ea5/broch-biostat-cplus-sbi1505-e-data.pdf): same already-archived ratio evidence, not a newly verified absolute diameter.
- [Ambr 250 HT Generation 2 datasheet](https://www.sartorius.com/download/1676722/ambr-250-ht-gen2-datasheet-en-b-pdf-data.pdf): promising dimensions but different platform from the selected Modular preset. Not transferred or archived as matching evidence.
- [Sartorius microbial characterization poster](https://www.sartorius.com/download/921538/ambr250m-biostatstr-upstream-microbial-process-a0poster-en-sartorius-data.pdf): follow-up lead requiring complete geometry and configuration review; not yet applied.
- [Cytiva engineering-document FAQ](https://faq.cytivalifesciences.co.jp/Detail.aspx?id=2488&isCrawler=1): follow-up lead. Located standard XDR data do not establish a matching absolute chamber/impeller dimension in this pass. APS-integrated operating limits were not transferred to standalone XDR.

## Remaining direct-evidence gaps

Counts exclude 11 rocking presets, Breez and three custom templates. They count missing source-supported model fields, not proof that no document exists. Conservative conflict choices count as assumptions.

| Field | Presets lacking source-supported values |
|---|---:|
| minVolume | 1/56 |
| maxVolume | 0/56 |
| vesselDiameter | 25/56 |
| liquidHeight | 35/56 |
| impellerDiameter | 25/56 |
| powerNumber | 39/56 |
| maxRpm | 31/56 |
| maxPressure | 39/56 |

### Per-model remaining gaps

| Model | Fields without direct support |
|---|---|
| Ambr 15 Cell Culture Generation 2 - 10-15 mL working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Ambr 250 Modular - microbial dual-Rushton vessel, 100-250 mL | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Univessel® Glass 1 L — 1 L vessel | powerNumber, maxRpm, maxPressure |
| Univessel® SU 2 L — 0.6–2 L working volume | liquidHeight, powerNumber, maxRpm |
| Univessel® Glass 2 L — 2 L vessel | powerNumber, maxRpm, maxPressure |
| Biostat Cplus 5 L - 2:1 vessel, 6-blade disc configuration (legacy) | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Univessel® Glass 5 L — 5 L vessel | powerNumber, maxRpm, maxPressure |
| Biostat Cplus 10 L - 3:1 vessel, 6-blade disc configuration (legacy) | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Univessel® Glass 10 L — 10 L vessel | powerNumber, maxRpm, maxPressure |
| Univessel® SU 10 L Essential — 2.5–10 L working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Univessel® SU 10 L Perfusion — 2.5–10 L working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Univessel® SU 10 L Cell Therapy — 4.3–10 L working volume | minVolume, vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Biostat Cplus 15 L - 3:1 vessel, 6-blade disc configuration (legacy) | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Biostat Cplus 20 L - 3:1 vessel, 6-blade disc configuration (legacy) | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Biostat Cplus 30 L - 3:1 vessel, 6-blade disc configuration (legacy) | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Biostat STR® Microbial 50 L — 11–40 L working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Biostat STR Generation 3 50 L - DeltaV, dual 3-blade configuration | powerNumber, maxPressure |
| Biostat D-DCU 200 L - 3:1 microbial vessel (legacy) | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Biostat STR Generation 3 200 L - DeltaV, dual 3-blade configuration | powerNumber, maxPressure |
| Biostat STR Generation 3 500 L - DeltaV, dual 3-blade configuration | powerNumber, maxPressure |
| Biostat STR Generation 3 1000 L - DeltaV, dual 3-blade configuration | powerNumber, maxPressure |
| Biostat STR Generation 3 2000 L - DeltaV, dual 3-blade configuration | powerNumber, maxPressure |
| Mobius® 3 L Single-use Bioreactor — 3 L vessel | liquidHeight, maxRpm, maxPressure |
| Mobius iFlex 50 L - development design (2023/2024 evidence) | liquidHeight, maxRpm, maxPressure |
| Mobius® iFlex 200 L Bioreactor — 40–200 L working volume | liquidHeight |
| Mobius iFlex 1000 L - development design (2023/2024 evidence) | liquidHeight, maxRpm, maxPressure |
| Mobius® iFlex 2000 L Bioreactor — 400–2000 L working volume | liquidHeight |
| Thermo Scientific™ HyPerforma™ Glass Bioreactor 1 L | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Thermo Scientific™ HyPerforma™ Glass Bioreactor 3 L | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Thermo Scientific™ DynaDrive™ Single-use Bioreactor 5 L | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Thermo Scientific™ HyPerforma™ Glass Bioreactor 7 L | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Thermo Scientific™ HyPerforma™ Glass Bioreactor 15 L | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Thermo Scientific™ HyPerforma™ S.U.F. 30 L — 6–30 L working volume | maxRpm |
| Thermo Scientific™ DynaDrive™ Single-use Bioreactor 50 L — 5–50 L working volume | powerNumber, maxRpm, maxPressure |
| Thermo Scientific™ HyPerforma™ 5:1 S.U.B. 50 L — 10–50 L working volume | maxRpm |
| Thermo Scientific™ HyPerforma™ 5:1 S.U.B. 100 L — 20–100 L working volume | maxRpm |
| Thermo Scientific™ HyPerforma™ 5:1 S.U.B. 250 L — 50–250 L working volume | maxRpm |
| Thermo Scientific™ HyPerforma™ S.U.F. 300 L — 60–300 L working volume | maxRpm |
| Thermo Scientific™ DynaDrive™ Single-use Bioreactor 500 L — 25–500 L working volume | powerNumber, maxPressure |
| Thermo Scientific™ HyPerforma™ 5:1 S.U.B. 500 L — 100–500 L working volume | maxRpm |
| Thermo Scientific™ HyPerforma™ 5:1 S.U.B. 1000 L — 200–1000 L working volume | maxRpm |
| Thermo Scientific™ HyPerforma™ 5:1 S.U.B. 2000 L — 400–2000 L working volume | maxRpm |
| Thermo Scientific™ DynaDrive™ Single-use Bioreactor 3000 L — 250–3000 L working volume | powerNumber, maxRpm |
| Thermo Scientific™ DynaDrive™ Single-use Bioreactor 5000 L — 250–5000 L working volume | powerNumber, maxRpm |
| Cytiva Xcellerex™ XDR-10 — 4.5–10 L working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Cytiva Xcellerex X-platform 50 L - downflow configuration | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Cytiva Xcellerex XDR-50 - 25-50 L working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Cytiva Xcellerex X-platform 200 L - downflow configuration | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxPressure |
| Cytiva Xcellerex XDR-200 - 40-200 L working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Cytiva Xcellerex XDR-500 - 100-500 L working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Cytiva Xcellerex XDR-1000 - 200-1000 L working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Cytiva Xcellerex XDR-2000 - 400-2000 L working volume | vesselDiameter, liquidHeight, impellerDiameter, powerNumber, maxRpm, maxPressure |
| Mobius 50 L - 2021 specification (NOT iFlex) | liquidHeight |
| Mobius 200 L - 2021 specification (NOT iFlex) | liquidHeight |
| Mobius 1000 L - 2021 specification (NOT iFlex) | liquidHeight |
| Mobius 2000 L - 2021 specification (NOT iFlex) | liquidHeight |

Material variants, power coefficients, liquid-dependent speed envelopes and manufacturer corrections still need work. Search leads are not verified specifications. Archive hashes and runtime/stat-sheet consistency are tested separately.
