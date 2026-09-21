(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : "—";
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const ROLE_OPTIONS = [
    ["carbon", "Carbon source"],
    ["nitrogen", "Nitrogen source"],
    ["phosphate", "Phosphate / buffer"],
    ["buffer", "Buffer"],
    ["magnesium", "Magnesium"],
    ["mineral", "Mineral / salt"],
    ["trace", "Trace elements"],
    ["vitamin", "Vitamin"],
    ["complex", "Complex nutrient"],
    ["antibiotic", "Antibiotic"],
    ["inducer", "Inducer"],
    ["amino-acid", "Amino acids"],
    ["lipid", "Lipids / growth factors"],
    ["antifoam", "Antifoam"],
    ["other", "Other"]
  ];

  const { IMPELLERS, SPARGER_FACTORS, effectiveCarbon, sumRole, hasComplex, validateScenario, powerAndKla, controllerSettings, feedRateLh, temperatureFactor, phFactor, airOxygenSaturation, simulate } = window.FermentationModel;

  const REACTORS = {
    "lab-glass-10": {
      name: "Laboratory glass fermenter — 10 L",
      note: "Generic baffled laboratory microbial fermenter. Geometry and limits are illustrative.",
      totalVolume: 10,
      initialVolume: 6,
      maxWorkingVolume: 8,
      vesselDiameter: 0.21,
      liquidHeight: 0.70,
      heightDiameterRatio: 3.3,
      baffled: true,
      maxPressure: 0.5,
      operatingPressure: 0.05,
      impellerType: "rushton",
      impellerCount: 2,
      impellerDiameter: 0.07,
      baseRpm: 300,
      maxRpm: 1200,
      baseVvm: 0.5,
      maxVvm: 2.0,
      maxOxygenFraction: 100,
      spargerType: "ring"
    },
    "sartorius-str-style-40": {
      name: "Sartorius STR-style microbial system — 40 L",
      note: "Conceptual preset based on a compact single-use microbial STR equipment class; not a certified Sartorius specification.",
      totalVolume: 50,
      initialVolume: 22,
      maxWorkingVolume: 40,
      vesselDiameter: 0.36,
      liquidHeight: 1.15,
      heightDiameterRatio: 3.2,
      baffled: true,
      maxPressure: 0.5,
      operatingPressure: 0.1,
      impellerType: "parabolic",
      impellerCount: 2,
      impellerDiameter: 0.11,
      baseRpm: 180,
      maxRpm: 500,
      baseVvm: 0.3,
      maxVvm: 1.5,
      maxOxygenFraction: 100,
      spargerType: "micro"
    },
    "thermo-esuf-style-30": {
      name: "Thermo eS.U.F.-style fermenter — 30 L",
      note: "Conceptual high-aspect-ratio single-use microbial fermenter preset; verify all values against the selected Thermo system.",
      totalVolume: 35,
      initialVolume: 18,
      maxWorkingVolume: 30,
      vesselDiameter: 0.30,
      liquidHeight: 0.90,
      heightDiameterRatio: 3.0,
      baffled: true,
      maxPressure: 0.3,
      operatingPressure: 0.05,
      impellerType: "rushton",
      impellerCount: 3,
      impellerDiameter: 0.10,
      baseRpm: 180,
      maxRpm: 600,
      baseVvm: 0.4,
      maxVvm: 2.0,
      maxOxygenFraction: 100,
      spargerType: "drilled"
    },
    "merck-mobius-style-50": {
      name: "Merck Mobius-style single-use STR — 50 L",
      note: "General single-use STR archetype. It may be oxygen-transfer limited for high-density bacterial culture.",
      totalVolume: 62,
      initialVolume: 30,
      maxWorkingVolume: 50,
      vesselDiameter: 0.42,
      liquidHeight: 0.90,
      heightDiameterRatio: 2.15,
      baffled: false,
      maxPressure: 0.2,
      operatingPressure: 0.03,
      impellerType: "pitched",
      impellerCount: 2,
      impellerDiameter: 0.15,
      baseRpm: 100,
      maxRpm: 450,
      baseVvm: 0.1,
      maxVvm: 0.7,
      maxOxygenFraction: 60,
      spargerType: "ring"
    },
    "stainless-1000": {
      name: "Custom stainless-steel microbial tank — 1,000 L",
      note: "Generic production-scale stirred tank with editable high-demand microbial settings.",
      totalVolume: 1250,
      initialVolume: 650,
      maxWorkingVolume: 1000,
      vesselDiameter: 1.05,
      liquidHeight: 1.95,
      heightDiameterRatio: 1.86,
      baffled: true,
      maxPressure: 1.0,
      operatingPressure: 0.3,
      impellerType: "rushton",
      impellerCount: 3,
      impellerDiameter: 0.35,
      baseRpm: 80,
      maxRpm: 320,
      baseVvm: 0.2,
      maxVvm: 1.2,
      maxOxygenFraction: 80,
      spargerType: "ring"
    },
    custom: {
      name: "Custom stirred tank",
      note: "Start from a neutral vessel and supply your own geometry and limits.",
      totalVolume: 10,
      initialVolume: 5,
      maxWorkingVolume: 8,
      vesselDiameter: 0.22,
      liquidHeight: 0.66,
      heightDiameterRatio: 3.0,
      baffled: true,
      maxPressure: 0.5,
      operatingPressure: 0,
      impellerType: "custom",
      impellerCount: 2,
      impellerDiameter: 0.07,
      baseRpm: 250,
      maxRpm: 1000,
      baseVvm: 0.5,
      maxVvm: 1.5,
      maxOxygenFraction: 100,
      spargerType: "ring"
    }
  };

  const STRAINS = {
    "ecoli-bl21": {
      group: "Microbial fermentation",
      name: "Escherichia coli BL21(DE3)",
      note: "Recombinant-protein production archetype. Parameters are illustrative starting values, not universal strain constants.",
      muMax: 0.55,
      ks: 0.05,
      yxS: 0.48,
      maintenance: 0.02,
      qO2Max: 12,
      optimalTemperature: 37,
      optimalPh: 7.0,
      overflowThreshold: 0.75,
      enableOverflow: true
    },
    "ecoli-mg1655": {
      group: "Microbial fermentation",
      name: "Escherichia coli K-12 MG1655",
      note: "Reference E. coli physiology archetype with relatively rapid growth in defined medium.",
      muMax: 0.66,
      ks: 0.04,
      yxS: 0.50,
      maintenance: 0.025,
      qO2Max: 13,
      optimalTemperature: 37,
      optimalPh: 7.0,
      overflowThreshold: 0.70,
      enableOverflow: true
    },
    "ecoli-w3110": {
      group: "Microbial fermentation",
      name: "Escherichia coli W3110",
      note: "Industrial E. coli archetype suitable as a starting point for biomass, metabolite or recombinant processes.",
      muMax: 0.60,
      ks: 0.05,
      yxS: 0.49,
      maintenance: 0.022,
      qO2Max: 12.5,
      optimalTemperature: 37,
      optimalPh: 7.0,
      overflowThreshold: 0.72,
      enableOverflow: true
    },
    "ecoli-dh5a": {
      group: "Microbial fermentation",
      name: "Escherichia coli DH5α",
      note: "Plasmid-propagation archetype with a lower assumed maximum growth rate than production E. coli strains.",
      muMax: 0.48,
      ks: 0.06,
      yxS: 0.46,
      maintenance: 0.025,
      qO2Max: 10,
      optimalTemperature: 37,
      optimalPh: 7.0,
      overflowThreshold: 0.65,
      enableOverflow: true
    },
    "bacillus-subtilis": {
      group: "Microbial fermentation",
      name: "Bacillus subtilis",
      note: "Aerobic Gram-positive production archetype. Acetate overflow is disabled by default.",
      muMax: 0.55,
      ks: 0.08,
      yxS: 0.50,
      maintenance: 0.025,
      qO2Max: 10,
      optimalTemperature: 37,
      optimalPh: 7.0,
      overflowThreshold: 1.0,
      enableOverflow: false
    },
    "corynebacterium": {
      group: "Microbial fermentation",
      name: "Corynebacterium glutamicum",
      note: "Amino-acid production archetype with moderate growth and oxygen demand.",
      muMax: 0.40,
      ks: 0.10,
      yxS: 0.52,
      maintenance: 0.018,
      qO2Max: 8,
      optimalTemperature: 30,
      optimalPh: 7.1,
      overflowThreshold: 1.2,
      enableOverflow: false
    },
    "pseudomonas": {
      group: "Microbial fermentation",
      name: "Pseudomonas putida",
      note: "Robust aerobic chassis archetype with relatively high oxygen demand.",
      muMax: 0.50,
      ks: 0.05,
      yxS: 0.48,
      maintenance: 0.025,
      qO2Max: 14,
      optimalTemperature: 30,
      optimalPh: 7.0,
      overflowThreshold: 1.1,
      enableOverflow: false
    },
    "saccharomyces-cerevisiae": {
      group: "Microbial fermentation",
      name: "Saccharomyces cerevisiae — aerobic production yeast",
      note: "Published respiratory S. cerevisiae basis: YX/S ≈ 0.49–0.50 g/g and qO₂ ≈ 2.7 mmol/g/h in aerobic glucose-limited culture. The 0.40 h⁻¹ maximum is a representative glucose-grown starting value; strain, oxygenation and Crabtree overflow strongly affect it. Ethanol overflow is not represented by this simulator.",
      sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC106631/",
      muMax: 0.40,
      ks: 0.025,
      yxS: 0.49,
      maintenance: 0.01,
      qO2Max: 2.7,
      optimalTemperature: 30,
      optimalPh: 5.0,
      overflowThreshold: 0.5,
      enableOverflow: false,
      recommendedProduct: "secreted",
      recommendedMedium: "yeast-defined",
      recommendedFeed: "yeast-glucose-nitrogen",
      recommendedProcess: { duration: 48, initialBiomass: 0.1, temperature: 30, phSetpoint: 5.0, feedStart: 12, targetGrowthRate: 0.20 }
    },
    "aspergillus-niger": {
      group: "Microbial fermentation",
      name: "Aspergillus niger — submerged fungal culture",
      note: "A. niger NW185 glucose-batch data reported μmax 0.221 h⁻¹, a 0.68 C-mol/C-mol biomass yield (converted here to ≈0.56 g/g), and oxygen uptake equivalent to ≈4.1 mmol/g/h. Morphology, strain, pH and product programme can change these values substantially; pellet morphology is outside this model.",
      sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5773628/",
      muMax: 0.22,
      ks: 0.05,
      yxS: 0.56,
      maintenance: 0.015,
      qO2Max: 4.1,
      optimalTemperature: 30,
      optimalPh: 4.5,
      overflowThreshold: 1.0,
      enableOverflow: false,
      recommendedProduct: "secreted",
      recommendedMedium: "aspergillus-glucose",
      recommendedFeed: "aspergillus-sugar-salts",
      recommendedProcess: { duration: 72, initialBiomass: 0.1, temperature: 30, phSetpoint: 4.5, feedStart: 12, targetGrowthRate: 0.12 }
    },
    "cho-mab": {
      group: "Animal cell culture",
      name: "CHO recombinant clone — monoclonal antibody",
      note: "Recombinant CHO mAb study basis: μmax 0.040 h⁻¹ and glucose KS 0.664 g/L at 33–37 °C. The reported cell/glucose yield is converted to a biomass basis for this simulator. Recombinant construct, host lineage, clone selection, adaptation and process conditions can all shift growth and productivity; calibrate to clone-specific data.",
      sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4960177/",
      muMax: 0.04,
      ks: 0.664,
      yxS: 0.43,
      maintenance: 0.01,
      qO2Max: 0.3,
      optimalTemperature: 37,
      optimalPh: 7.1,
      overflowThreshold: 5,
      enableOverflow: false,
      recommendedProduct: "mab",
      recommendedMedium: "cho-chemically-defined",
      recommendedFeed: "cho-balanced",
      recommendedProcess: { duration: 240, initialBiomass: 0.05, temperature: 37, phSetpoint: 7.1, feedStart: 72, targetGrowthRate: 0.03 }
    },
    "hybridoma-mab": {
      group: "Animal cell culture",
      name: "Mouse hybridoma 55-6 — monoclonal antibody",
      note: "Published 55-6 hybridoma basis: μmax 0.055 h⁻¹ and glucose KS 0.13 mM (0.023 g/L) in RPMI 1640 plus serum. Cell/glucose yield is converted to an approximate dry-biomass basis. Hybridoma line and medium composition materially affect growth and antibody production.",
      sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2267508/",
      muMax: 0.055,
      ks: 0.023,
      yxS: 0.14,
      maintenance: 0.015,
      qO2Max: 0.3,
      optimalTemperature: 37,
      optimalPh: 7.2,
      overflowThreshold: 5,
      enableOverflow: false,
      recommendedProduct: "mab",
      recommendedMedium: "rpmi-hybridoma",
      recommendedFeed: "animal-glucose-glutamine",
      recommendedProcess: { duration: 168, initialBiomass: 0.05, temperature: 37, phSetpoint: 7.2, feedStart: 48, targetGrowthRate: 0.04 }
    },
    "hek293-recombinant": {
      group: "Animal cell culture",
      name: "HEK293F suspension — recombinant protein",
      note: "Published HEK293F bioreactor basis: μ = 0.028 ± 0.001 h⁻¹, glucose uptake 431 µmol/gDW/h and OUR 334 µmol/gDW/h for a recombinant producer. YX/S is calculated from those growth and glucose-uptake rates. Stable versus transient expression, adaptation and construct burden remain process-specific.",
      sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3427347/",
      muMax: 0.028,
      ks: 0.1,
      yxS: 0.36,
      maintenance: 0.01,
      qO2Max: 0.334,
      optimalTemperature: 37,
      optimalPh: 7.0,
      overflowThreshold: 5,
      enableOverflow: false,
      recommendedProduct: "secreted",
      recommendedMedium: "hek293-serum-free",
      recommendedFeed: "cho-balanced",
      recommendedProcess: { duration: 168, initialBiomass: 0.05, temperature: 37, phSetpoint: 7.0, feedStart: 48, targetGrowthRate: 0.02 }
    },
    "generalized-cho": {
      group: "Generalized animal-cell profiles",
      name: "Generalized — CHO cells (multi-study)",
      note: "Generalized CHO production-cell envelope synthesized from four studies. Clone, construct, medium and culture mode remain major sources of variation; recalibrate dry-mass yield and oxygen demand.",
      generalizedProfile: "cho",
      muMax: 0.03, ks: 0.66, yxS: 0.35, maintenance: 0.01, qO2Max: 0.3,
      optimalTemperature: 37, optimalPh: 7.1, overflowThreshold: 5, enableOverflow: false,
      recommendedProduct: "mab", recommendedMedium: "cho-chemically-defined", recommendedFeed: "cho-balanced",
      recommendedProcess: { duration: 240, initialBiomass: 0.05, temperature: 37, phSetpoint: 7.1, feedStart: 72, targetGrowthRate: 0.02 }
    },
    "generalized-hybridoma": {
      group: "Generalized animal-cell profiles",
      name: "Generalized — hybridoma cells (multi-study)",
      note: "Generalized antibody-producing hybridoma envelope synthesized from four studies. Glucose/glutamine co-limitation, lineage and passage history require process-specific calibration.",
      generalizedProfile: "hybridoma",
      muMax: 0.04, ks: 0.023, yxS: 0.14, maintenance: 0.015, qO2Max: 0.3,
      optimalTemperature: 37, optimalPh: 7.2, overflowThreshold: 5, enableOverflow: false,
      recommendedProduct: "mab", recommendedMedium: "rpmi-hybridoma", recommendedFeed: "animal-glucose-glutamine",
      recommendedProcess: { duration: 168, initialBiomass: 0.05, temperature: 37, phSetpoint: 7.2, feedStart: 48, targetGrowthRate: 0.03 }
    },
    "generalized-hek293": {
      group: "Generalized animal-cell profiles",
      name: "Generalized — HEK293-derived cells (multi-study)",
      note: "Generalized suspension HEK293/HEK293F/HEK293T envelope synthesized from four studies. Adaptation and expression system can substantially change growth and metabolism.",
      generalizedProfile: "hek293",
      muMax: 0.02, ks: 0.1, yxS: 0.36, maintenance: 0.01, qO2Max: 0.33,
      optimalTemperature: 37, optimalPh: 7.0, overflowThreshold: 5, enableOverflow: false,
      recommendedProduct: "secreted", recommendedMedium: "hek293-serum-free", recommendedFeed: "cho-balanced",
      recommendedProcess: { duration: 168, initialBiomass: 0.05, temperature: 37, phSetpoint: 7.0, feedStart: 48, targetGrowthRate: 0.014 }
    },
    "generalized-escherichia-coli": {
      group: "Generalized microbial profiles",
      name: "Generalized — Escherichia coli (multi-study)",
      note: "Generalized aerobic glucose-growth envelope synthesized from five K-12, B/BL21 and production-host studies. Choose a strain-specific preset when acetate handling or recombinant burden matters.",
      generalizedProfile: "escherichia-coli",
      muMax: 0.60, ks: 0.02, yxS: 0.46, maintenance: 0.02, qO2Max: 10,
      optimalTemperature: 37, optimalPh: 7.0, overflowThreshold: 0.70, enableOverflow: true
    },
    "generalized-bacillus-subtilis": {
      group: "Generalized microbial profiles",
      name: "Generalized — Bacillus subtilis (multi-study)",
      note: "Generalized aerobic B. subtilis envelope synthesized from three studies. Strain 168 and industrial secretion or riboflavin backgrounds are not interchangeable.",
      generalizedProfile: "bacillus-subtilis",
      muMax: 0.45, ks: 0.08, yxS: 0.55, maintenance: 0.025, qO2Max: 10,
      optimalTemperature: 37, optimalPh: 7.0, overflowThreshold: 1.0, enableOverflow: false
    },
    "generalized-corynebacterium-glutamicum": {
      group: "Generalized microbial profiles",
      name: "Generalized — Corynebacterium glutamicum (multi-study)",
      note: "Generalized glucose-grown C. glutamicum envelope synthesized from three studies. Growth, yield and oxygen demand are comparatively well anchored; production strains still require calibration.",
      generalizedProfile: "corynebacterium-glutamicum",
      muMax: 0.40, ks: 0.10, yxS: 0.50, maintenance: 0.079, qO2Max: 8,
      optimalTemperature: 30, optimalPh: 7.1, overflowThreshold: 1.2, enableOverflow: false
    },
    "generalized-pseudomonas-putida": {
      group: "Generalized microbial profiles",
      name: "Generalized — Pseudomonas putida (multi-study)",
      note: "Generalized P. putida profile synthesized from three glucose studies, primarily strain KT2440. Engineered genomes and other lineages may differ.",
      generalizedProfile: "pseudomonas-putida",
      muMax: 0.59, ks: 0.05, yxS: 0.45, maintenance: 0.037, qO2Max: 14,
      optimalTemperature: 30, optimalPh: 7.0, overflowThreshold: 1.1, enableOverflow: false
    },
    "generalized-saccharomyces-cerevisiae": {
      group: "Generalized microbial profiles",
      name: "Generalized — Saccharomyces cerevisiae (multi-study)",
      note: "Generalized S. cerevisiae envelope synthesized from four studies. Values represent aerobic respiratory growth; Crabtree ethanol overflow requires a separate model.",
      generalizedProfile: "saccharomyces-cerevisiae",
      muMax: 0.38, ks: 0.025, yxS: 0.50, maintenance: 0.01, qO2Max: 2.7,
      optimalTemperature: 30, optimalPh: 5.0, overflowThreshold: 0.5, enableOverflow: false,
      recommendedProduct: "secreted", recommendedMedium: "yeast-defined", recommendedFeed: "yeast-glucose-nitrogen",
      recommendedProcess: { duration: 48, initialBiomass: 0.1, temperature: 30, phSetpoint: 5.0, feedStart: 12, targetGrowthRate: 0.19 }
    },
    "generalized-aspergillus-niger": {
      group: "Generalized microbial profiles",
      name: "Generalized — Aspergillus niger (multi-study)",
      note: "Generalized submerged A. niger envelope synthesized from three studies. Pellet morphology, viscosity, pH and production lineage strongly affect the result.",
      generalizedProfile: "aspergillus-niger",
      muMax: 0.23, ks: 0.05, yxS: 0.56, maintenance: 0.09, qO2Max: 4.1,
      optimalTemperature: 30, optimalPh: 3.0, overflowThreshold: 1.0, enableOverflow: false,
      recommendedProduct: "secreted", recommendedMedium: "aspergillus-glucose", recommendedFeed: "aspergillus-sugar-salts",
      recommendedProcess: { duration: 72, initialBiomass: 0.1, temperature: 30, phSetpoint: 3.0, feedStart: 12, targetGrowthRate: 0.12 }
    },
    custom: {
      group: "Microbial fermentation",
      name: "Custom organism / cell line",
      note: "Supply an experimentally supported parameter set where possible.",
      muMax: 0.50,
      ks: 0.05,
      yxS: 0.50,
      maintenance: 0.02,
      qO2Max: 10,
      optimalTemperature: 37,
      optimalPh: 7.0,
      overflowThreshold: 0.8,
      enableOverflow: false
    }
  };

  const PRODUCT_DEFAULTS = {
    biomass: { name: "Biomass", alpha: 0, beta: 0, degradation: 0, inductionTime: 0, postTemperature: 37, burden: 100, soluble: 100 },
    mab: { name: "Monoclonal antibody", alpha: 0.003, beta: 0.0003, degradation: 0.001, inductionTime: 0, postTemperature: 37, burden: 92, soluble: 100 },
    recombinant: { name: "Recombinant protein", alpha: 0.025, beta: 0.006, degradation: 0.008, inductionTime: 8, postTemperature: 28, burden: 72, soluble: 65 },
    secreted: { name: "Secreted protein", alpha: 0.018, beta: 0.008, degradation: 0.006, inductionTime: 6, postTemperature: 30, burden: 80, soluble: 85 },
    plasmid: { name: "Plasmid DNA", alpha: 0.008, beta: 0.001, degradation: 0.002, inductionTime: 0, postTemperature: 37, burden: 92, soluble: 80 },
    "growth-metabolite": { name: "Growth-associated metabolite", alpha: 0.20, beta: 0.002, degradation: 0, inductionTime: 0, postTemperature: 37, burden: 100, soluble: 100 },
    "nongrowth-metabolite": { name: "Non-growth-associated metabolite", alpha: 0.01, beta: 0.045, degradation: 0.001, inductionTime: 0, postTemperature: 37, burden: 95, soluble: 100 },
    custom: { name: "Custom product", alpha: 0.05, beta: 0.005, degradation: 0, inductionTime: 0, postTemperature: 37, burden: 90, soluble: 100 }
  };

  const MEDIA = {
    "defined-hcd": {
      group: "Microbial fermentation media",
      name: "Defined high-cell-density E. coli medium",
      components: [
        ["Glucose", 15, "g/L", "carbon"],
        ["(NH₄)₂SO₄", 4, "g/L", "nitrogen"],
        ["KH₂PO₄", 13.3, "g/L", "phosphate"],
        ["K₂HPO₄", 4, "g/L", "phosphate"],
        ["Citric acid", 1.7, "g/L", "buffer"],
        ["MgSO₄·7H₂O", 1.2, "g/L", "magnesium"],
        ["Trace-metal solution", 0.02, "g/L", "trace"]
      ]
    },
    m9: {
      group: "Microbial fermentation media",
      name: "M9 minimal medium with glucose",
      components: [
        ["Glucose", 10, "g/L", "carbon"],
        ["Na₂HPO₄", 6, "g/L", "phosphate"],
        ["KH₂PO₄", 3, "g/L", "phosphate"],
        ["NH₄Cl", 1, "g/L", "nitrogen"],
        ["NaCl", 0.5, "g/L", "mineral"],
        ["MgSO₄", 0.24, "g/L", "magnesium"],
        ["CaCl₂", 0.011, "g/L", "mineral"]
      ]
    },
    lb: {
      group: "Microbial fermentation media",
      name: "LB medium",
      components: [
        ["Tryptone", 10, "g/L", "complex"],
        ["Yeast extract", 5, "g/L", "complex"],
        ["NaCl", 10, "g/L", "mineral"]
      ]
    },
    tb: {
      group: "Microbial fermentation media",
      name: "Terrific Broth",
      components: [
        ["Tryptone", 12, "g/L", "complex"],
        ["Yeast extract", 24, "g/L", "complex"],
        ["Glycerol", 4, "g/L", "carbon"],
        ["KH₂PO₄", 2.31, "g/L", "phosphate"],
        ["K₂HPO₄", 12.54, "g/L", "phosphate"]
      ]
    },
    "2xyt": {
      group: "Microbial fermentation media",
      name: "2×YT medium",
      components: [
        ["Tryptone", 16, "g/L", "complex"],
        ["Yeast extract", 10, "g/L", "complex"],
        ["NaCl", 5, "g/L", "mineral"]
      ]
    },
    mineral: {
      group: "Microbial fermentation media",
      name: "Generic mineral-salts medium",
      components: [
        ["Glucose", 20, "g/L", "carbon"],
        ["NH₄OH equivalent", 3, "g/L", "nitrogen"],
        ["KH₂PO₄", 5, "g/L", "phosphate"],
        ["K₂HPO₄", 5, "g/L", "phosphate"],
        ["MgSO₄", 0.5, "g/L", "magnesium"],
        ["Trace salts", 0.05, "g/L", "trace"]
      ]
    },
    ypd: {
      group: "Microbial fermentation media",
      name: "YPD yeast medium",
      components: [
        ["Glucose", 20, "g/L", "carbon"],
        ["Peptone", 20, "g/L", "complex"],
        ["Yeast extract", 10, "g/L", "complex"]
      ]
    },
    "yeast-defined": {
      group: "Microbial fermentation media",
      name: "Defined S. cerevisiae glucose medium",
      components: [
        ["Glucose", 20, "g/L", "carbon"],
        ["(NH₄)₂SO₄", 5, "g/L", "nitrogen"],
        ["KH₂PO₄", 3, "g/L", "phosphate"],
        ["MgSO₄·7H₂O", 0.5, "g/L", "magnesium"],
        ["Trace-element solution", 0.01, "g/L", "trace"],
        ["Vitamin solution", 0.01, "g/L", "vitamin"]
      ]
    },
    "aspergillus-glucose": {
      group: "Microbial fermentation media",
      name: "A. niger glucose mineral medium",
      components: [
        ["Glucose", 20, "g/L", "carbon"],
        ["NaNO₃", 3, "g/L", "nitrogen"],
        ["KH₂PO₄", 1, "g/L", "phosphate"],
        ["MgSO₄·7H₂O", 0.5, "g/L", "magnesium"],
        ["KCl", 0.5, "g/L", "mineral"],
        ["Trace-element solution", 0.01, "g/L", "trace"]
      ]
    },
    "cho-chemically-defined": {
      group: "Animal cell culture media",
      name: "CHO chemically defined basal medium (generic)",
      components: [
        ["Glucose", 4.5, "g/L", "carbon"],
        ["L-glutamine", 0.584, "g/L", "nitrogen"],
        ["Amino-acid mixture", 3, "g/L", "amino-acid"],
        ["Vitamin mixture", 0.1, "g/L", "vitamin"],
        ["Lipid / growth-factor mixture", 0.1, "g/L", "lipid"],
        ["NaHCO₃", 2.2, "g/L", "buffer"]
      ]
    },
    "rpmi-hybridoma": {
      group: "Animal cell culture media",
      name: "RPMI 1640 hybridoma medium (study basis)",
      components: [
        ["Glucose", 2, "g/L", "carbon"],
        ["L-glutamine", 0.307, "g/L", "nitrogen"],
        ["Amino-acid mixture", 1.1, "g/L", "amino-acid"],
        ["Vitamin mixture", 0.03, "g/L", "vitamin"],
        ["NaHCO₃", 2, "g/L", "buffer"],
        ["Fetal bovine serum", 10, "% v/v", "complex"]
      ]
    },
    "hek293-serum-free": {
      group: "Animal cell culture media",
      name: "HEK293 serum-free suspension medium (generic)",
      components: [
        ["Glucose", 5.5, "g/L", "carbon"],
        ["L-glutamine", 0.584, "g/L", "nitrogen"],
        ["Amino-acid mixture", 3, "g/L", "amino-acid"],
        ["Vitamin mixture", 0.1, "g/L", "vitamin"],
        ["Lipid mixture", 0.1, "g/L", "lipid"],
        ["NaHCO₃", 2.2, "g/L", "buffer"]
      ]
    },
    custom: {
      group: "Custom",
      name: "Custom medium",
      components: [["Glucose", 10, "g/L", "carbon"]]
    }
  };

  const FEEDS = {
    "glucose-salts": {
      group: "Microbial fermentation feeds",
      name: "Concentrated glucose plus salts",
      components: [
        ["Glucose", 500, "g/L", "carbon"],
        ["MgSO₄·7H₂O", 8, "g/L", "magnesium"],
        ["Trace-metal solution", 2, "g/L", "trace"]
      ]
    },
    glucose: {
      group: "Microbial fermentation feeds",
      name: "Concentrated glucose feed",
      components: [["Glucose", 500, "g/L", "carbon"]]
    },
    glycerol: {
      group: "Microbial fermentation feeds",
      name: "Concentrated glycerol feed",
      components: [["Glycerol", 600, "g/L", "carbon"]]
    },
    "glucose-yeast": {
      group: "Microbial fermentation feeds",
      name: "Glucose plus yeast-extract feed",
      components: [
        ["Glucose", 400, "g/L", "carbon"],
        ["Yeast extract", 80, "g/L", "complex"],
        ["MgSO₄·7H₂O", 6, "g/L", "magnesium"]
      ]
    },
    defined: {
      group: "Microbial fermentation feeds",
      name: "Defined carbon-and-nitrogen feed",
      components: [
        ["Glucose", 450, "g/L", "carbon"],
        ["(NH₄)₂SO₄", 50, "g/L", "nitrogen"],
        ["MgSO₄·7H₂O", 8, "g/L", "magnesium"],
        ["Trace-metal solution", 2, "g/L", "trace"]
      ]
    },
    "yeast-glucose-nitrogen": {
      group: "Microbial fermentation feeds",
      name: "Yeast glucose and nitrogen feed",
      components: [
        ["Glucose", 500, "g/L", "carbon"],
        ["(NH₄)₂SO₄", 40, "g/L", "nitrogen"],
        ["MgSO₄·7H₂O", 8, "g/L", "magnesium"],
        ["Vitamin / trace solution", 2, "g/L", "vitamin"]
      ]
    },
    "aspergillus-sugar-salts": {
      group: "Microbial fermentation feeds",
      name: "A. niger sugar and mineral feed",
      components: [
        ["Glucose", 400, "g/L", "carbon"],
        ["NaNO₃", 20, "g/L", "nitrogen"],
        ["MgSO₄·7H₂O", 5, "g/L", "magnesium"],
        ["Trace-element solution", 1, "g/L", "trace"]
      ]
    },
    "cho-balanced": {
      group: "Animal cell culture feeds",
      name: "CHO balanced nutrient feed (generic)",
      components: [
        ["Glucose", 100, "g/L", "carbon"],
        ["L-glutamine", 15, "g/L", "nitrogen"],
        ["Amino-acid mixture", 80, "g/L", "amino-acid"],
        ["Vitamin mixture", 2, "g/L", "vitamin"],
        ["Lipid / growth-factor mixture", 1, "g/L", "lipid"]
      ]
    },
    "animal-glucose-glutamine": {
      group: "Animal cell culture feeds",
      name: "Animal-cell glucose and glutamine feed",
      components: [
        ["Glucose", 200, "g/L", "carbon"],
        ["L-glutamine", 20, "g/L", "nitrogen"],
        ["Amino-acid mixture", 40, "g/L", "amino-acid"]
      ]
    },
    custom: {
      group: "Custom",
      name: "Custom feed",
      components: [["Glucose", 500, "g/L", "carbon"]]
    }
  };

  const PROCESS_DESCRIPTIONS = {
    batch: "All growth substrate begins in the vessel. Nutrient feed is disabled, while gas and pH-control additions remain active.",
    "fed-batch": "Nutrient solution is added without a matching outlet. Reactor volume increases with nutrient feed and acid/base additions.",
    continuous: "Fresh medium enters while an equal broth stream leaves. The working volume remains approximately constant after feed begins."
  };

  const state = {
    currentStep: 0,
    mediumComponents: [],
    feedComponents: [],
    lastResult: null,
    resultTab: "process",
    chartResizeTimer: null
  };

  function makeComponents(rows) {
    return rows.map(([name, concentration, unit, role]) => ({ id: uid(), name, concentration, unit, role }));
  }

  function populateSelect(select, records) {
    select.innerHTML = "";
    const groupOrder = [
      "Animal cell culture",
      "Generalized animal-cell profiles",
      "Microbial fermentation",
      "Generalized microbial profiles",
      "Animal cell culture media",
      "Microbial fermentation media",
      "Animal cell culture feeds",
      "Microbial fermentation feeds",
      "Custom"
    ];
    const groups = new Map();

    groupOrder.forEach((label) => {
      if (!Object.values(records).some((record) => record.group === label)) return;
      const optgroup = document.createElement("optgroup");
      optgroup.label = label;
      groups.set(label, optgroup);
      select.appendChild(optgroup);
    });

    Object.entries(records).forEach(([value, record]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = record.name;
      (groups.get(record.group) || select).appendChild(option);
    });
  }

  function setValue(id, value) {
    const element = $(`#${id}`);
    if (!element) return;
    if (element.type === "checkbox") {
      element.checked = Boolean(value);
    } else {
      element.value = value ?? "";
    }
  }

  function getNumber(id) {
    const raw = $(`#${id}`)?.value;
    if (raw === undefined || String(raw).trim() === "") return NaN;
    return Number(raw);
  }

  function getProcessType() {
    return $('input[name="processType"]:checked')?.value || "fed-batch";
  }

  function setProcessType(value) {
    const radio = $(`input[name="processType"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  function applyReactorPreset(key, preserveSelection = false) {
    window.FermentationVesselSelection = null;
    const preset = REACTORS[key] || REACTORS.custom;
    if (!preserveSelection) setValue("reactorPreset", key);
    [
      "totalVolume", "initialVolume", "maxWorkingVolume", "vesselDiameter", "liquidHeight",
      "heightDiameterRatio", "baffled", "maxPressure", "operatingPressure", "impellerType",
      "impellerCount", "impellerDiameter", "baseRpm", "maxRpm", "baseVvm", "maxVvm",
      "maxOxygenFraction", "spargerType"
    ].forEach((field) => setValue(field, preset[field]));
    setValue("powerNumber", IMPELLERS[preset.impellerType]?.powerNumber ?? 1);
    $("#reactorPresetNote").textContent = preset.note;
    updateAllViews();
  }

  function applyStrainPreset(key, preserveSelection = false) {
    state.inputModelVersion = undefined;
    const preset = STRAINS[key] || STRAINS.custom;
    if (!preserveSelection) setValue("strainPreset", key);
    ["muMax", "ks", "yxS", "maintenance", "qO2Max", "optimalTemperature", "optimalPh", "overflowThreshold", "enableOverflow"]
      .forEach((field) => setValue(field, preset[field]));
    const observed = ["cho-mab", "hek293-recombinant", "corynebacterium", "generalized-corynebacterium-glutamicum"].includes(key);
    setValue("yieldBasis", observed ? "observed" : "true");
    setValue("yieldReferenceGrowthRate", preset.muMax);
    setValue("substrateThreshold", key === "cho-mab" ? 0.58 : 0);
    $("#strainPresetNote").textContent = preset.note;
    const sourceLink = $("#strainPresetSource");
    if (sourceLink) {
      sourceLink.hidden = !preset.sourceUrl;
      if (preset.sourceUrl) sourceLink.href = preset.sourceUrl;
      else sourceLink.removeAttribute("href");
    }
    const derivationLink = $("#strainDerivationSheet");
    if (derivationLink) derivationLink.href = preset.generalizedProfile
      ? `sources/biology/generalized.html?id=${encodeURIComponent(preset.generalizedProfile)}`
      : `sources/biology/?id=${encodeURIComponent(STRAINS[key] ? key : "custom")}`;
    if (preserveSelection && $("#presetApplyMode")?.value !== "biology-only") {
      const type = preset.recommendedProduct || "recombinant";
      setValue("productType", type);
      applyProductDefaults(type);
      applyMediumPreset(preset.recommendedMedium || "defined-hcd");
      applyFeedPreset(preset.recommendedFeed || "glucose-salts");
      const processDefaults = {duration:36, initialBiomass:0.05, temperature:preset.optimalTemperature,
        phSetpoint:preset.optimalPh, feedStart:6, targetGrowthRate:preset.muMax*.6,
        feedStrategy:"exponential", initialFeedRate:.02, maxFeedRate:null,
        phMode:"controlled", baseNormality:4, maxBaseRate:1, acidNormality:4, maxAcidRate:1, bufferCapacity:50,
        initialDo:100, doSetpoint:30, ...preset.recommendedProcess};
      Object.entries(processDefaults).forEach(([field, value]) => setValue(field, value));
      setValue("inoculumUnit", "dcw");
      setValue("initialOd", ""); setValue("odToDcw", "");
      setValue("initialPh", "");
    }
    updateAllViews();
  }

  function applyProductDefaults(type) {
    const preset = PRODUCT_DEFAULTS[type] || PRODUCT_DEFAULTS.custom;
    setValue("productName", preset.name);
    setValue("productAlpha", preset.alpha);
    setValue("productBeta", preset.beta);
    setValue("productDegradation", preset.degradation);
    setValue("inductionTime", preset.inductionTime);
    setValue("postInductionTemperature", preset.postTemperature);
    setValue("burdenFactor", preset.burden);
    setValue("solubleFraction", preset.soluble);
    setValue("productSubstrateYield", 0.5);
    updateAllViews();
  }

  function applyMediumPreset(key, preserveSelection = false) {
    const preset = MEDIA[key] || MEDIA.custom;
    if (!preserveSelection) setValue("mediumPreset", key);
    setValue("mediumName", preset.name);
    state.mediumComponents = makeComponents(preset.components);
    renderComposition("medium");
    updateAllViews();
  }

  function applyFeedPreset(key, preserveSelection = false) {
    const preset = FEEDS[key] || FEEDS.custom;
    if (!preserveSelection) setValue("feedPreset", key);
    setValue("feedName", preset.name);
    state.feedComponents = makeComponents(preset.components);
    renderComposition("feed");
    updateAllViews();
  }

  function resetDemo() {
    applyReactorPreset("lab-glass-10");
    applyStrainPreset("ecoli-bl21");
    setValue("productType", "recombinant");
    applyProductDefaults("recombinant");
    setProcessType("fed-batch");
    applyMediumPreset("defined-hcd");
    applyFeedPreset("glucose-salts");

    const defaults = {
      initialBiomass: 0.05,
      duration: 24,
      timeStep: 0.02,
      initialDo: 100,
      temperature: 37,
      phSetpoint: 7.0,
      doSetpoint: 30,
      ...window.FermentationModel.DO_DEFAULTS,
      gassedPowerFraction: 1,
      oxygenSupplyMode: "fixed",
      fixedOxygenFraction: 100,
      phMode: "controlled",
      strictFailures: true,
      aerobicFailureRules: true,
      baseNormality: 4,
      maxBaseRate: 1.0,
      acidNormality: 4,
      maxAcidRate: 1.0,
      bufferCapacity: 50,
      harvestCondition: "duration",
      feedStrategy: "exponential",
      feedStart: 6,
      initialFeedRate: 0.02,
      maxFeedRate: null,
      linearFeedSlope: 0.1,
      targetGrowthRate: 0.16,
      dilutionRate: 0.15,
      doStatThreshold: 45
    };
    Object.entries(defaults).forEach(([key, value]) => setValue(key, value));
    setValue("inoculumUnit", "dcw"); setValue("initialOd", ""); setValue("odToDcw", "");
    setValue("initialPh", ""); setValue("measuredKla", "");
    setValue("presetApplyMode", "complete");
    state.lastResult = null;
    renderResultsPlaceholder();
    showStep(0);
    updateAllViews();
    setStatus("Demo scenario restored.");
    document.dispatchEvent(new CustomEvent("fermentation:scenario-applied", { detail: buildScenario().reactor }));
  }

  function renderComposition(kind) {
    const components = kind === "medium" ? state.mediumComponents : state.feedComponents;
    const tbody = $(`#${kind}Components`);
    tbody.innerHTML = "";

    components.forEach((component) => {
      const row = document.createElement("tr");
      row.dataset.id = component.id;

      const nameCell = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = component.name;
      nameInput.setAttribute("aria-label", `${kind} component name`);
      nameInput.addEventListener("input", () => {
        component.name = nameInput.value;
        updateAllViews();
      });
      nameCell.appendChild(nameInput);

      const concentrationCell = document.createElement("td");
      const concentrationInput = document.createElement("input");
      concentrationInput.type = "number";
      concentrationInput.min = "0";
      concentrationInput.step = "0.001";
      concentrationInput.value = component.concentration;
      concentrationInput.setAttribute("aria-label", `${component.name} concentration`);
      concentrationInput.addEventListener("input", () => {
        component.concentration = concentrationInput.value.trim() === "" ? NaN : Number(concentrationInput.value);
        updateAllViews();
      });
      concentrationCell.appendChild(concentrationInput);

      const unitCell = document.createElement("td");
      const unitSelect = document.createElement("select");
      ["g/L", "mg/L", "mmol/L", "mL/L", "% v/v"].forEach((unit) => {
        const option = document.createElement("option");
        option.value = unit;
        option.textContent = unit;
        option.selected = component.unit === unit;
        unitSelect.appendChild(option);
      });
      unitSelect.setAttribute("aria-label", `${component.name} unit`);
      unitSelect.addEventListener("change", () => {
        component.unit = unitSelect.value;
        updateAllViews();
      });
      unitCell.appendChild(unitSelect);

      const roleCell = document.createElement("td");
      const roleSelect = document.createElement("select");
      ROLE_OPTIONS.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = component.role === value;
        roleSelect.appendChild(option);
      });
      roleSelect.setAttribute("aria-label", `${component.name} role`);
      roleSelect.addEventListener("change", () => {
        component.role = roleSelect.value;
        updateAllViews();
      });
      roleCell.appendChild(roleSelect);

      const removeCell = document.createElement("td");
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-row";
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove ${component.name}`);
      removeButton.addEventListener("click", () => {
        const collection = kind === "medium" ? state.mediumComponents : state.feedComponents;
        const index = collection.findIndex((item) => item.id === component.id);
        if (index >= 0) collection.splice(index, 1);
        renderComposition(kind);
        updateAllViews();
      });
      removeCell.appendChild(removeButton);

      row.append(nameCell, concentrationCell, unitCell, roleCell, removeCell);
      tbody.appendChild(row);
    });
  }

  function addComponent(kind) {
    const collection = kind === "medium" ? state.mediumComponents : state.feedComponents;
    collection.push({ id: uid(), name: "New component", concentration: 0, unit: "g/L", role: "other" });
    renderComposition(kind);
    updateAllViews();
  }


  function buildScenario() {
    const reactorPreset = $("#reactorPreset").value;
    const strainPreset = $("#strainPreset").value;
    const productType = $("#productType").value;
    const medium = state.mediumComponents.map(({ id, ...component }) => ({ ...component }));
    const feed = state.feedComponents.map(({ id, ...component }) => ({ ...component }));
    const vessel = window.FermentationVesselSelection;
    const inoculumMode = $("#inoculumUnit")?.value || "dcw";

    return {
      schemaVersion: "fermentation-simulator/v0.2",
      modelVersion: window.FermentationModel.MODEL_VERSION,
      inputModelVersion: state.inputModelVersion,
      createdAt: new Date().toISOString(),
      reactor: {
        preset: reactorPreset,
        name: vessel?.name || REACTORS[reactorPreset]?.name || "Custom stirred tank",
        catalogId: vessel?.id, manufacturer: vessel?.manufacturer, sourcePage: vessel?.sourcePage,
        measuredKla: $("#measuredKla")?.value.trim() ? getNumber("measuredKla") : undefined,
        gassedPowerFraction: getNumber("gassedPowerFraction"),
        totalVolume: getNumber("totalVolume"),
        initialVolume: getNumber("initialVolume"),
        maxWorkingVolume: getNumber("maxWorkingVolume"),
        diameter: getNumber("vesselDiameter"),
        liquidHeight: getNumber("liquidHeight"),
        heightDiameterRatio: getNumber("heightDiameterRatio"),
        baffled: $("#baffled").checked,
        maxPressure: getNumber("maxPressure"),
        operatingPressure: getNumber("operatingPressure"),
        impellerType: $("#impellerType").value,
        impellerCount: getNumber("impellerCount"),
        impellerDiameter: getNumber("impellerDiameter"),
        powerNumber: getNumber("powerNumber", 1),
        baseRpm: getNumber("baseRpm"),
        maxRpm: getNumber("maxRpm"),
        spargerType: $("#spargerType").value,
        baseVvm: getNumber("baseVvm"),
        maxVvm: getNumber("maxVvm"),
        maxOxygenFraction: getNumber("maxOxygenFraction", 21) / 100,
        oxygenSupplyMode: $("#oxygenSupplyMode").value,
        fixedOxygenFraction: getNumber("fixedOxygenFraction", 100) / 100
      },
      biology: {
        preset: strainPreset,
        name: STRAINS[strainPreset]?.name || "Custom strain",
        category: STRAINS[strainPreset]?.group || "Custom",
        muMax: getNumber("muMax"),
        ks: getNumber("ks"),
        yxS: getNumber("yxS"),
        yieldBasis: $("#yieldBasis")?.value || "true",
        yieldReferenceGrowthRate: getNumber("yieldReferenceGrowthRate"),
        substrateThreshold: getNumber("substrateThreshold"),
        maintenance: getNumber("maintenance"),
        qO2Max: getNumber("qO2Max"),
        optimalTemperature: getNumber("optimalTemperature"),
        optimalPh: getNumber("optimalPh"),
        overflowThreshold: getNumber("overflowThreshold"),
        enableOverflow: $("#enableOverflow").checked
      },
      product: {
        type: productType,
        name: $("#productName").value.trim() || PRODUCT_DEFAULTS[productType]?.name || "Product",
        alpha: getNumber("productAlpha"),
        beta: getNumber("productBeta"),
        degradation: getNumber("productDegradation"),
        inductionTime: getNumber("inductionTime"),
        postInductionTemperature: getNumber("postInductionTemperature"),
        burdenFactor: getNumber("burdenFactor", 100) / 100,
        recoverableFraction: getNumber("solubleFraction", 100) / 100,
        substrateYield: getNumber("productSubstrateYield")
      },
      process: {
        strictFailures: $("#strictFailures").checked,
        aerobicFailureRules: $("#aerobicFailureRules").checked,
        type: getProcessType(),
        initialBiomass: inoculumMode === "od" ? getNumber("initialOd") * getNumber("odToDcw") : getNumber("initialBiomass"),
        inoculumMode, initialOd: inoculumMode === "od" ? getNumber("initialOd") : undefined,
        odToDcw: inoculumMode === "od" ? getNumber("odToDcw") : undefined,
        initialPh: $("#initialPh")?.value.trim() ? getNumber("initialPh") : undefined,
        duration: getNumber("duration"),
        timeStep: getNumber("timeStep", 0.02),
        initialDo: getNumber("initialDo"),
        temperature: getNumber("temperature"),
        phSetpoint: getNumber("phSetpoint"),
        doSetpoint: getNumber("doSetpoint"),
        ...Object.fromEntries(Object.keys(window.FermentationModel.DO_DEFAULTS).map(key=>[key,getNumber(key)])),
        phMode: $("#phMode").value,
        baseNormality: getNumber("baseNormality"),
        maxBaseRate: getNumber("maxBaseRate"),
        acidNormality: getNumber("acidNormality"),
        maxAcidRate: getNumber("maxAcidRate"),
        bufferCapacity: getNumber("bufferCapacity"),
        harvestCondition: $("#harvestCondition").value
      },
      medium: {
        preset: $("#mediumPreset").value,
        name: $("#mediumName").value.trim() || "Custom medium",
        components: medium,
        effectiveCarbon: effectiveCarbon(medium)
      },
      feed: {
        preset: $("#feedPreset").value,
        name: $("#feedName").value.trim() || "Custom feed",
        components: feed,
        effectiveCarbon: effectiveCarbon(feed),
        strategy: $("#feedStrategy").value,
        start: getNumber("feedStart"),
        initialRateMlMin: getNumber("initialFeedRate"),
        maxRateMlMin: $("#maxFeedRate").validity?.badInput ? NaN : $("#maxFeedRate").value.trim() ? getNumber("maxFeedRate") : null,
        linearSlopeMlMinH: getNumber("linearFeedSlope"),
        targetGrowthRate: getNumber("targetGrowthRate"),
        dilutionRate: getNumber("dilutionRate"),
        doStatThreshold: getNumber("doStatThreshold")
      }
    };
  }

  function applyScenario(scenario) {
    if (!scenario || typeof scenario !== "object") throw new Error("Scenario file is not a valid object.");
    const check = validateScenario(scenario);
    if (check.errors.length) throw new Error(check.errors.join(" "));
    window.FermentationVesselSelection = {id:scenario.reactor.catalogId,
      name:scenario.reactor.name, manufacturer:scenario.reactor.manufacturer, sourcePage:scenario.reactor.sourcePage};
    state.inputModelVersion = scenario.inputModelVersion || scenario.modelVersion || scenario.schemaVersion;
    const r = scenario.reactor || {};
    const b = scenario.biology || {};
    const p = scenario.product || {};
    const process = scenario.process || {};
    const medium = scenario.medium || {};
    const feed = scenario.feed || {};

    setValue("reactorPreset", REACTORS[r.preset] ? r.preset : "custom");
    $("#reactorPresetNote").textContent = REACTORS[r.preset]?.note || REACTORS.custom.note;
    const reactorMap = {
      totalVolume: r.totalVolume,
      initialVolume: r.initialVolume,
      maxWorkingVolume: r.maxWorkingVolume,
      vesselDiameter: r.diameter,
      liquidHeight: r.liquidHeight,
      heightDiameterRatio: r.heightDiameterRatio,
      baffled: r.baffled,
      maxPressure: r.maxPressure,
      operatingPressure: r.operatingPressure,
      impellerType: r.impellerType,
      impellerCount: r.impellerCount,
      impellerDiameter: r.impellerDiameter,
      powerNumber: r.powerNumber,
      baseRpm: r.baseRpm,
      maxRpm: r.maxRpm,
      spargerType: r.spargerType,
      baseVvm: r.baseVvm,
      maxVvm: r.maxVvm,
      maxOxygenFraction: Number(r.maxOxygenFraction) * 100,
      oxygenSupplyMode: r.oxygenSupplyMode ?? "adaptive",
      fixedOxygenFraction: (r.fixedOxygenFraction ?? 1) * 100,
      measuredKla: r.measuredKla,
      gassedPowerFraction: r.gassedPowerFraction ?? 1
    };
    Object.entries(reactorMap).forEach(([id, value]) => setValue(id, value));

    setValue("strainPreset", STRAINS[b.preset] ? b.preset : "custom");
    const importedStrain = STRAINS[b.preset] || STRAINS.custom;
    $("#strainPresetNote").textContent = importedStrain.note;
    const importedSourceLink = $("#strainPresetSource");
    if (importedSourceLink) {
      importedSourceLink.hidden = !importedStrain.sourceUrl;
      if (importedStrain.sourceUrl) importedSourceLink.href = importedStrain.sourceUrl;
      else importedSourceLink.removeAttribute("href");
    }
    const importedDerivationLink = $("#strainDerivationSheet");
    if (importedDerivationLink) importedDerivationLink.href = importedStrain.generalizedProfile
      ? `sources/biology/generalized.html?id=${encodeURIComponent(importedStrain.generalizedProfile)}`
      : `sources/biology/?id=${encodeURIComponent(STRAINS[b.preset] ? b.preset : "custom")}`;
    const biologyMap = {
      muMax: b.muMax,
      ks: b.ks,
      yxS: b.yxS,
      yieldBasis: b.yieldBasis || "true", yieldReferenceGrowthRate: b.yieldReferenceGrowthRate ?? b.muMax,
      substrateThreshold: b.substrateThreshold ?? 0,
      maintenance: b.maintenance,
      qO2Max: b.qO2Max,
      optimalTemperature: b.optimalTemperature,
      optimalPh: b.optimalPh,
      overflowThreshold: b.overflowThreshold,
      enableOverflow: b.enableOverflow
    };
    Object.entries(biologyMap).forEach(([id, value]) => setValue(id, value));

    setValue("productType", p.type || "custom");
    const productMap = {
      productName: p.name,
      productAlpha: p.alpha,
      productBeta: p.beta,
      productDegradation: p.degradation,
      inductionTime: p.inductionTime,
      postInductionTemperature: p.postInductionTemperature,
      burdenFactor: Number(p.burdenFactor) * 100,
      solubleFraction: Number(p.recoverableFraction) * 100,
      productSubstrateYield: p.substrateYield ?? 0.5
    };
    Object.entries(productMap).forEach(([id, value]) => setValue(id, value));

    setProcessType(process.type || "fed-batch");
    const processMap = {
      strictFailures: process.strictFailures ?? false,
      aerobicFailureRules: process.aerobicFailureRules ?? true,
      initialBiomass: process.initialBiomass,
      inoculumUnit: process.inoculumMode || "dcw", initialOd: process.initialOd, odToDcw: process.odToDcw,
      initialPh: process.initialPh,
      duration: process.duration,
      timeStep: process.timeStep,
      initialDo: process.initialDo,
      temperature: process.temperature,
      phSetpoint: process.phSetpoint,
      doSetpoint: process.doSetpoint,
      ...Object.fromEntries(Object.entries(window.FermentationModel.DO_DEFAULTS).map(([key,value])=>[key,process[key]??value])),
      phMode: process.phMode,
      baseNormality: process.baseNormality,
      maxBaseRate: process.maxBaseRate,
      acidNormality: process.acidNormality ?? 4,
      maxAcidRate: process.maxAcidRate ?? 0,
      bufferCapacity: process.bufferCapacity,
      harvestCondition: process.harvestCondition === "volume" ? "duration" : process.harvestCondition
    };
    Object.entries(processMap).forEach(([id, value]) => setValue(id, value));

    setValue("mediumPreset", MEDIA[medium.preset] ? medium.preset : "custom");
    setValue("mediumName", medium.name || "Imported medium");
    state.mediumComponents = (medium.components || []).map((component) => ({ id: uid(), ...component }));
    renderComposition("medium");

    setValue("feedPreset", FEEDS[feed.preset] ? feed.preset : "custom");
    setValue("feedName", feed.name || "Imported feed");
    state.feedComponents = (feed.components || []).map((component) => ({ id: uid(), ...component }));
    renderComposition("feed");
    const feedMap = {
      feedStrategy: feed.strategy,
      feedStart: feed.start,
      initialFeedRate: feed.initialRateMlMin,
      maxFeedRate: feed.maxRateMlMin,
      linearFeedSlope: feed.linearSlopeMlMinH,
      targetGrowthRate: feed.targetGrowthRate,
      dilutionRate: feed.dilutionRate,
      doStatThreshold: feed.doStatThreshold
    };
    Object.entries(feedMap).forEach(([id, value]) => setValue(id, value));

    state.lastResult = null;
    renderResultsPlaceholder();
    showStep(0);
    updateAllViews();
    document.dispatchEvent(new CustomEvent("fermentation:scenario-applied", {detail:scenario.reactor}));
  }


  function updateConditionalFields() {
    const fixedOxygen = $("#oxygenSupplyMode").value === "fixed";
    for (const [id, active] of [["fixedOxygenFraction", fixedOxygen], ["maxOxygenFraction", !fixedOxygen]]) {
      const control = $("#" + id); control.closest(".field").hidden = !active; control.disabled = !active;
    }
    const induced = ["recombinant", "secreted"].includes($("#productType").value);
    for (const id of ["inductionTime", "postInductionTemperature", "burdenFactor"]) {
      const control = $("#" + id); control.closest(".field").hidden = !induced; control.disabled = !induced;
    }
    $("#productControlNote").textContent = induced ? "Induction activates product formation, burden and the temperature shift."
      : "Constitutive product model: induction, expression burden and temperature-shift controls are inactive.";
    const useOd = $("#inoculumUnit").value === "od";
    $("#initialBiomass").closest(".field").hidden = useOd;
    for (const id of ["initialOd", "odToDcw"]) $("#" + id).closest(".field").hidden = !useOd;
    $("#yieldReferenceGrowthRate").closest(".field").hidden = $("#yieldBasis").value !== "observed";
    const processType = getProcessType();
    const strategy = $("#feedStrategy").value;
    $("#processDescription").textContent = PROCESS_DESCRIPTIONS[processType];
    $("#sidebarProcessBadge").textContent = processType === "fed-batch" ? "Fed-batch" : processType.charAt(0).toUpperCase() + processType.slice(1);

    $$(".linear-option").forEach((element) => { element.hidden = strategy !== "linear"; });
    $$(".exponential-option").forEach((element) => { element.hidden = strategy !== "exponential"; });
    $$(".do-stat-option").forEach((element) => { element.hidden = strategy !== "do-stat"; });
    $$(".continuous-option").forEach((element) => { element.hidden = processType !== "continuous"; });
    $("#feedStrategyFieldset").classList.toggle("is-disabled", processType === "batch");
    $$("#feedStrategyFieldset input, #feedStrategyFieldset select").forEach((element) => {
      element.disabled = processType === "batch";
    });
    if (processType === "continuous") {
      $("#feedStrategy").disabled = true;
    }
  }

  function updateCompositionTotals() {
    const mediumCarbon = effectiveCarbon(state.mediumComponents);
    const feedCarbon = effectiveCarbon(state.feedComponents);
    const mediumComplex = hasComplex(state.mediumComponents);
    const feedComplex = hasComplex(state.feedComponents);
    $("#mediumTotals").innerHTML = [
      `<span><strong>${round(mediumCarbon, 2)} g/L</strong> effective substrate</span>`,
      `<span><strong>${round(sumRole(state.mediumComponents, "nitrogen"), 2)} g/L</strong> nitrogen-source compounds</span>`,
      mediumComplex ? "<span>Complex nutrients use a 35% substrate-equivalent assumption.</span>" : "<span>Defined composition selected.</span>"
    ].join("");
    $("#feedTotals").innerHTML = [
      `<span><strong>${round(feedCarbon, 2)} g/L</strong> effective feed substrate</span>`,
      `<span><strong>${round(sumRole(state.feedComponents, "nitrogen"), 2)} g/L</strong> nitrogen-source compounds</span>`,
      feedComplex ? "<span>Complex nutrients use a 35% substrate-equivalent assumption.</span>" : "<span>Defined composition selected.</span>"
    ].join("");
  }

  function updateDerivedGeometry() {
    const r = buildScenario().reactor;
    const base = powerAndKla(r, Math.max(0.01, r.initialVolume), r.baseRpm, r.baseVvm);
    const maximum = powerAndKla(r, Math.max(0.01, r.initialVolume), r.maxRpm, r.maxVvm);
    $("#agitationDerived").innerHTML = [
      `<span>Base P/V <strong>${round(base.powerDensity, 2)} kW/m³</strong></span>`,
      `<span>Maximum P/V <strong>${round(maximum.powerDensity, 2)} kW/m³</strong></span>`,
      `<span>Maximum tip speed <strong>${round(maximum.tipSpeed, 2)} m/s</strong></span>`,
      `<span>Estimated base k<sub>L</sub>a <strong>${round(base.kla, 0)} h⁻¹</strong></span>`
    ].join("");
  }

  function drawVessel() {
    const scenario = buildScenario();
    const r = scenario.reactor;
    const svg = $("#vesselSvg");
    const maxVolume = Math.max(0.01, r.maxWorkingVolume);
    const liquidFraction = clamp(r.initialVolume / maxVolume, 0.05, 1);
    const tankX = 72;
    const tankY = 34;
    const tankWidth = 156;
    const tankHeight = 286;
    const liquidHeight = tankHeight * liquidFraction;
    const liquidY = tankY + tankHeight - liquidHeight;
    const impellers = Math.max(1, Math.min(5, r.impellerCount));
    const impellerMarkup = Array.from({ length: impellers }, (_, index) => {
      const y = tankY + tankHeight - 55 - index * Math.min(58, (tankHeight - 90) / impellers);
      const width = clamp(r.impellerDiameter / Math.max(r.diameter, 0.01) * tankWidth, 34, 128);
      return `
        <g class="svg-impeller">
          <line x1="150" y1="${y}" x2="150" y2="${y + 18}" stroke="#28352c" stroke-width="4"/>
          <line x1="${150 - width / 2}" y1="${y + 9}" x2="${150 + width / 2}" y2="${y + 9}" stroke="#1f5c2e" stroke-width="7" stroke-linecap="round"/>
          <circle cx="150" cy="${y + 9}" r="7" fill="#f4f7f4" stroke="#1f5c2e" stroke-width="3"/>
        </g>`;
    }).join("");
    const baffles = r.baffled ? `
      <line x1="82" y1="55" x2="82" y2="300" stroke="#829087" stroke-width="4"/>
      <line x1="218" y1="55" x2="218" y2="300" stroke="#829087" stroke-width="4"/>` : "";

    svg.innerHTML = `
      <defs>
        <linearGradient id="liquidGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#bfe0c6" stop-opacity="0.7"/>
          <stop offset="1" stop-color="#6aa578" stop-opacity="0.75"/>
        </linearGradient>
        <clipPath id="tankClip"><rect x="${tankX}" y="${tankY}" width="${tankWidth}" height="${tankHeight}" rx="45"/></clipPath>
      </defs>
      <rect x="${tankX}" y="${tankY}" width="${tankWidth}" height="${tankHeight}" rx="45" fill="#f8fbf8" stroke="#1f5c2e" stroke-width="5"/>
      <rect x="${tankX}" y="${liquidY}" width="${tankWidth}" height="${liquidHeight}" fill="url(#liquidGradient)" clip-path="url(#tankClip)"/>
      <line x1="${tankX + 8}" y1="${liquidY}" x2="${tankX + tankWidth - 8}" y2="${liquidY}" stroke="#1f5c2e" stroke-width="2" stroke-dasharray="7 5"/>
      ${baffles}
      <line x1="150" y1="8" x2="150" y2="${tankY + tankHeight - 30}" stroke="#28352c" stroke-width="5"/>
      <rect x="125" y="6" width="50" height="28" rx="4" fill="#e4e9e5" stroke="#28352c" stroke-width="3"/>
      ${impellerMarkup}
      <path d="M105 310 Q150 335 195 310" fill="none" stroke="#295c7a" stroke-width="5" stroke-dasharray="4 5"/>
      <circle cx="118" cy="304" r="4" fill="#295c7a"/><circle cx="140" cy="313" r="4" fill="#295c7a"/><circle cx="163" cy="313" r="4" fill="#295c7a"/><circle cx="185" cy="304" r="4" fill="#295c7a"/>
      <line x1="235" y1="${liquidY}" x2="270" y2="${liquidY}" stroke="#1f5c2e" stroke-width="2"/>
      <text x="274" y="${liquidY + 4}" font-size="12" fill="#1f5c2e">${round(r.initialVolume, 1)} L</text>
      <text x="150" y="354" text-anchor="middle" font-size="13" fill="#334238">${IMPELLERS[r.impellerType]?.name || "Impeller"}</text>
      <text x="150" y="372" text-anchor="middle" font-size="12" fill="#5d6b61">${r.spargerType.replace("-", " ")} sparger</text>
    `;

    const derived = powerAndKla(r, r.initialVolume, r.baseRpm, r.baseVvm);
    $("#vesselReadout").innerHTML = `
      <div><strong>${round(r.initialVolume, 1)} L</strong><span>Initial volume</span></div>
      <div><strong>${round(r.maxWorkingVolume, 1)} L</strong><span>Maximum volume</span></div>
      <div><strong>${round(derived.powerDensity, 2)}</strong><span>Base kW/m³</span></div>
      <div><strong>${round(derived.kla, 0)} h⁻¹</strong><span>Estimated base kLa</span></div>`;
  }

  function updateSidebar() {
    const scenario = buildScenario();
    const processName = scenario.process.type === "fed-batch" ? "Fed-batch" : scenario.process.type.charAt(0).toUpperCase() + scenario.process.type.slice(1);
    $("#sidebarSummary").innerHTML = `
      <dt>Reactor</dt><dd>${round(scenario.reactor.maxWorkingVolume, 1)} L</dd>
      <dt>Strain</dt><dd>${scenario.biology.name.replace("Escherichia coli", "E. coli")}</dd>
      <dt>Process</dt><dd>${processName}</dd>
      <dt>Medium substrate</dt><dd>${round(scenario.medium.effectiveCarbon, 1)} g/L</dd>
      <dt>Feed substrate</dt><dd>${round(scenario.feed.effectiveCarbon, 0)} g/L</dd>
      <dt>Product</dt><dd>${scenario.product.name}</dd>
      <dt>Duration</dt><dd>${round(scenario.process.duration, 1)} h</dd>`;
  }

  function renderReview() {
    const scenario = buildScenario();
    const validation = validateScenario(scenario);
    const summary = $("#validationSummary");
    if (validation.errors.length) {
      summary.innerHTML = `<div class="validation-error"><strong>Correct ${validation.errors.length} input problem${validation.errors.length === 1 ? "" : "s"} before simulation.</strong><ul>${validation.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></div>`;
    } else {
      summary.innerHTML = '<div class="validation-ok"><strong>Input checks passed.</strong> The scenario is ready to simulate.</div>';
    }
    $("#runSimulationBtn").disabled = validation.errors.length > 0;

    const processName = scenario.process.type === "fed-batch" ? "Fed-batch" : scenario.process.type.charAt(0).toUpperCase() + scenario.process.type.slice(1);
    const cards = [
      ["Reactor", [
        ["Preset", scenario.reactor.name],
        ["Initial / maximum", `${round(scenario.reactor.initialVolume, 1)} / ${round(scenario.reactor.maxWorkingVolume, 1)} L`],
        ["Impeller", `${scenario.reactor.impellerCount} × ${IMPELLERS[scenario.reactor.impellerType]?.name || "custom"}`],
        ["DO cascade", `${scenario.reactor.baseRpm}–${scenario.reactor.maxRpm} rpm; ${round(scenario.reactor.baseVvm, 2)}–${round(scenario.reactor.maxVvm, 2)} vvm`],
        ["Inlet gas", scenario.reactor.oxygenSupplyMode === "fixed"
          ? `Fixed ${round(scenario.reactor.fixedOxygenFraction * 100, 1)}% O₂`
          : `Adaptive 21–${round(scenario.reactor.maxOxygenFraction * 100, 1)}% O₂`]
      ]],
      ["Biology", [
        ["Strain", scenario.biology.name],
        ["μmax", `${round(scenario.biology.muMax, 2)} h⁻¹`],
        ["YX/S", `${round(scenario.biology.yxS, 2)} g/g`],
        ["Product", scenario.product.name]
      ]],
      ["Process", [
        ["Mode", processName],
        ["Duration", `${round(scenario.process.duration, 1)} h`],
        ["Temperature", `${round(scenario.process.temperature, 1)} °C`],
        ["pH / DO", `${round(scenario.process.phSetpoint, 1)} / ${round(scenario.process.doSetpoint, 0)}%`],
        ["Base / acid capacity", `${round(scenario.process.maxBaseRate, 2)} / ${round(scenario.process.maxAcidRate, 2)} mL/min`]
      ]],
      ["Materials", [
        ["Medium", scenario.medium.name],
        ["Initial substrate", `${round(scenario.medium.effectiveCarbon, 1)} g/L`],
        ["Feed", scenario.feed.name],
        ["Feed substrate", `${round(scenario.feed.effectiveCarbon, 0)} g/L`]
      ]]
    ];
    $("#reviewCards").innerHTML = cards.map(([title, rows]) => `
      <article class="review-card"><h3>${escapeHtml(title)}</h3><dl>${rows.map(([term, value]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(String(value))}</dd>`).join("")}</dl></article>`).join("");
  }

  function showStep(index) {
    state.currentStep = clamp(Number(index) || 0, 0, 6);
    $$(".stage[data-stage]").forEach((stage) => stage.classList.toggle("is-active", Number(stage.dataset.stage) === state.currentStep));
    $$(".step[data-step]").forEach((step) => {
      const stepIndex = Number(step.dataset.step);
      step.classList.toggle("is-active", stepIndex === state.currentStep);
      step.classList.toggle("is-complete", stepIndex < state.currentStep);
    });
    $("#previousBtn").disabled = state.currentStep === 0;
    $("#nextBtn").hidden = state.currentStep === 6;
    $("#nextBtn").textContent = state.currentStep === 5 ? "Run and show results" : "Next stage";
    if (state.currentStep === 5) renderReview();
    if (state.currentStep === 6 && state.lastResult) renderResults(state.lastResult);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateAllViews() {
    if (state.lastResult) {
      state.lastResult = null;
      renderResultsPlaceholder();
      $("#resultPlaceholder").textContent = "Settings changed. Run the simulation again to view or export current results.";
    }
    updateConditionalFields();
    updateCompositionTotals();
    updateDerivedGeometry();
    drawVessel();
    updateSidebar();
    state.feedDerivation?.refresh();
    if (state.currentStep === 5) renderReview();
  }

  function runCurrentSimulation() {
    const scenario = buildScenario();
    const validation = validateScenario(scenario);
    if (validation.errors.length) {
      showStep(5);
      setStatus("Simulation blocked by input errors.", true);
      return;
    }
    try {
      const result = simulate(scenario);
      state.lastResult = result;
      renderResults(result);
      showStep(6);
      setStatus(`Simulation completed with ${result.records.length} stored time points.`);
    } catch (error) {
      setStatus(error.message || "Simulation failed.", true);
    }
  }

  function renderResultsPlaceholder() {
    window.FermentationFailureResults?.reset();
    $("#downloadCsvBtn").disabled = $("#downloadReportBtn").disabled = true;
    $("#resultPlaceholder").hidden = false;
    $("#resultsContent").hidden = true;
  }

  function renderResults(result) {
    $("#downloadCsvBtn").disabled = $("#downloadReportBtn").disabled = false;
    $("#resultPlaceholder").hidden = true;
    $("#resultsContent").hidden = false;
    const s = result.summary;
    const productUnit = result.scenario.product.type === "biomass" ? "gDCW" : "g";
    const kpis = [
      ["Accepted product", `${round(s.acceptedProduct, 2)} ${productUnit}`, s.batchFailed ? "Batch rejected by a strict failure rule" : s.strictFailures ? "No batch rejection triggered" : "Strict failure rules disabled"],
      ["Final biomass", `${round(s.finalBiomassConcentration, 2)} g/L`, `${round(s.totalBiomass, 1)} g in reactor`],
      ["Recoverable product", `${round(s.recoverableProduct, 2)} ${productUnit}`, `${round(s.finalProductTiter, 3)} g/L final titre`],
      ["Total nutrient feed", `${round(s.cumulativeFeed, 3)} L`, `${round(s.peakFeedRate, 2)} mL/min peak`],
      ["Substrate yield", `${round(s.productYield, 3)} g/g`, "recoverable product / substrate"],
      ["Final volume", `${round(s.finalVolume, 2)} L`, `${round(s.cumulativeBase * 1000, 1)} mL base · ${round(s.cumulativeAcid * 1000, 1)} mL acid`],
      ["O₂-limited time", `${round(s.oxygenLimitedHours, 2)} h`, `${round(s.peakOur, 1)} mmol/L/h peak OUR`]
    ];
    $("#kpiGrid").innerHTML = kpis.map(([label, value, note]) => `<article class="kpi-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join("");

    window.FermentationFailureResults?.render(result);

    const finalRows = [
      ["Strict failure rules", s.strictFailures ? `Enabled · ${s.failureProfile}` : "Disabled"],
      ["Culture / batch status", `${s.cultureFailed ? "Dead" : "Viable"} / ${s.batchFailed ? "Rejected" : "Not rejected"}`],
      ["Accepted product", `${round(s.acceptedProduct, 4)} ${productUnit}`],
      ["Viable / nonviable biomass in reactor", `${round(s.viableBiomass, 3)} / ${round(s.nonviableBiomass, 3)} gDCW`],
      ["Physical extrapolation beyond vessel capacity", s.invalidExtrapolation ? "Invalid after capacity breach" : "Not flagged"],
      ["Stop condition", s.stoppedReason],
      ["Final process time", `${round(s.finalTime, 2)} h`],
      ["Final working volume", `${round(s.finalVolume, 3)} L`],
      ["Peak working volume", `${round(s.peakVolume, 3)} L`],
      ["Maximum working-volume excess", `${Number(s.maxWorkingVolumeExcess.toPrecision(6))} L (${Number(s.maxWorkingVolumeExcessPercent.toPrecision(6))}%)`],
      ["Final biomass concentration", `${round(s.finalBiomassConcentration, 3)} gDCW/L`],
      ["Biomass in reactor", `${round(s.totalBiomass, 3)} gDCW`],
      ["Final recoverable product titre", `${round(s.finalProductTiter, 4)} g/L`],
      ["Total recoverable product", `${round(s.recoverableProduct, 4)} ${productUnit}`],
      ["Observed product yield on substrate", `${round(s.productYield, 4)} g/g`],
      ["Observed biomass yield on substrate", `${round(s.biomassYieldObserved, 4)} g/g`],
      ["Initial substrate", `${round(s.initialSubstrate, 3)} g equivalent`],
      ["Substrate supplied in feed", `${round(s.substrateInFeed, 3)} g equivalent`],
      ["Substrate consumed", `${round(s.substrateConsumed, 3)} g equivalent`],
      ["Residual substrate", `${round(s.residualSubstrate, 3)} g equivalent`],
      ["Final residual substrate concentration", `${round(s.finalSubstrateConcentration, 3)} g/L`],
      ["Final acetate concentration", `${round(s.finalAcetateConcentration, 3)} g/L`],
      ["Cumulative nutrient feed", `${round(s.cumulativeFeed, 4)} L`],
      ["Cumulative base addition", `${round(s.cumulativeBase * 1000, 2)} mL`],
      ["Cumulative acid addition", `${round(s.cumulativeAcid * 1000, 2)} mL`],
      ["Cumulative broth outflow", `${round(s.cumulativeOutflow, 4)} L`],
      ["Total inlet gas supplied", `${round(s.cumulativeGasL / 1000, 3)} m³`],
      ["Oxygen contained in inlet gas", `${round(s.cumulativeInletOxygenMol, 3)} mol`],
      ["Estimated oxygen consumed", `${round(s.oxygenConsumedMmol / 1000, 3)} mol`],
      ["Estimated CO₂ produced", `${round(s.carbonDioxideG, 2)} g`],
      ["Peak OTR", `${round(s.peakOtr, 2)} mmol/L/h`],
      ["Peak OUR", `${round(s.peakOur, 2)} mmol/L/h`],
      ["Substrate bookkeeping closure", `${round(s.balanceClosure, 3)}%`],
      ["Assumed-carbon balance closure", `${round(s.carbonBalanceClosure, 6)}%`],
      ["Oxygen balance residual", `${s.oxygenBalanceResidualMmol.toExponential(2)} mmol`],
      ["Actual maximum integration interval", `${s.integrationStep} h`],
      ["Model build", result.modelVersion]
    ];
    $("#finalStateTable").innerHTML = finalRows.map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(String(value))}</td></tr>`).join("");

    const limitation = s.oxygenLimitedHours > 0.2
      ? `The configured oxygen-transfer system constrained growth for approximately ${round(s.oxygenLimitedHours, 2)} h.`
      : "The oxygen-transfer model did not identify a prolonged severe oxygen limitation.";
    const substrateState = s.finalSubstrateConcentration > 2
      ? `Residual substrate remained high at ${round(s.finalSubstrateConcentration, 2)} g/L, indicating overfeeding or incomplete conversion in this parameter set.`
      : `Residual substrate ended at ${round(s.finalSubstrateConcentration, 2)} g/L.`;
    $("#interpretationText").textContent = `${limitation} ${substrateState} The predicted ${result.scenario.product.name.toLowerCase()} output is controlled directly by the supplied α, β, degradation and recoverability assumptions.`;

    drawAllCharts(result.records);
  }

  const CHART_COLORS = ["#1f5c2e", "#a05a00", "#295c7a", "#8b1f1f", "#71568f"];

  function selectResultTab(name, focus = false) {
    state.resultTab = name === "reactor" ? "reactor" : "process";
    $$("[data-result-tab]").forEach((tab) => {
      const selected = tab.dataset.resultTab === state.resultTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
      if (selected && focus) tab.focus();
    });
    if (state.lastResult && state.currentStep === 6) drawAllCharts(state.lastResult.records);
  }

  function bindResultTabs() {
    const tabs = $$("[data-result-tab]");
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectResultTab(tab.dataset.resultTab));
      tab.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        selectResultTab(tabs[next].dataset.resultTab, true);
      });
    });
  }

  function reactorChartRecords(records, scenario) {
    return records.map((record, index) => {
      const previous = records[index - 1];
      const hours = previous ? record.time - previous.time : 0;
      return {
        ...record,
        baseAddedMl: record.cumulativeBase * 1000,
        acidAddedMl: (record.cumulativeAcid ?? 0) * 1000,
        // Cumulative inventory differences retain all deliveries, including short pulses.
        baseRateMlMin: hours > 0 ? (record.cumulativeBase - previous.cumulativeBase) / (hours * 0.06) : 0,
        acidRateMlMin: hours > 0 ? ((record.cumulativeAcid ?? 0) - (previous.cumulativeAcid ?? 0)) / (hours * 0.06) : 0,
        cascadePercent: record.doControllerOutput * 100,
        rpmLimit: scenario.reactor.maxRpm,
        vvmLimit: scenario.reactor.maxVvm,
        oxygenLimit: window.FermentationModel.inletOxygenLimit(scenario.reactor) * 100,
        volumeLimit: scenario.reactor.maxWorkingVolume,
        feedLimit: scenario.feed.maxRateMlMin,
        baseLimit: scenario.process.maxBaseRate,
        acidLimit: scenario.process.maxAcidRate ?? 0,
        cascadeLimit: 100
      };
    });
  }

  function drawReactorCharts(records, scenario) {
    const data = reactorChartRecords(records, scenario);
    const charts = [
      ["agitationChart", "rpm", "Stirrer", "rpm", "rpmLimit"],
      ["aerationChart", "vvm", "Aeration", "vvm", "vvmLimit"],
      ["inletOxygenChart", "oxygenFraction", "Inlet O₂", "% O₂", "oxygenLimit"],
      ["klaChart", "kla", "kLa", "h⁻¹"],
      ["feedPumpChart", "feedRateMlMin", "Delivered feed", "mL/min", Number.isFinite(scenario.feed.maxRateMlMin) ? "feedLimit" : null],
      ["feedAddedChart", "cumulativeFeed", "Feed added", "L"],
      ["basePumpChart", "baseRateMlMin", "Average base", "mL/min", "baseLimit", true],
      ["baseAddedChart", "baseAddedMl", "Base added", "mL"],
      ["acidPumpChart", "acidRateMlMin", "Average acid", "mL/min", "acidLimit", true],
      ["acidAddedChart", "acidAddedMl", "Acid added", "mL"],
      ["reactorVolumeChart", "volume", "Working volume", "L", "volumeLimit"],
      ["cascadeOutputChart", "cascadePercent", "Cascade output", "%", "cascadeLimit"]
    ];
    charts.forEach(([id, key, label, unit, limit, intervalAverage]) => {
      const series = [{ key, label, color: CHART_COLORS[0], intervalAverage }];
      if (limit && !(key === "oxygenFraction" && scenario.reactor.oxygenSupplyMode === "fixed"))
        series.push({ key: limit, label: "Maximum", color: "#737373", dashed: true });
      const fixedMaximum = key === "oxygenFraction" || key === "cascadePercent" ? 100 : null;
      drawChart(document.getElementById(id), data, series, unit, fixedMaximum);
    });
  }

  function prepareCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(220, Math.floor(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height };
  }

  function niceMaximum(value) {
    if (!Number.isFinite(value) || value <= 0) return 1;
    const exponent = Math.floor(Math.log10(value));
    const fraction = value / Math.pow(10, exponent);
    const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return niceFraction * Math.pow(10, exponent);
  }

  function drawChart(canvas, records, series, yLabel = "", fixedMaximum = null) {
    const { context: ctx, width, height } = prepareCanvas(canvas);
    const margin = { left: 58, right: 18, top: 48, bottom: 42 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxTime = Math.max(1, records[records.length - 1]?.time || 1);
    const allValues = series.flatMap((item) => records.map((record) => Number(record[item.key]) || 0));
    const maxY = fixedMaximum ?? niceMaximum(Math.max(...allValues, 0.0001) * 1.05);

    ctx.font = "12px Georgia, serif";
    ctx.strokeStyle = "#c7d0c8";
    ctx.fillStyle = "#5d6b61";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i += 1) {
      const y = margin.top + plotHeight * (i / 5);
      const value = maxY * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
      ctx.fillText(formatAxis(value), 6, y + 4);
    }
    for (let i = 0; i <= 5; i += 1) {
      const x = margin.left + plotWidth * (i / 5);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
      const label = formatAxis(maxTime * i / 5);
      ctx.fillText(label, x - ctx.measureText(label).width / 2, height - 18);
    }

    ctx.strokeStyle = "#829087";
    ctx.strokeRect(margin.left, margin.top, plotWidth, plotHeight);
    ctx.fillText("Time (h)", margin.left + plotWidth / 2 - 20, height - 3);
    if (yLabel) ctx.fillText(yLabel, margin.left, 15);

    series.forEach((item, index) => {
      ctx.strokeStyle = item.color || CHART_COLORS[index % CHART_COLORS.length];
      ctx.lineWidth = 2;
      ctx.setLineDash(item.dashed ? [6, 4] : []);
      ctx.beginPath();
      records.forEach((record, pointIndex) => {
        const x = margin.left + (record.time / maxTime) * plotWidth;
        const y = margin.top + plotHeight - ((Number(record[item.key]) || 0) / maxY) * plotHeight;
        if (pointIndex === 0) ctx.moveTo(x, y);
        else if (item.intervalAverage) {
          const previousX = margin.left + records[pointIndex - 1].time / maxTime * plotWidth;
          ctx.lineTo(previousX, y);
          ctx.lineTo(x, y);
        } else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const legendX = margin.left + index * Math.max(110, plotWidth / series.length);
      ctx.beginPath();
      ctx.moveTo(legendX, 29);
      ctx.lineTo(legendX + 14, 29);
      ctx.stroke();
      ctx.fillStyle = "#334238";
      ctx.fillText(item.label, legendX + 20, 33);
    });
    ctx.setLineDash([]);
  }

  function drawControlChart(canvas, records) {
    const { context: ctx, width, height } = prepareCanvas(canvas);
    const margin = { left: 58, right: 54, top: 48, bottom: 42 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxTime = Math.max(1, records[records.length - 1]?.time || 1);
    const maxDo = niceMaximum(Math.max(...records.map((record) => record.dissolvedOxygen), 100));
    const minPh = Math.min(...records.map((record) => record.ph), 7);
    const maxPh = Math.max(...records.map((record) => record.ph), 7);
    const phLow = Math.floor((minPh - 0.2) * 2) / 2;
    const phHigh = Math.max(phLow + 1, Math.ceil((maxPh + 0.2) * 2) / 2);

    ctx.font = "12px Georgia, serif";
    ctx.strokeStyle = "#c7d0c8";
    ctx.fillStyle = "#5d6b61";
    for (let i = 0; i <= 5; i += 1) {
      const y = margin.top + plotHeight * i / 5;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
      ctx.fillText(formatAxis(maxDo * (1 - i / 5)), 6, y + 4);
      const phValue = phHigh - (phHigh - phLow) * i / 5;
      ctx.fillText(phValue.toFixed(1), width - margin.right + 8, y + 4);
    }
    for (let i = 0; i <= 5; i += 1) {
      const x = margin.left + plotWidth * i / 5;
      const label = formatAxis(maxTime * i / 5);
      ctx.fillText(label, x - ctx.measureText(label).width / 2, height - 18);
    }
    ctx.strokeStyle = "#829087";
    ctx.strokeRect(margin.left, margin.top, plotWidth, plotHeight);
    ctx.fillText("DO (% air saturation)", margin.left, 15);
    ctx.fillText("pH", width - margin.right + 8, 15);
    ctx.fillText("Time (h)", margin.left + plotWidth / 2 - 20, height - 3);

    const drawSeries = (key, color, transform) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      records.forEach((record, index) => {
        const x = margin.left + record.time / maxTime * plotWidth;
        const y = transform(record[key]);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    drawSeries("dissolvedOxygen", CHART_COLORS[0], (value) => margin.top + plotHeight - value / maxDo * plotHeight);
    drawSeries("ph", CHART_COLORS[2], (value) => margin.top + plotHeight - (value - phLow) / (phHigh - phLow) * plotHeight);

    ctx.fillStyle = CHART_COLORS[0];
    ctx.fillRect(margin.left, 27, 14, 3);
    ctx.fillStyle = "#334238";
    ctx.fillText("Dissolved oxygen", margin.left + 20, 33);
    ctx.fillStyle = CHART_COLORS[2];
    ctx.fillRect(margin.left + 155, 27, 14, 3);
    ctx.fillStyle = "#334238";
    ctx.fillText("pH", margin.left + 175, 33);
  }

  function formatAxis(value) {
    if (Math.abs(value) >= 1000) return `${round(value / 1000, 1)}k`;
    if (Math.abs(value) >= 10) return String(round(value, 0));
    if (Math.abs(value) >= 1) return String(round(value, 1));
    if (value !== 0 && Math.abs(value) < 0.01) return value.toExponential(1);
    return String(round(value, 2));
  }

  function drawAllCharts(records) {
    if (!records?.length) return;
    if (state.resultTab === "reactor") {
      drawReactorCharts(records, state.lastResult.scenario);
      return;
    }
    drawChart($("#growthChart"), records, [
      { key: "biomassConcentration", label: "Total DCW (g/L)", color: CHART_COLORS[0] },
      ...(state.lastResult?.summary.strictFailures ? [
        { key: "viableBiomassConcentration", label: "Viable DCW (g/L)", color: CHART_COLORS[2] },
        { key: "nonviableBiomassConcentration", label: "Nonviable DCW (g/L)", color: CHART_COLORS[3] }
      ] : []),
      { key: "productConcentration", label: "Product (g/L)", color: CHART_COLORS[1] }
    ], "g/L");
    drawChart($("#substrateChart"), records, [
      { key: "substrateConcentration", label: "Substrate", color: CHART_COLORS[2] },
      { key: "acetateConcentration", label: "Acetate", color: CHART_COLORS[3] }
    ], "g/L");
    drawChart($("#oxygenChart"), records, [
      { key: "otr", label: "OTR", color: CHART_COLORS[0] },
      { key: "our", label: "OUR", color: CHART_COLORS[3] }
    ], "mmol/L/h");
    drawChart($("#volumeChart"), records, [
      { key: "volume", label: "Working volume", color: CHART_COLORS[2] },
      { key: "cumulativeFeed", label: "Nutrient feed", color: CHART_COLORS[1] }
    ], "L");
    drawChart($("#growthRateChart"), records, [
      { key: "growthRate", label: "Modeled μ", color: CHART_COLORS[0] }
    ], "h⁻¹");
    drawControlChart($("#controlChart"), records);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(message, error = false) {
    const status = $("#saveStatus");
    status.textContent = message;
    status.style.color = error ? "#8b1f1f" : "#1f5c2e";
    window.clearTimeout(setStatus.timeout);
    setStatus.timeout = window.setTimeout(() => { status.textContent = ""; }, 5000);
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportScenario() {
    const scenario = buildScenario();
    if (validateScenario(scenario).errors.length) {
      showStep(5); setStatus("Correct the input errors before exporting a scenario.", true); return;
    }
    downloadBlob("fermentation-scenario.json", JSON.stringify(scenario, null, 2), "application/json");
    setStatus("Scenario exported.");
  }

  function exportCsv() {
    if (!state.lastResult) return;
    const records = state.lastResult.records;
    const headers = Object.keys(records[0]);
    const lines = [headers.join(",")];
    records.forEach((record) => {
      lines.push(headers.map((header) => {
        const value = record[header];
        return typeof value === "string" ? `"${value.replaceAll('"', '""')}"` : Number(value).toFixed(6);
      }).join(","));
    });
    downloadBlob("fermentation-time-series.csv", lines.join("\n"), "text/csv;charset=utf-8");
  }

  function exportReport() {
    if (!state.lastResult) return;
    const report = {
      generatedAt: new Date().toISOString(),
      model: "Fermentation Simulator " + state.lastResult.modelVersion,
      assumptions: state.lastResult.assumptions,
      disclaimer: "Illustrative, non-validated model. Calibrate before process use.",
      scenario: state.lastResult.scenario,
      summary: state.lastResult.summary,
      failures: state.lastResult.failures,
      warnings: state.lastResult.warnings
    };
    downloadBlob("fermentation-report.json", JSON.stringify(report, null, 2), "application/json");
  }

  function saveLocal() {
    const scenario = buildScenario();
    if (validateScenario(scenario).errors.length) {
      showStep(5); setStatus("Correct the input errors before replacing the saved scenario.", true); return;
    }
    try {
      localStorage.setItem("fermentationSimulatorScenario", JSON.stringify(scenario));
      setStatus("Scenario saved in this browser.");
    } catch (error) {
      setStatus("Browser storage is unavailable in this context. Use Export scenario instead.", true);
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem("fermentationSimulatorScenario");
      if (!raw) {
        setStatus("No saved browser scenario was found.", true);
        return;
      }
      applyScenario(JSON.parse(raw));
      setStatus("Saved scenario loaded.");
    } catch (error) {
      setStatus(`Could not load scenario: ${error.message}`, true);
    }
  }

  function bindEvents() {
    bindResultTabs();
    $("#reactorPreset").addEventListener("change", (event) => applyReactorPreset(event.target.value, true));
    $("#strainPreset").addEventListener("change", (event) => applyStrainPreset(event.target.value, true));
    $("#productType").addEventListener("change", (event) => applyProductDefaults(event.target.value));
    $("#mediumPreset").addEventListener("change", (event) => applyMediumPreset(event.target.value, true));
    $("#feedPreset").addEventListener("change", (event) => applyFeedPreset(event.target.value, true));
    $("#impellerType").addEventListener("change", (event) => {
      setValue("powerNumber", IMPELLERS[event.target.value]?.powerNumber ?? 1);
      updateAllViews();
    });

    $("#vesselDiameter").addEventListener("input", () => {
      const diameter = getNumber("vesselDiameter");
      const height = getNumber("liquidHeight");
      if (diameter > 0 && height > 0) setValue("heightDiameterRatio", round(height / diameter, 2));
    });
    $("#liquidHeight").addEventListener("input", () => {
      const diameter = getNumber("vesselDiameter");
      const height = getNumber("liquidHeight");
      if (diameter > 0 && height > 0) setValue("heightDiameterRatio", round(height / diameter, 2));
    });
    $("#heightDiameterRatio").addEventListener("input", () => {
      const diameter = getNumber("vesselDiameter");
      const ratio = getNumber("heightDiameterRatio");
      if (diameter > 0 && ratio > 0) setValue("liquidHeight", round(diameter * ratio, 3));
    });

    $("#simulatorForm").addEventListener("input", (event) => {
      if (event.target.closest(".composition-table")) return;
      updateAllViews();
    });
    $("#simulatorForm").addEventListener("change", (event) => {
      if (event.target.closest(".composition-table")) return;
      updateAllViews();
    });

    $("#addMediumComponentBtn").addEventListener("click", () => addComponent("medium"));
    $("#addFeedComponentBtn").addEventListener("click", () => addComponent("feed"));
    $$(".step[data-step]").forEach((button) => button.addEventListener("click", () => showStep(Number(button.dataset.step))));
    $("#previousBtn").addEventListener("click", () => showStep(state.currentStep - 1));
    $("#nextBtn").addEventListener("click", () => {
      if (state.currentStep === 5) runCurrentSimulation(); else showStep(state.currentStep + 1);
    });
    $("#runSimulationBtn").addEventListener("click", runCurrentSimulation);
    $("#rerunBtn").addEventListener("click", runCurrentSimulation);

    $("#saveScenarioBtn").addEventListener("click", saveLocal);
    $("#loadScenarioBtn").addEventListener("click", loadLocal);
    $("#exportScenarioBtn").addEventListener("click", exportScenario);
    $("#resetScenarioBtn").addEventListener("click", resetDemo);
    $("#downloadCsvBtn").addEventListener("click", exportCsv);
    $("#downloadReportBtn").addEventListener("click", exportReport);
    $("#importScenarioInput").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        applyScenario(JSON.parse(await file.text()));
        setStatus("Scenario imported.");
      } catch (error) {
        setStatus(`Import failed: ${error.message}`, true);
      } finally {
        event.target.value = "";
      }
    });

    window.addEventListener("resize", () => {
      window.clearTimeout(state.chartResizeTimer);
      state.chartResizeTimer = window.setTimeout(() => {
        if (state.lastResult && state.currentStep === 6) drawAllCharts(state.lastResult.records);
      }, 150);
    });
  }

  function init() {
    populateSelect($("#reactorPreset"), REACTORS);
    populateSelect($("#strainPreset"), STRAINS);
    populateSelect($("#mediumPreset"), MEDIA);
    populateSelect($("#feedPreset"), FEEDS);
    bindEvents();
    resetDemo();
    if (window.FermentationFeedDerivationUI) {
      state.feedDerivation = window.FermentationFeedDerivationUI.create({
        getScenario: buildScenario,
        getPreferredMu: (scenario) => STRAINS[scenario.biology.preset]?.recommendedProcess?.targetGrowthRate,
        applyValues: (values) => {
          Object.entries(values).forEach(([id, value]) => setValue(id, value));
          updateAllViews();
          setStatus("Derived feed values applied. Pump capacity and other manual settings were preserved. Run the simulation to check the result.");
        }
      });
      state.feedDerivation.refresh();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
