# Culture failure and viability: research basis

Research date: 17 September 2026. Implementation inspected: simulation-core.js, build 2026-09-17.7.

This is a focused literature review and proposed model design, not a validated set of lethal thresholds. No simulator equations, presets or saved scenarios were changed for this review. Experimental observations below are condition-specific; proposed equations are explicitly design recommendations, not fitted literature models.

## Main conclusion

Add a viable-biomass/dead-biomass model before adding failure alarms. Separate reversible growth inhibition, accumulated injury, irreversible death, and subsequent lysis. A process can also fail its productivity target without killing its culture.

The four requested mechanisms are relevant, but there is no defensible universal glucose concentration, acetate concentration, DO percentage or RPM at which every preset should die. Dose, exposure duration, strain/clone, medium, adaptation and interacting stresses matter. Generalized species profiles should describe uncertain response ranges, not claim measured clone-specific lethal limits.

## 1. What the current engine does

Source anchors: [reaction model](../simulation-core.js), function `solveReactions`; [state integration](../simulation-core.js), function `createSimulation`.

| Mechanism | Current implementation | Missing behavior |
| --- | --- | --- |
| High glucose | Monod-type substrate factor increases toward saturation; feed may indirectly generate acetate or increase oxygen demand. The pool is glucose-equivalent substrate, not necessarily analytical glucose. | Direct substrate inhibition, osmolality, overfeeding-related injury and death. |
| Acetate | Growth includes `1 / (1 + A/8)`, with A in g/L. This gives half the acetate-dependent growth factor at 8 g/L for every organism. Acetate is produced/reused when overflow is enabled. | Strain-specific response, acid speciation, exposure history and irreversible toxicity. The 8 g/L value is not a death threshold. |
| Low oxygen | Universal factor `C/(0.006+C)`, with C in mmol/L, restricts growth and maintenance; available oxygen constrains reactions. | Fermentative alternatives, species-specific survival, maintenance-energy deficits and death. At zero oxygen and substrate, cells can simply remain in the biomass pool. |
| Mechanical stress | Power density and tip speed are calculated for equipment/transfer purposes. | No shear-to-injury/death coupling, bubble-damage model, or fungal morphology state. |
| pH / temperature | Smooth factors reduce potential growth away from the optimum. | Lethal exposure and persistent damage after the environment is restored. |
| Excess oxygen | Oxygen availability increases the growth factor toward saturation. | Hyperoxic injury; more DO has no adverse biological effect in the present model. |

There is no viable/dead cell split or biological biomass-death sink. Biomass concentration can decrease through dilution and biomass can leave through broth outflow, but neither is cell death. `MD` already means degraded product in the engine and must not be repurposed for dead cells.

## 2. Glucose toxicity: separate overfeeding from osmotic stress

Recommended name: **excess-substrate / osmotic stress**, rather than a universal “glucose poisoning” threshold.

Three effects need separate treatment:

1. Excess substrate uptake and metabolic overflow.
2. Osmotic stress from the complete broth composition, including feed salts and accumulated titrant counterions.
3. Glucose-specific metabolic stress, where supported for the selected cell line.

### Evidence

