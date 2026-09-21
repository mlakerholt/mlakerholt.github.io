(() => {
  "use strict";

  const ref = (title, url) => ({ title, url });
  const p = (name, representative, range, confidence, basis, references) => ({ name, representative, range, confidence, basis, references });

  const profiles = [
    {
      id: "cho", name: "Chinese hamster ovary (CHO) cells", category: "Animal cell culture",
      scope: "Suspension CHO production cultures, including recombinant clones and several media/process formats.",
      sources: [
        ref("Kinetics of naive and infliximab-producer CHO cells", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4960177/"),
        ref("Differential effect of temperature and growth rate on CHO cells", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3974816/"),
        ref("Process intensification using non-perfusion CHO seed cultures", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6816350/"),
        ref("Hyperosmolarity triggers the Warburg effect in CHO cells", "https://pmc.ncbi.nlm.nih.gov/articles/PMC8226498/")
      ],
      parameters: [
        p("μmax", "0.03 h⁻¹", "0.011–0.050 h⁻¹", "Moderate", "Representative of productive suspension culture; reported rates change with clone, medium, osmolality, temperature and culture mode.", [0,2,3]),
        p("Glucose KS", "0.66 g/L", "0.286–1.023 g/L", "Low", "Published Monod fits exist, but the numerical range comes from one paired naive/recombinant study and should not be treated as a species constant.", [0]),
        p("YX/S", "Calibrate", "No comparable multi-study dry-mass range", "Low", "CHO studies usually report cells per glucose or cell-specific uptake. Converting to g dry biomass/g glucose requires an assumed cell dry mass.", [0,1]),
        p("Maintenance", "Calibrate", "Not pooled", "Low", "Maintenance is entangled with lactate formation, viable-cell death and changing cell size in the selected studies.", [1,3]),
        p("qO₂", "Calibrate", "Not pooled", "Low", "Use clone- and process-specific OUR data; the available studies do not provide a directly comparable maximum on a common dry-mass basis.", [1]),
        p("Temperature", "37 °C", "33–37 °C", "High", "37 °C supports growth; 33 °C temperature shifts are frequently evaluated for productivity and quality.", [0,1]),
        p("pH", "7.1", "Approximately 6.9–7.2", "Moderate", "A neutral setpoint is representative, but pH interacts with pCO₂, osmolality and lactate metabolism.", [1,3])
      ],
      recommendation: "Use 0.03 h⁻¹, 37 °C and pH 7.1 only as a starting envelope. Refit glucose, oxygen and yield terms for the selected recombinant clone."
    },
    {
      id: "hybridoma", name: "Mouse/human hybridoma cells", category: "Animal cell culture",
      scope: "Antibody-producing hybridomas in batch, fed-batch and stirred culture; not a single lineage.",
      sources: [
        ref("Kinetics and stoichiometry of hybridoma 55-6 batch cultures", "https://pmc.ncbi.nlm.nih.gov/articles/PMC2267508/"),
        ref("Effect of feed rate in murine hybridoma fed-batch culture", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3449896/"),
        ref("Effects of passage number on hybridoma growth and productivity", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4846632/"),
        ref("Human B-cell hybridoma technology", "https://pmc.ncbi.nlm.nih.gov/articles/PMC1383494/")
      ],
      parameters: [
        p("μmax", "0.04 h⁻¹", "Approximately 0.030–0.055 h⁻¹", "Moderate", "The upper bound is the 55-6 Monod fit; a 23.4 h doubling time in a human hybridoma corresponds to about 0.030 h⁻¹.", [0,3]),
        p("Glucose KS", "0.023 g/L", "0.13 mM (single-study fit)", "Low", "Converted from the 55-6 glucose KS using 180.16 g/mol. Other hybridomas require a new fit.", [0]),
        p("YX/S", "Calibrate", "Passage- and line-dependent", "Low", "Cell/glucose yields change with lineage and passage and are not comparable on a dry-mass basis without conversion assumptions.", [0,2]),
        p("Maintenance", "Calibrate", "Not pooled", "Low", "Near-zero-growth fed-batch studies show strong non-growth demand, but do not yield one transferable glucose-maintenance constant.", [1]),
        p("qO₂", "Calibrate", "Not pooled", "Low", "Hybridoma oxygen uptake changes with cell density, pCO₂ and culture format.", [1]),
        p("Temperature", "37 °C", "37 °C in selected studies", "Moderate", "The compiled mammalian hybridoma studies use conventional 37 °C culture.", [0,1,3]),
        p("pH", "7.2", "Line- and CO₂-dependent", "Low", "Use bicarbonate/CO₂ and osmolality measurements to establish a line-specific setpoint.", [1])
      ],
      recommendation: "Use μmax 0.04 h⁻¹ as a generalized starting point; retain explicit glucose/glutamine co-limitation and recalibrate after passage or clone changes."
    },
    {
      id: "hek293", name: "HEK293-derived production cells", category: "Animal cell culture",
      scope: "Suspension-adapted HEK293/HEK293F/HEK293T systems used for recombinant proteins and viral vectors.",
      sources: [
        ref("Multi-omics analysis of recombinant protein production in HEK293", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3427347/"),
        ref("Serum-free adaptation and metabolic profiles of HEK293 cells", "https://pmc.ncbi.nlm.nih.gov/articles/PMC9485887/"),
        ref("Stable recombinant erythropoietin production in HEK293", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6856173/"),
        ref("Lentiviral-vector production with suspension HEK293T", "https://pmc.ncbi.nlm.nih.gov/articles/PMC8806440/")
      ],
      parameters: [
        p("μmax", "0.02 h⁻¹", "0.013–0.028 h⁻¹", "Moderate", "Stable producer and HEK293F studies span this range; adaptation and expression burden materially change growth.", [0,2]),
        p("Glucose KS", "Calibrate", "Not pooled", "Low", "The selected studies report uptake and depletion rather than comparable Monod constants.", [0,1,2]),
        p("YX/S", "Calibrate", "No comparable multi-study dry-mass range", "Low", "Suspension and adherent systems differ, and most studies report cell-specific rather than dry-mass yield.", [0,1]),
        p("Maintenance", "Calibrate", "Not pooled", "Low", "No transferable maintenance coefficient was identified across the selected HEK293 systems.", [0,2]),
        p("qO₂", "0.33 mmol/gDW/h", "Single directly comparable study", "Low", "Useful as an order-of-magnitude anchor, not a generalized maximum.", [0]),
        p("Temperature", "37 °C", "37 °C", "High", "The compiled suspension bioreactor studies use 37 °C.", [0,2,3]),
        p("pH", "7.0", "7.0–7.1", "Moderate", "Reported stirred-culture setpoints cluster around neutral pH.", [0,3])
      ],
      recommendation: "Use μmax 0.02 h⁻¹, 37 °C and pH 7.0 as a platform-level start, then refit for the adapted host and expression system."
    },
    {
      id: "escherichia-coli", name: "Escherichia coli", category: "Microbial fermentation",
      scope: "Aerobic glucose cultures of K-12, B/BL21 and cloning/production derivatives.",
      sources: [
        ref("Comparative analysis of industrial E. coli K-12 and B strains", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3738542/"),
        ref("MG1655 iclR/arcA physiology and fluxes", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3094197/"),
        ref("High-dissolved-oxygen physiology of MG1655", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3605374/"),
        ref("High-density plasmid production in DH5α", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3503842/"),
        ref("Industrial-strain stress comparison", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4178669/")
      ],
      parameters: [
        p("μmax", "0.60 h⁻¹", "0.39–0.79 h⁻¹", "Moderate", "A useful cross-strain center for aerobic glucose growth; recombinant burden, osmolality and complex nutrients widen the range.", [0,1,3]),
        p("Glucose KS", "0.02 g/L", "Approximately 0.007–0.05 g/L", "Low", "Affinity estimates are highly experiment- and strain-dependent; do not transfer a W3110 chemostat fit uncritically.", [1]),
        p("YX/S", "0.46 g/g", "0.30–0.52 g/g", "Moderate", "Selected aerobic studies span overflow-producing batch and glucose-limited conditions.", [0,1,2,3]),
        p("Maintenance", "0.02 g/g/h", "Calibrate by strain", "Low", "A generalized value is suitable only for screening; maintenance and growth-associated energy terms depend on the model basis.", [1]),
        p("qO₂", "10 mmol/g/h", "Approximately 8–13 mmol/g/h", "Moderate", "The range brackets measured aerobic MG1655 physiology and common high-rate model envelopes.", [1,2]),
        p("Temperature", "37 °C", "30–37 °C", "High", "37 °C is the dominant production-study setpoint; 30 °C is common after induction or for burden reduction.", [0,1,3]),
        p("pH", "7.0", "Approximately 6.8–7.2", "High", "Neutral controlled pH is shared by the selected aerobic bioreactor studies.", [0,1,2])
      ],
      recommendation: "Use the generalized profile only for early screening. Select BL21, MG1655, W3110 or DH5α when acetate handling, recombinant burden or plasmid production matters."
    },
    {
      id: "bacillus-subtilis", name: "Bacillus subtilis", category: "Microbial fermentation",
      scope: "Aerobic glucose cultures spanning strain 168 and industrial secretion/riboflavin backgrounds.",
      sources: [
        ref("B. subtilis metabolism and energetics in chemostat culture", "https://pmc.ncbi.nlm.nih.gov/articles/PMC95580/"),
        ref("Maintenance metabolism and carbon fluxes in Bacillus species", "https://pmc.ncbi.nlm.nih.gov/articles/PMC2442585/"),
        ref("Time-resolved batch-culture responses of B. subtilis", "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0027160")
      ],
      parameters: [
        p("μmax", "0.45 h⁻¹", "Approximately 0.4–0.6 h⁻¹", "Low", "Strain 168, industrial producers and rich/minimal media are not directly interchangeable.", [0,2]),
        p("Glucose KS", "Calibrate", "Not pooled", "Low", "No robust cross-strain Monod range was identified in the selected studies.", [0,1]),
        p("YX/S", "0.55 g/g", "Approximately 0.5–0.6 g/g", "Low", "Representative of aerobic biomass formation, but secretion and overflow can reduce the observed yield.", [0,1]),
        p("Maintenance", "Calibrate", "Strongly method-dependent", "Low", "Published Bacillus maintenance estimates depend on the Pirt fit, sporulation state and producer background.", [0,1]),
        p("qO₂", "Calibrate", "Not pooled", "Low", "Use off-gas data from the chosen strain and secretion process.", [0]),
        p("Temperature", "37 °C", "Approximately 30–37 °C", "Moderate", "37 °C is common for strain 168; industrial processes may use lower temperatures.", [2]),
        p("pH", "7.0", "Near-neutral", "Moderate", "A neutral starting setpoint is appropriate, but organic-acid formation can shift the optimum.", [0,2])
      ],
      recommendation: "Treat this as a species envelope. For a secretion host or riboflavin producer, re-estimate maintenance, overflow and oxygen demand from that exact lineage."
    },
    {
      id: "corynebacterium-glutamicum", name: "Corynebacterium glutamicum", category: "Microbial fermentation",
      scope: "Aerobic glucose-grown wild-type and nutrient-enriched production-relevant cultures.",
      sources: [
        ref("Growth modulon under glucose-limited chemostat conditions", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7594717/"),
        ref("Response to increasingly nutrient-rich growth conditions", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6123352/"),
        ref("Aerobic succinate production on glucose or glycerol", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3917461/")
      ],
      parameters: [
        p("μmax", "0.40 h⁻¹", "0.31–0.67 h⁻¹", "Moderate", "Minimal glucose, enriched medium and engineered producers span the reported range.", [0,1,2]),
        p("Glucose KS", "Calibrate", "Not pooled", "Low", "The selected studies do not provide comparable strain-level Monod constants.", [0,1]),
        p("YX/S", "0.50 g/g", "0.47–0.52 g/g in glucose-limited cultures", "High", "Chemostat yield is consistent across the reported higher dilution rates.", [0]),
        p("Maintenance", "0.079 g/g/h", "About 0.44 mmol glucose/g/h", "Moderate", "Converted from the reported Herbert-Pirt maintenance term; product strains may differ.", [0]),
        p("qO₂", "8 mmol/g/h", "5.36–8.15 mmol/g/h", "High", "Measured across D = 0.20–0.40 h⁻¹ in glucose-limited chemostats.", [0]),
        p("Temperature", "30 °C", "30 °C", "High", "The compiled aerobic bioreactor studies use 30 °C.", [1,2]),
        p("pH", "7.1", "7.0–7.4", "High", "Reported controlled cultivations fall within this near-neutral interval.", [1,2])
      ],
      recommendation: "The strongest generalized microbial profile in this set: 0.40 h⁻¹, YX/S 0.50 g/g and qO₂ 8 mmol/g/h are well anchored, but maintenance should be updated in the live preset."
    },
    {
      id: "pseudomonas-putida", name: "Pseudomonas putida", category: "Microbial fermentation",
      scope: "Primarily glucose-grown strain KT2440; other P. putida lineages are not assumed equivalent.",
      sources: [
        ref("Cyclic glucose metabolism in P. putida KT2440", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4646247/"),
        ref("In vivo and in silico parameters of P. putida KT2440", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3829105/"),
        ref("Response of P. putida KT2440 to increased NADH and ATP demand", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3187158/")
      ],
      parameters: [
        p("μmax", "0.59 h⁻¹", "0.55–0.74 h⁻¹", "High", "Independent KT2440 glucose studies bracket this range.", [0,1,2]),
        p("Glucose KS", "Calibrate", "Not pooled", "Low", "Periplasmic oxidation complicates a single Monod interpretation.", [0,1]),
        p("YX/S", "0.45 g/g", "0.38–0.56 g/g", "Moderate", "Range reflects endpoint definition, oxygenation and energetic uncoupling.", [0,1,2]),
        p("Maintenance", "0.037 g/g/h", "Single fitted cross-check", "Moderate", "Reported from carbon-limited physiology and model reconciliation.", [1]),
        p("qO₂", "Calibrate", "Not pooled", "Low", "The selected datasets do not establish a transferable maximum oxygen-uptake ceiling.", [1,2]),
        p("Temperature", "30 °C", "30 °C", "High", "Shared cultivation temperature across the KT2440 studies.", [0,1,2]),
        p("pH", "7.0", "Near-neutral", "Moderate", "Neutral mineral-medium cultivation is representative for KT2440.", [0,1])
      ],
      recommendation: "Use KT2440 as the explicit reference strain. A generalized P. putida label should not conceal lineage or engineered-genome differences."
    },
    {
      id: "saccharomyces-cerevisiae", name: "Saccharomyces cerevisiae", category: "Microbial fermentation",
      scope: "Aerobic glucose cultures spanning respiratory chemostats and respiro-fermentative batch physiology.",
      sources: [
        ref("Effect of specific growth rate on fermentative capacity of baker's yeast", "https://pmc.ncbi.nlm.nih.gov/articles/PMC106631/"),
        ref("Oxygen dependence of S. cerevisiae CEN.PK113-1A", "https://pmc.ncbi.nlm.nih.gov/articles/PMC2507709/"),
        ref("Central metabolism under different glucose-repression conditions", "https://pmc.ncbi.nlm.nih.gov/articles/PMC95019/"),
        ref("Adaptation to fermentative metabolism", "https://pmc.ncbi.nlm.nih.gov/articles/PMC2547023/")
      ],
      parameters: [
        p("μmax", "0.38 h⁻¹", "0.35–0.41 h⁻¹", "High", "Independent glucose studies cluster around this aerobic maximum.", [0,2]),
        p("Glucose KS", "Calibrate", "Not pooled", "Low", "Residual-glucose affinity is reactor-, strain- and analytical-method dependent.", [0,1]),
        p("YX/S", "0.50 g/g respiratory", "0.46–0.52 g/g respiratory; 0.07–0.13 g/g fermentative", "High", "A single yield is invalid across the Crabtree transition; the respiratory value is recommended only below overflow.", [0,2,3]),
        p("Maintenance", "Calibrate", "Aerobic/anaerobic values differ", "Low", "Maintenance cannot be pooled across respiratory and fermentative regimes.", [1,3]),
        p("qO₂", "2.7 mmol/g/h", "2.7–7.4 mmol/g/h", "High", "The lower value describes fully respiratory D = 0.1 h⁻¹ culture; maximum respiratory capacity rises with growth rate and nitrogen status.", [0,1,3]),
        p("Temperature", "30 °C", "30 °C", "High", "All selected quantitative physiology studies used 30 °C.", [0,1,2,3]),
        p("pH", "5.0", "Approximately 5.0", "High", "Controlled chemostat studies used pH 5.0.", [1,3])
      ],
      recommendation: "Use separate respiratory and respiro-fermentative modes. The current acetate overflow formulation should not be reused for ethanol overflow."
    },
    {
      id: "aspergillus-niger", name: "Aspergillus niger", category: "Microbial fermentation",
      scope: "Submerged glucose/mineral cultures; morphology, viscosity and product strain are major modifiers.",
      sources: [
        ref("Stoichiometry and kinetics of substrate uptake in A. niger", "https://pmc.ncbi.nlm.nih.gov/articles/PMC5773628/"),
        ref("Quantitative intracellular metabolomics of A. niger chemostats", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4559092/"),
        ref("Secretory-pathway response of A. niger on different sugars", "https://pmc.ncbi.nlm.nih.gov/articles/PMC2639373/")
      ],
      parameters: [
        p("μmax", "0.23 h⁻¹", "0.205–0.264 h⁻¹", "High", "Batch and high-dilution chemostat observations support this glucose-growth envelope.", [0,1]),
        p("Glucose KS", "Calibrate", "Not pooled", "Low", "Residual substrate and morphology make one generalized half-saturation constant unreliable.", [0,1]),
        p("YX/S", "0.56 g/g", "Substrate- and morphology-dependent", "Moderate", "The representative value derives from reconciled glucose carbon yield; other sugars and morphologies differ.", [0,2]),
        p("Maintenance", "Approximately 0.09 g/g/h", "About 0.5 mmol glucose/g/h in a cited chemostat comparison", "Low", "A useful order-of-magnitude check, not a universal fungal maintenance constant.", [1]),
        p("qO₂", "4.1 mmol/g/h", "Growth-rate-dependent", "Moderate", "Converted from reported oxygen per C-mol biomass; chemostat oxygen demand varies with dilution and substrate.", [0,1,2]),
        p("Temperature", "30 °C", "30 °C", "High", "The selected submerged quantitative studies used 30 °C.", [0,1,2]),
        p("pH", "3.0", "2.5–4.5", "Moderate", "Low pH is common in quantitative glucose studies; the best value depends on product, morphology and contamination strategy.", [0,1,2])
      ],
      recommendation: "Use μmax 0.23 h⁻¹ and 30 °C as generalized anchors. Refit pH, oxygen and yield after establishing pellet morphology and the production strain."
    }
  ];

  window.FermentationGeneralizedBiology = Object.freeze({ profiles });
})();
