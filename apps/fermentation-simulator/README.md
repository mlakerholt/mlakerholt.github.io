# Fermentation Simulator

Browser-only beta for configuring and simulating a well-mixed bacterial stirred-tank process. The app is designed for GitHub Pages and has no server dependency.

## Included in beta 0.1

- Editable laboratory, single-use and stainless-steel reactor archetypes
- Vessel geometry, impeller, sparger, agitation, airflow and oxygen-enrichment limits
- E. coli BL21(DE3), MG1655, W3110 and DH5α presets
- Bacillus subtilis, Corynebacterium glutamicum, Pseudomonas putida and custom bacterial presets
- Batch, fed-batch and continuous operation
- Editable base-medium and feed recipes
- Constant, linear, exponential and simple DO-stat feed profiles
- Biomass, carbon substrate, product, acetate, oxygen-transfer and approximate pH-control balances
- Equipment-constraint warnings, final-state report, JSON scenario export and CSV time-series export
- Local browser storage; scenario information is not uploaded

## Core model

The growth model uses Monod-type carbon and oxygen terms with empirical temperature, pH and acetate-inhibition factors:

```text
mu = mu_max * S/(Ks + S) * O2/(Ko + O2) * f(T) * f(pH) * f(inhibition)
```

Substrate demand is estimated from biomass yield and maintenance:

```text
qS = mu/Yxs + mS
```

Non-biomass product formation uses a Luedeking-Piret form:

```text
qP = alpha * mu + beta
```

Agitator power is estimated from:

```text
P = Np * rho * N^3 * Di^5
```

The oxygen-transfer estimate uses an empirical power-density and gas-rate correlation. Dissolved oxygen is integrated from OTR minus OUR. The DO cascade increases agitation, then airflow, then inlet oxygen fraction within the configured limits.

## Important limitations

This is not a validated process simulator or equipment-sizing package. Reactor presets are broad equipment archetypes and are not certified manufacturer specifications. Strain kinetic values, complex-medium substrate equivalents, kLa correlations, overflow metabolism, product coefficients, gas balances and pH demand are simplified assumptions.

Product yield cannot be predicted from strain identity alone. Recombinant-protein, plasmid and metabolite scenarios should be calibrated with construct- and process-specific experimental data before interpretation.

## Files

- `index.html` — staged interface and report layout
- `simulator.css` — responsive visual design
- `app.js` — lightweight compressed-bundle loader
- `app.payload.*` — compressed simulation source containing presets, state management, model, charts and exports
