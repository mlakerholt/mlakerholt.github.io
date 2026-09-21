(() => {
  "use strict";

  const definitions = [
    ["muMax", "Maximum growth rate, μmax", "h⁻¹"],
    ["ks", "Monod KS", "g/L"],
    ["yxS", "Biomass yield, YX/S", "g/g"],
    ["maintenance", "Maintenance, mS", "g/g/h"],
    ["qO2Max", "Respiratory capacity setting, qO₂ max", "mmol/g/h"],
    ["optimalTemperature", "Optimal temperature", "°C"],
    ["optimalPh", "Optimal pH", ""],
    ["overflow", "Overflow model", ""],
    ["recommendedProduct", "Automatic product selection", ""],
    ["recommendedMedium", "Automatic medium selection", ""],
    ["recommendedFeed", "Automatic feed selection", ""]
  ];

  const sources = {
    cho: {
      title: "Using simple models to describe the kinetics of growth, glucose consumption, and monoclonal antibody formation in naive and infliximab producer CHO cells",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4960177/"
    },
    hybridoma: {
      title: "Analysis of kinetic, stoichiometry and regulation of glucose and glutamine metabolism in hybridoma batch cultures using logistic equations",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2267508/"
    },
    hek293: {
      title: "A Multi-Omics Analysis of Recombinant Protein Production in HEK293 Cells",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3427347/"
    },
    yeast: {
      title: "Effect of Specific Growth Rate on Fermentative Capacity of Baker's Yeast",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC106631/"
    },
    aspergillus: {
      title: "Stoichiometry and kinetics of single and mixed substrate uptake in Aspergillus niger",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5773628/"
    },
    ecoliHosts: {
      title: "A Comparative Analysis of Industrial Escherichia coli K-12 and B Strains in High-Glucose Batch Cultivations",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3738542/"
    },
    ecoliStress: {
      title: "Combinatorial Strategies for Improving Multiple-Stress Resistance in Industrially Relevant Escherichia coli Strains",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4178669/"
    },
    mg1655Flux: {
      title: "Effect of iclR and arcA knockouts on biomass formation and metabolic fluxes in Escherichia coli K-12",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3094197/"
    },
    mg1655Oxygen: {
      title: "Escherichia coli avoids high dissolved oxygen stress by activation of SoxRS and manganese-superoxide dismutase",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3605374/"
    },
    w3110Affinity: {
      title: "Selection for tryptophan auxotrophs of Escherichia coli in glucose-limited chemostats",
      url: "https://doi.org/10.1111/j.1558-5646.1978.tb01103.x"
    },
    w3110Product: {
      title: "Growth-dependent recombinant product formation kinetics can be reproduced through engineering of glucose transport",
      url: "https://pubmed.ncbi.nlm.nih.gov/30710996/"
    },
    dh5a: {
      title: "Engineering Escherichia coli to increase plasmid DNA production in high cell-density cultivations in batch mode",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3503842/"
    },
    bacillusEnergetics: {
      title: "Bacillus subtilis Metabolism and Energetics in Carbon-Limited and Excess-Carbon Chemostat Culture",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC95580/"
    },
    bacillusMaintenance: {
      title: "Maintenance metabolism and carbon fluxes in Bacillus species",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2442585/"
    },
    coryneChemostat: {
      title: "Revisiting the Growth Modulon of Corynebacterium glutamicum Under Glucose Limited Chemostat Conditions",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7594717/"
    },
    coryneRich: {
      title: "Physiological Response of Corynebacterium glutamicum to Increasingly Nutrient-Rich Growth Conditions",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6123352/"
    },
    putidaGlucose: {
      title: "Pseudomonas putida KT2440 metabolizes glucose through a cycle formed by the ED, EMP and PP pathways",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4646247/"
    },
    putidaMaintenance: {
      title: "Reconciling in vivo and in silico key biological parameters of Pseudomonas putida KT2440",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3829105/"
    }
  };

  const raw = [
    { id: "cho-mab", category: "Animal cell culture", name: "CHO recombinant clone — monoclonal antibody", values: [0.04, 0.664, 0.43, 0.01, 0.3, 37, 7.1, "Disabled", "Monoclonal antibody", "CHO chemically defined basal medium", "CHO balanced nutrient feed"], source: sources.cho,
      evidence: { muMax: ["Published measurement", "Reported recombinant-CHO μmax at both 33 and 37 °C."], ks: ["Published measurement", "Reported recombinant-CHO glucose KS."], yxS: ["Derived conversion", "Reported cell/mg-glucose yield converted to g/g using an assumed representative cell dry mass."], optimalTemperature: ["Published condition", "The study cultured recombinant CHO at 33 and 37 °C."], recommendedProduct: ["Model selection", "The cited recombinant clone produced monoclonal antibody."], recommendedMedium: ["App assumption", "Generic editable chemically defined recipe; not the proprietary study-medium formula."], recommendedFeed: ["App assumption", "Generic editable animal-cell feed, not a vendor formulation."] },
      notes: ["CHO is not a single kinetic phenotype. Host lineage, recombinant construct, selection system, clone screening, adaptation and process conditions can change growth and productivity.", "Animal-cell values are converted to dry-biomass equivalents because the current simulator does not integrate viable-cell density."] },
    { id: "hybridoma-mab", category: "Animal cell culture", name: "Mouse hybridoma 55-6 — monoclonal antibody", values: [0.055, 0.023, 0.14, 0.015, 0.3, 37, 7.2, "Disabled", "Monoclonal antibody", "RPMI 1640 hybridoma medium", "Animal-cell glucose and glutamine feed"], source: sources.hybridoma,
      evidence: { muMax: ["Published measurement", "Reported maximum specific growth rate for hybridoma 55-6."], ks: ["Derived conversion", "Reported glucose KS of 0.13 mM converted using 180.16 g/mol glucose."], yxS: ["Derived conversion", "Reported cell/mmol-glucose yield converted using an assumed representative cell dry mass."], optimalTemperature: ["Published condition", "Study cultures were incubated at 37 °C."], recommendedProduct: ["Published condition", "The 55-6 line produced an IgG2a monoclonal antibody."], recommendedMedium: ["Published condition", "Study basis was RPMI 1640 with glutamine and 10% serum."], recommendedFeed: ["App assumption", "Generic glucose/glutamine feed; the publication evaluated batch cultures."] },
      notes: ["Hybridoma kinetics and antibody productivity are cell-line and medium dependent.", "The current model omits viable-cell death, glutamine co-limitation, lactate and ammonia."] },
    { id: "hek293-recombinant", category: "Animal cell culture", name: "HEK293F suspension — recombinant protein", values: [0.028, 0.1, 0.36, 0.01, 0.334, 37, 7, "Disabled", "Secreted protein", "HEK293 serum-free suspension medium", "CHO balanced nutrient feed"], source: sources.hek293,
      evidence: { muMax: ["Published measurement", "Reported exponential growth rate of producer and parental HEK293F cultures."], yxS: ["Derived conversion", "Calculated from reported μ and producer glucose-uptake rate."], qO2Max: ["Derived conversion", "Reported OUR of 334 µmol/gDW/h converted to 0.334 mmol/gDW/h."], optimalTemperature: ["Published condition", "Bioreactor temperature was 37 °C."], optimalPh: ["Published condition", "Bioreactor pH was controlled at 7.0."], recommendedProduct: ["Published condition", "Study system produced a recombinant protein."], recommendedMedium: ["Literature-informed assumption", "Generic editable serum-free HEK293 recipe; the study used proprietary FreeStyle 293 medium."], recommendedFeed: ["App assumption", "Generic balanced feed; not the study formulation."] },
      notes: ["Stable and transient expression, adaptation and construct burden can substantially change HEK293 growth and productivity."] },
    { id: "ecoli-bl21", category: "Microbial fermentation", name: "Escherichia coli BL21(DE3)", values: [0.55, 0.05, 0.48, 0.02, 12, 37, 7, "E. coli acetate enabled", "No automatic change", "No automatic change", "No automatic change"], sources: [sources.ecoliHosts, sources.ecoliStress],
      evidence: { muMax: ["Literature-informed assumption", "The preset 0.55 h⁻¹ is conservative relative to 0.73 ± 0.01 h⁻¹ reported for non-recombinant BL21 in high-glucose batch culture.", [sources.ecoliHosts]], yxS: ["Literature-informed assumption", "The preset 0.48 g/g is close to the reported 0.45 g/g observed yield and 0.46 g/g overflow-corrected yield.", [sources.ecoliHosts]], optimalTemperature: ["Published condition", "The comparative bioreactor study controlled temperature at 37 °C.", [sources.ecoliHosts]], optimalPh: ["Published condition", "The comparative bioreactor study maintained pH 7.0 ± 0.05.", [sources.ecoliHosts]], overflow: ["Literature-informed assumption", "BL21 produced and then reassimilated less acetate than the K-12 hosts, but acetate behavior remains condition dependent.", [sources.ecoliHosts, sources.ecoliStress]] },
      notes: ["The cited BL21 comparison used a non-recombinant B strain without the DE3 expression system; recombinant burden can lower growth and alter overflow.", "No strain-specific source was found that directly supports the preset KS, maintenance or qO₂ maximum."] },
    { id: "ecoli-mg1655", category: "Microbial fermentation", name: "Escherichia coli K-12 MG1655", values: [0.66, 0.04, 0.5, 0.025, 13, 37, 7, "E. coli acetate enabled", "No automatic change", "No automatic change", "No automatic change"], sources: [sources.mg1655Flux, sources.mg1655Oxygen, sources.ecoliStress],
      evidence: { muMax: ["Published measurement", "Wild-type MG1655 batch μmax was reported as 0.66 ± 0.02 h⁻¹.", [sources.mg1655Flux]], yxS: ["Published measurement", "A separate aerobic MG1655 study reported 0.496 ± 0.037 g/g at 30% dissolved oxygen, supporting the rounded 0.50 g/g preset.", [sources.mg1655Oxygen]], optimalTemperature: ["Published condition", "The flux study cultivated MG1655 at 37 °C.", [sources.mg1655Flux]], optimalPh: ["Published condition", "The flux study maintained pH 7.0.", [sources.mg1655Flux]], overflow: ["Published measurement", "Glucose-abundant MG1655 displayed acetate overflow; the oxygen study reported an acetate yield near 0.136 g/g.", [sources.mg1655Flux, sources.mg1655Oxygen]] },
      notes: ["The qO₂ preset is not a direct transcription of the cited oxygen study and remains an editable model maximum.", "MG1655 acetate sensitivity and reassimilation differ from BL21 and W3110."] },
    { id: "ecoli-w3110", category: "Microbial fermentation", name: "Escherichia coli W3110", values: [0.6, 0.05, 0.49, 0.022, 12.5, 37, 7, "E. coli acetate enabled", "No automatic change", "No automatic change", "No automatic change"], sources: [sources.w3110Affinity, sources.w3110Product, sources.ecoliStress],
      evidence: { ks: ["Literature-informed assumption", "A W3110 glucose-limited chemostat study reported a much lower apparent half-saturation value of 7.2 mg/L; the 50 mg/L preset is therefore a conservative model value, not a transcription.", [sources.w3110Affinity]], optimalTemperature: ["Published condition", "The W3110 glucose-affinity experiments were conducted at 37 °C.", [sources.w3110Affinity]], overflow: ["Published measurement", "W3110 acetate formation and its reduction by engineered glucose transport were measured directly.", [sources.w3110Product, sources.ecoliStress]], recommendedProduct: ["App assumption", "No product is selected automatically; W3110 is used in recombinant-product studies but product choice is construct specific.", [sources.w3110Product]] },
      notes: ["The sources establish W3110 glucose affinity and overflow behavior, but do not directly support the preset μmax, yield, maintenance or qO₂ values."] },
    { id: "ecoli-dh5a", category: "Microbial fermentation", name: "Escherichia coli DH5α", values: [0.48, 0.06, 0.46, 0.025, 10, 37, 7, "E. coli acetate enabled", "No automatic change", "No automatic change", "No automatic change"], sources: [sources.dh5a],
      evidence: { muMax: ["Literature-informed assumption", "DH5α growth was about 0.43 h⁻¹ at 5 g/L glucose and fell to 0.17 ± 0.02 h⁻¹ at 100 g/L; the 0.48 h⁻¹ preset represents favorable low-glucose growth.", [sources.dh5a]], yxS: ["Literature-informed assumption", "The study reported about 0.38 g/g at low glucose and 0.19 ± 0.03 g/g at 100 g/L, below the 0.46 g/g preset.", [sources.dh5a]], overflow: ["Published measurement", "DH5α accumulated 9.5 ± 0.8 g/L acetate in the 100 g/L glucose batch.", [sources.dh5a]], recommendedProduct: ["App assumption", "No product is selected automatically; the cited DH5α process produced plasmid DNA.", [sources.dh5a]] },
      notes: ["DH5α is primarily a cloning/plasmid host. Glucose concentration, plasmid burden and osmolality strongly affect growth and yield."] },
    { id: "bacillus-subtilis", category: "Microbial fermentation", name: "Bacillus subtilis", values: [0.55, 0.08, 0.5, 0.025, 10, 37, 7, "Disabled", "No automatic change", "No automatic change", "No automatic change"], sources: [sources.bacillusEnergetics, sources.bacillusMaintenance],
      evidence: { muMax: ["Literature-informed assumption", "Published aerobic B. subtilis cultures span different rates by strain and medium; the cited work provides glucose-limited and excess-carbon physiology rather than direct support for 0.55 h⁻¹.", [sources.bacillusEnergetics]], maintenance: ["Literature-informed assumption", "Maintenance was measured in glucose-limited B. subtilis chemostats, but published values depend on strain and calculation basis and do not directly reproduce 0.025 g/g/h.", [sources.bacillusEnergetics, sources.bacillusMaintenance]], overflow: ["Literature-informed assumption", "B. subtilis can form acetate and other by-products under excess carbon; the simulator's E. coli-specific acetate module is intentionally disabled.", [sources.bacillusEnergetics]] },
      notes: ["The generic preset is not tied to a single B. subtilis lineage. Strain 168, industrial riboflavin producers and secretion hosts can have different physiology."] },
    { id: "corynebacterium", category: "Microbial fermentation", name: "Corynebacterium glutamicum", values: [0.4, 0.1, 0.52, 0.018, 8, 30, 7.1, "Disabled", "No automatic change", "No automatic change", "No automatic change"], sources: [sources.coryneChemostat, sources.coryneRich],
      evidence: { muMax: ["Published measurement", "Glucose-grown C. glutamicum reached μ = 0.40 ± 0.03 h⁻¹ in the cited study.", [sources.coryneChemostat]], yxS: ["Published measurement", "At D = 0.40 h⁻¹, the reported biomass/glucose yield was 0.52 ± 0.01 g/g.", [sources.coryneChemostat]], maintenance: ["Literature-informed assumption", "The reported maintenance was 0.44 ± 0.04 mmol glucose/g/h (about 0.079 g/g/h), so the lower preset remains a model assumption.", [sources.coryneChemostat]], qO2Max: ["Published measurement", "At D = 0.40 h⁻¹ the reported qO₂ was 8.15 ± 0.15 mmol/g/h, rounded to 8.", [sources.coryneChemostat]], optimalTemperature: ["Published condition", "The batch study controlled temperature at 30 °C.", [sources.coryneRich]], optimalPh: ["Literature-informed assumption", "Published glucose cultivations used pH 7.4 or nearby neutral setpoints; the preset 7.1 is a representative starting point.", [sources.coryneRich]] },
      notes: ["The close agreement for growth, yield and qO₂ applies to the cited wild type and glucose-limited conditions, not all production strains."] },
    { id: "pseudomonas", category: "Microbial fermentation", name: "Pseudomonas putida", values: [0.5, 0.05, 0.48, 0.025, 14, 30, 7, "Disabled", "No automatic change", "No automatic change", "No automatic change"], sources: [sources.putidaGlucose, sources.putidaMaintenance],
      evidence: { muMax: ["Literature-informed assumption", "KT2440 on glucose was reported at 0.55 ± 0.01 h⁻¹ and another study estimated 0.59 h⁻¹; the 0.50 preset is conservative.", [sources.putidaGlucose, sources.putidaMaintenance]], yxS: ["Published measurement", "KT2440 on glucose yielded 0.49 ± 0.02 g biomass/g substrate, matching the rounded preset closely.", [sources.putidaGlucose]], maintenance: ["Literature-informed assumption", "A published glucose maintenance coefficient is 0.037 g/g/h; the preset 0.025 g/g/h is lower and remains editable.", [sources.putidaMaintenance]], optimalTemperature: ["Published condition", "The KT2440 glucose studies used 30 °C.", [sources.putidaGlucose, sources.putidaMaintenance]], optimalPh: ["Published condition", "The glucose-limited bioreactor study used a neutral pH setpoint near 7.", [sources.putidaMaintenance]] },
      notes: ["The generic name in the interface is represented by strain KT2440 in the compiled literature.", "The qO₂ maximum is not directly supported by these publications."] },
    { id: "saccharomyces-cerevisiae", category: "Microbial fermentation", name: "Saccharomyces cerevisiae — aerobic production yeast", values: [0.4, 0.025, 0.49, 0.01, 2.7, 30, 5, "Disabled; ethanol not modelled", "Secreted protein", "Defined S. cerevisiae glucose medium", "Yeast glucose and nitrogen feed"], source: sources.yeast,
      evidence: { muMax: ["Literature-informed assumption", "Representative glucose-grown starting value; the cited study measured physiology across controlled growth rates."], yxS: ["Published measurement", "Cited respiratory cultures reported approximately 0.49 g biomass/g glucose."], qO2Max: ["Published measurement", "Cited aerobic glucose-limited culture reported qO₂ ≈ 2.7 mmol/g/h."], optimalTemperature: ["Published condition", "Cultures were grown at 30 °C."], recommendedProduct: ["App assumption", "A generic secreted-protein workflow is selected for convenience."], recommendedMedium: ["Literature-informed assumption", "Editable defined glucose medium consistent with aerobic yeast cultivation."], recommendedFeed: ["App assumption", "Generic glucose/nitrogen feed."] },
      notes: ["The simulator's acetate overflow module is not suitable for Crabtree ethanol overflow or diauxic growth."] },
    { id: "aspergillus-niger", category: "Microbial fermentation", name: "Aspergillus niger — submerged fungal culture", values: [0.22, 0.05, 0.56, 0.015, 4.1, 30, 4.5, "Disabled", "Secreted protein", "A. niger glucose mineral medium", "A. niger sugar and mineral feed"], source: sources.aspergillus,
      evidence: { muMax: ["Published measurement", "Rounded from reported glucose-batch μmax of 0.221 h⁻¹."], yxS: ["Derived conversion", "Reported 0.68 C-mol biomass/C-mol glucose converted to approximately 0.56 g/g."], qO2Max: ["Derived conversion", "Reported 0.101 mol O₂/C-mol biomass/h converted to approximately 4.1 mmol/g/h."], optimalTemperature: ["Published condition", "Batch cultivations were performed at 30 °C."], recommendedProduct: ["App assumption", "A generic secreted-protein workflow is selected for convenience."], recommendedMedium: ["Literature-informed assumption", "Editable glucose mineral recipe; not a verbatim reproduction of the paper."], recommendedFeed: ["App assumption", "Generic sugar/mineral feed."] },
      notes: ["Pellet morphology, broth rheology and morphology-dependent oxygen transfer are outside the current unstructured model.", "The cited NW185 experiments were performed at pH 2.5; the preset pH 4.5 is an editable application assumption, not a reported optimum."] },
    { id: "custom", category: "Microbial fermentation", name: "Custom organism / cell line", values: [0.5, 0.05, 0.5, 0.02, 10, 37, 7, "Disabled", "No automatic change", "No automatic change", "No automatic change"], notes: ["Replace every relevant value with organism-, strain- and process-specific measurements."] }
  ];

  // Keep biological source observations separate from how the repaired engine uses them.
  for (const record of raw) {
    if (record.values[8] === "No automatic change") {
      record.values.splice(8, 3, "Recombinant protein", "Defined high-cell-density E. coli medium", "Concentrated glucose plus salts");
      for (const key of ["recommendedProduct", "recommendedMedium", "recommendedFeed"])
        record.evidence = { ...record.evidence, [key]: ["App assumption", "Generic microbial fallback in complete-preset mode; biology-only mode retains your existing settings. Calibrate the formulation and product to the organism."] };
    }
    const observed = ["cho-mab", "hek293-recombinant", "corynebacterium"].includes(record.id);
    record.notes = [...(record.notes || []),
      observed ? "Repaired-engine adaptation: yield is treated as observed, including maintenance. A Pirt-type correction at the preset maximum growth rate supplies the true growth yield; this is not a refit of the publication."
        : "Repaired-engine adaptation: the entered yield is used as a maintenance-excluding growth-yield assumption. Published batch/observed yields are not automatically interchangeable; confirm the yield definition and calibration in the app.",
      "Repaired-engine adaptation: the qO₂ value caps respiratory capacity. Published uptake at one condition does not establish a physiological maximum. Carbon/electron composition and product-substrate allocation are generic screening assumptions."];
    if (record.id === "cho-mab") record.notes.push("The reported 0.58 g/L glucose threshold is now exposed in the app. Applying it to instantaneous substrate is a model adaptation, not an exact reproduction of the source's threshold fit.");
  }

  const records = raw.map((record) => ({
    ...record,
    sources: record.sources || (record.source ? [record.source] : []),
    parameters: definitions.map(([key, label, unit], index) => {
      const [status, basis, providedReferences] = record.evidence?.[key] || ["App assumption", "Editable simulator starting value; no preset-specific publication is recorded for this field."];
      const references = providedReferences || (record.source && status !== "App assumption" && status !== "Model selection" ? [record.source] : []);
      const rawValue = record.values[index];
      return {
        key,
        label,
        rawValue,
        value: `${rawValue}${unit ? ` ${unit}` : ""}`,
        unit,
        status,
        basis,
        references,
        explanation: status === "Published measurement" || status === "Published condition"
          ? `The value is transcribed from the recorded publication for the stated cell line and culture condition. It is not a universal species constant.`
          : status === "Derived conversion"
            ? `The publication reports a related quantity. The simulator value applies the conversion described above and therefore inherits its assumptions.`
            : `This is a transparent modelling choice or literature-informed starting point. Calibrate it before interpreting a real process.`
      };
    }),
    overallStatus: (record.source || record.sources?.length) ? "Published basis with conversions and assumptions" : "App assumptions — publication audit pending"
  }));

  window.FermentationBiologyRecords = Object.freeze({ definitions, records });
})();