- An experimental comparison reported E. coli growth on 100 g/L glucose agar but not 200 g/L; the liquid-culture result differed even at 100 g/L. The endpoint was growth/metabolism, not a calibrated time-to-death curve. This is evidence against transferring a single glucose cutoff between culture conditions. [2022 primary study, glucose-tolerance comparison](https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2022.977024/full).
- In CHO DP-12 and a FUCCI derivative, treatments spanned 300, 370, 460 and 530 mOsm/kg. Severe hyperosmolality strongly inhibited division, yet many cells remained viable: at 530 mOsm/kg after four days, reported viabilities ranged approximately 77–93% across lines and feed treatments. Arrest, mass accumulation and death were distinct responses. [Romanova et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9179406/).
- A yeast study compared batch fermentation of grape juice containing 343 g/L sugar with fed-batch operation maintaining 50 g/L sugar. Fed-batch improved viability and reduced stress-associated by-products. These are mixed-sugar fermentation conditions, not a universal lethal glucose concentration. [Frohman and Mira de Orduña, 2013](https://www.sciencedirect.com/science/article/pii/S0963996913003098).

### Model implications

Use the concentration actually present in the broth, not the feed-stock concentration. A concentrated glucose feed does not expose the whole culture to that concentration after mixing. The app's glucose-equivalent carbon total also cannot be directly converted into glucose molarity or osmolality when glycerol or complex nutrients are present.

For a first implementation, allow a measured initial osmolality and a documented feed/titrant osmotic-load estimate. Full chemistry would require component identities, molecular weights, ionic dissociation and nonideality; do not silently equate g/L carbon with mOsm/kg. Local feed-zone shocks require a mixing/compartment model and are outside the present well-mixed engine.

A substrate-inhibition expression such as `S/(Ks + S + S²/Ki)` could be fitted to growth data, but it describes inhibition, not death. Adding it to an osmotic penalty without checking overlap would double-count stress. A mortality function needs separate viable-cell measurements.

## 3. Acetate toxicity: pH and strain are essential

Acetate-related stress should include total acetate and the undissociated acetic-acid fraction. A useful first speciation estimate is:

`HAc = A_total / (1 + 10^(pH − pKa))`

Use consistent concentration units and approximately pKa 4.75–4.76 as a dilute-solution reference, with its temperature/ionic-strength limitations documented. This is not a complete intracellular toxicity model: transport, intracellular anion accumulation and adaptation also matter.

### Evidence

- BL21(DE3) still grew in complex BYT-glycerol medium with 300 mM sodium acetate: reported specific growth rates were 0.41 ± 0.05 h⁻¹ at pH 6.5 and 0.70 ± 0.10 h⁻¹ at pH 7.5. The study estimated undissociated acid at 5.24 versus 0.53 mM. Its MTT assay measures reducing activity; it must not be converted directly into a dead-cell percentage. This supports pH-dependent inhibition, not “300 mM always kills E. coli.” [Wang et al., 2014](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0112777).
- Direct yeast death experiments exposed S. cerevisiae to 20–200 mM acetic acid for 200 minutes at pH 3.0. Different concentration bands produced apoptosis-like or necrotic features. The pH and exposure time are part of the evidence and cannot be discarded. [Ludovico et al., 2001](https://pubmed.ncbi.nlm.nih.gov/11535781/).

### Model implications

Replace the universal 8 g/L factor with a documented organism/strain-dependent inhibition response. Add mortality only from an appropriate survival dataset, not from reduced OD or productivity. Keep the ordinary pH penalty distinct from additional acetate stress and fit their interaction rather than multiplying arbitrary penalties.

Keep acetate reuse: acetate is not only a toxic pool. For CHO/hybridoma, a bacterial acetate-overflow model should not substitute for lactate and ammonia metabolism. Species-specific by-product modules are needed before treating all presets alike.

## 4. Oxygen deprivation: metabolic failure is not automatically death

Recommended name: **oxygen deprivation / energy deficit**. A DO-control error and a biological lethal threshold are different quantities. Falling below a 30% controller setpoint does not establish that cells are dying.

### Evidence

- E. coli W3110 fed-batch experiments explicitly examined oxygen-limited conditions and anaerobic metabolite formation. E. coli can switch to fermentative metabolism or alternative respiration where suitable electron acceptors are available; a generic immediate death rule at zero DO would be wrong. [2008 primary bioprocess study](https://pmc.ncbi.nlm.nih.gov/articles/PMC2526063/).
- Even the strongly oxygen-dependent P. putida KT2440 tolerated repeated approximately 2.6-minute passages through zones depleted of oxygen and carbon without a significant deterioration in overall growth performance in the tested system. Its energy state changed sharply during each passage. Short excursions must not be equated with prolonged anoxia. [Demling et al., 2021](https://onlinelibrary.wiley.com/doi/full/10.1002/bit.27938).
- In an anaerobic S. cerevisiae V5 experiment without supplied sterols/fatty acids, growth became limited while viability remained 92 ± 3% at 30 h. Yeast therefore needs a fermentative/survival response, with nutritional conditions retained, rather than an aerobic-only lethal rule. [Primary yeast oxygen/nutrition study](https://pmc.ncbi.nlm.nih.gov/articles/PMC152411/).
- In a hybridoma bioreactor study, oxygen supply stopped from 48.25 to 56 h alongside pre-existing substrate limitation. Reoxygenation did not immediately reverse the subsequent loss of viable cells. This is useful evidence for accumulated/committed damage, but it is a combined-stress case, not a clean oxygen-only death-rate calibration. [Guez et al., 2023](https://www.nature.com/articles/s41598-023-48733-x).

### Model implications

Base exposure on actual dissolved oxygen concentration/partial pressure and duration, not inlet oxygen fraction, the DO setpoint, or the displayed controller error. Store the measurement reference used by each source; gas-phase percent O₂ is not percent air saturation.

Use organism-specific aerobic/fermentative capabilities. For E. coli and S. cerevisiae, adding a death rule on top of the current obligately aerobic reaction model would misidentify survivable metabolic transitions as asphyxiation. A more complete anaerobic branch also requires different biomass yields and by-product/electron accounting.

For A. niger, a future pellet model should distinguish bulk DO from intrapellet oxygen availability. Do not invent a pellet-core death threshold from the well-mixed bulk probe reading.

## 5. High shear: model local stress and exposure, not an RPM limit

### Evidence

- Controlled-device tests found viability loss around 1,250 Pa for E. coli and between 1,292 and 2,770 Pa for S. cerevisiae; repeated passages and exposure time affected loss. E. coli disruption occurred above 1,810 Pa in that apparatus. These are device-specific stress observations, not transferable stirred-tank thresholds or recommended operating values. [Lange, Taillandier and Riba, 2001](https://scijournals.onlinelibrary.wiley.com/doi/10.1002/jctb.401).
- CHO experiments separating bubble-surface rupture from bulk cell–bubble interactions found limited damage under some 600-rpm conditions when the free surface was removed. This demonstrates why agitation speed alone cannot specify a universal lethal shear limit. [Sparging/agitation injury experiment, 1996](https://pubmed.ncbi.nlm.nih.gov/18629792/).
- CHO continuous-culture work found different responses to the same agitation/power levels depending on cultivation history and nutrient availability; death observed after an agitation increase was confounded by glutamine limitation. [CHO growth/death kinetics, 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3397688/).
- A. niger studies directly measured pellet fragmentation under different hydrodynamic conditions. Fragmentation changed enzyme production, and some products were favored by greater fragmentation. Pellet breakup is not automatically complete loss of viable fungal biomass. [Buffo et al., 2020](https://journals.sagepub.com/doi/pdf/10.1089/ind.2020.29199.mmb), [pellet fragmentation and enzyme production, 2020](https://www.sciencedirect.com/science/article/pii/S0141022920300806).

### Model implications

The present reactor geometry, impeller size/count and power number are useful starting inputs. A possible engineering proxy is mean specific dissipation `epsilon_mean = Pg/(rho V)` in W/kg, with V in m³. Local dissipation needs an explicit geometry-dependent multiplier or CFD/experimental calibration. Under local-isotropy assumptions, `tau ~ rho sqrt(nu epsilon_local)` and `eta = (nu³/epsilon_local)^(1/4)` can characterize stress and eddy scales. These estimates are not interchangeable with laminar-device thresholds.

A credible shear module also needs exposure/circulation time, viscosity/rheology, cell or aggregate size, and separate bubble/sparging damage where applicable. Shear-protectant concentration and effectiveness are especially relevant to animal-cell presets. Do not infer an E. coli death rate simply because a dual-Rushton system exceeds an animal-cell RPM setting.

For fungi, add morphology/fragmentation before coupling it to a separately validated viability-loss response. Reduced pellet size may improve internal mass transfer even when it changes product formation.

## 6. Additional modes worth including

### Hyperoxia / oxidative stress — high priority with fixed pure-O₂ supply

CHO bioreactor experiments over 20–175% DO air saturation found altered redox/mitochondrial behavior and antibody-production metabolism with increasing oxygen. Another mammalian-cell experiment reported DNA damage during exposure to 200–476% air saturation. These support an upper-oxygen stress response, not a universal lethal cutoff at 100% DO. [CHO oxidative-stress study, 2018](https://www.sciencedirect.com/science/article/pii/S1369703X18300408), [hyperoxia/DNA-damage study, 1993](https://www.sciencedirect.com/science/article/pii/089158499390023N).

The new fixed 100% inlet-gas setting can produce DO well above 100% air saturation. Hyperoxia should therefore be considered alongside deprivation. This review does not change the requested gas default.

### Starvation / inability to meet maintenance — high priority

E. coli carbon-starvation experiments show that death rate depends on prior growth and maintenance requirements; slower previous growth supported longer survival. An empty glucose pool should not cause instantaneous death, but it also should not preserve every cell forever. [Biselli, Schink and Gerland, 2020](https://pubmed.ncbi.nlm.nih.gov/32500952/).

### Further candidates — not quantitatively parameterized in this review

- Lethal pH and temperature excursions, separate from reversible inhibition.
- Lactate/ammonia and other nutrient limitations for animal cells; ethanol/product toxicity for yeast.
- Dissolved CO₂ accumulation, which is not represented by the current total CO₂-production counter.
- Contamination, phage events and loss of production phenotype: separate biological populations/events, not generic death multipliers.
- Gas/power/feed/pH-control equipment failures as causes of changing environmental conditions; mechanical vessel-limit warnings remain distinct from biological mortality.

These need their own matching sources and datasets before numeric defaults are assigned. The present search is strongest for E. coli, CHO/hybridoma, yeast and A. niger; it does not establish lethal parameters for HEK293, B. subtilis or C. glutamicum.

## 7. Recommended mathematical structure — proposal, not yet fitted

Use inventories to preserve the existing volume and mass accounting:

`dMv/dt = (mu_total − kd) Mv − Fout Mv/V`

`dMdead/dt = kd Mv − klysis Mdead − Fout Mdead/V`

`dMlysate/dt = klysis Mdead − Fout Mlysate/V`

Here Mv is viable biomass, Mdead is retained nonviable biomass, and Mlysate is an explicitly tracked nonliving organic pool. `mu_total` includes every supported biomass-producing route. This simplified lysis step transfers mass rather than destroying it; any later reuse, mineralization or product release needs its own stoichiometry.

For a constant death hazard over a split substep, transfer `Mv × (1 − exp(−kd Δt))` from viable to dead biomass. This is nonnegative and bounded. A death-rate sum across mechanisms is only a starting assumption: correlated glucose, acetate, pH and oxygen effects require checks for double counting and interaction terms.

A minimal injury memory could take the form `dDi/dt = stress_i − recovery_i × Di`, with mortality depending on current exposure and Di. Fit injury/recovery and death separately where time-series and recovery experiments support identification. A dedicated irreversibly committed/dying state may be necessary for delayed animal-cell death. No numerical coefficients for these equations are established by this review.

Implementation requirements:

1. Growth, maintenance, OUR and new product synthesis depend on viable biomass, not retained dead DCW.
2. Dead biomass remains in the solids accounting until lysis or removal; OD/DCW must not be silently presented as viable-cell density.
3. Report viable biomass fraction separately from experimentally measured cell-count viability unless a justified cell-mass/count conversion is available.
4. Integrate death consistently with the resource solve and verify step-size convergence; loss of viable cells must feed back into next-step oxygen demand and control action.
5. Do not reset injury merely because DO or pH briefly recovers. Dead cells cannot become viable again; recovery means surviving cells resume growth.
6. Continue the simulation after culture failure and keep the existing warning-only volume behavior. Show cause, exposure, viability trajectory and cumulative loss. Any “culture failed” display threshold is a user-facing operational definition, not a new physical law.

## 8. Calibration and rollout

For every candidate dataset, retain species, exact strain/clone, recombinant state, medium, temperature, pH, biomass density, reactor/assay geometry, stress level, duration, adaptation history, measurement method, replicate variation and source locator.

Growth-rate or OD curves can calibrate inhibition but not uniquely identify death. Mortality calibration needs viable counts or a specified viability assay, together with total cell/biomass data where possible. CFU, membrane-integrity staining, metabolic assays and biomass measurements are not interchangeable. Endpoint viability percentages in growing cultures cannot simply be converted to `kd = −ln(viability)/time`.

Recommended sequence:

1. Introduce viable/dead/lysed pools and reporting, with compatibility tests and zero new mortality in legacy mode.
2. Add evidence-backed, editable stress profiles: pH-dependent acetate response, osmotic stress, oxygen-deprivation history and starvation. Make fermentative capability explicit.
3. Add upper-oxygen stress for animal cells, then calibrated mechanical/bubble damage and fungal morphology.
4. Keep uncalibrated mechanisms clearly labeled as experimental screening assumptions or warnings. Do not present species averages as measured lethal thresholds.

Useful validation cases: brief oxygen deprivation followed by recovery; prolonged combined stress; equal acetate at different pH; equal RPM with different impeller geometry; constant high substrate without overflow; mortality with retained DCW; continuous removal of live/dead/lysed material; changing gas mode without resetting viability; carbon balance closure; and refinement at smaller numerical intervals.

Evidence limitations: this was a targeted review, not a systematic meta-analysis. Some papers were available only as abstracts or indexed primary-study excerpts; numerical examples above reproduce reported conditions but are not full curve fits. Primary studies, rather than reviews or vendor guidance, underpin the substantive conclusions. Further data extraction is required before defensible strain-specific death-rate defaults can be shipped.
