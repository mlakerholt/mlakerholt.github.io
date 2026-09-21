/* Shared calculation engine. Physics preserved from build 2026-09-12.6. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FermentationModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;

  const IMPELLERS = {
    rushton: { name: "Six-blade Rushton turbine", powerNumber: 5.0, klaFactor: 1.08 },
    pitched: { name: "Pitched-blade turbine", powerNumber: 1.3, klaFactor: 0.92 },
    hydrofoil: { name: "Hydrofoil", powerNumber: 0.35, klaFactor: 0.82 },
    marine: { name: "Marine impeller", powerNumber: 0.4, klaFactor: 0.74 },
    parabolic: { name: "Parabolic microbial turbine", powerNumber: 1.8, klaFactor: 1.0 },
    custom: { name: "Custom impeller", powerNumber: 1.0, klaFactor: 1.0 }
  };

  const SPARGER_FACTORS = {
    "open-pipe": 0.72,
    ring: 0.9,
    micro: 1.22,
    drilled: 1.0
  };

  function effectiveCarbon(components) {
    return components.reduce((sum, component) => {
      if (component.unit !== "g/L") return sum;
      if (component.role === "carbon") return sum + Number(component.concentration || 0);
      if (component.role === "complex") return sum + Number(component.concentration || 0) * 0.35;
      return sum;
    }, 0);
  }

  function sumRole(components, role) {
    return components.reduce((sum, component) => {
      return sum + (component.role === role && component.unit === "g/L" ? Number(component.concentration || 0) : 0);
    }, 0);
  }

  function hasComplex(components) {
    return components.some((component) => component.role === "complex");
  }

  function validateScenario(scenario) {
    const errors = [];
    const warnings = [];
    const { reactor: r, biology: b, process: p, medium, feed, product } = scenario;

    if (r.totalVolume <= 0 || r.initialVolume <= 0 || r.maxWorkingVolume <= 0) errors.push("All vessel volumes must be greater than zero.");
    if (r.initialVolume > r.maxWorkingVolume) errors.push("Initial working volume exceeds the maximum working volume.");
    if (r.maxWorkingVolume > r.totalVolume) errors.push("Maximum working volume exceeds total vessel volume.");
    if (r.impellerDiameter <= 0 || r.impellerDiameter >= r.diameter) errors.push("Impeller diameter must be positive and smaller than the vessel diameter.");
    if (r.baseRpm > r.maxRpm) errors.push("Initial agitation exceeds the maximum agitation.");
    if (r.baseVvm > r.maxVvm) errors.push("Initial aeration exceeds the maximum aeration.");
    if (r.maxOxygenFraction < 0.21 || r.maxOxygenFraction > 1) errors.push("Maximum inlet oxygen must be between 21% and 100%.");
    if (b.muMax <= 0 || b.yxS <= 0) errors.push("Growth rate and biomass yield must be positive.");
    if (p.duration <= 0 || p.timeStep <= 0) errors.push("Simulation duration and time step must be positive.");
    if (p.duration / p.timeStep > 250000) errors.push("The selected duration and time step create more than 250,000 integration steps.");
    if (medium.effectiveCarbon <= 0) errors.push("The base medium contains no usable carbon pool. Assign at least one component as a carbon source or complex nutrient.");
    if (scenario.process.type !== "batch" && feed.effectiveCarbon <= 0) errors.push("The selected non-batch process requires a feed with a usable carbon pool.");
    if (feed.initialRateMlMin > feed.maxRateMlMin && scenario.process.type === "fed-batch") errors.push("Initial feed rate exceeds the pump maximum.");
    if (product.type !== "biomass" && product.alpha === 0 && product.beta === 0) warnings.push("The product coefficients are zero, so no non-biomass product will be formed.");
    if (hasComplex(medium.components) || hasComplex(feed.components)) warnings.push("Complex nutrients are converted to an assumed 35% utilizable-substrate equivalent; elemental closure is incomplete.");
    if (scenario.process.type === "continuous" && feed.dilutionRate >= b.muMax) warnings.push("The dilution rate is at or above μmax, creating a strong washout risk.");
    if (r.impellerDiameter > r.diameter * 0.55) warnings.push("The selected impeller diameter is unusually large relative to the vessel diameter.");
    if (r.impellerDiameter < r.diameter * 0.2) warnings.push("The selected impeller diameter is small relative to the vessel diameter and may give weak mixing.");
    if (scenario.product.type !== "biomass") warnings.push("Product coefficients are generic assumptions unless replaced with construct- or process-specific data.");
    if (b.category === "Animal cell culture") warnings.push("Animal-cell results use dry-biomass equivalents and do not model viable-cell density, cell death, lactate/ammonia metabolism, osmolality or glycosylation.");
    if (b.preset === "saccharomyces-cerevisiae") warnings.push("S. cerevisiae ethanol overflow and diauxic growth are not represented by the acetate-only overflow model.");
    if (b.preset === "aspergillus-niger") warnings.push("A. niger pellet morphology, broth rheology and morphology-dependent oxygen transfer are not represented.");

    return { errors, warnings };
  }

  function powerAndKla(reactor, volumeL, rpm, vvm) {
    const impeller = IMPELLERS[reactor.impellerType] || IMPELLERS.custom;
    const density = 1000;
    const rotationsPerSecond = Math.max(0, rpm) / 60;
    const powerW = Math.max(0, reactor.powerNumber) * density * Math.pow(rotationsPerSecond, 3) * Math.pow(Math.max(reactor.impellerDiameter, 0.001), 5) * Math.max(1, reactor.impellerCount);
    const powerDensity = volumeL > 0 ? powerW / volumeL : 0;
    const tipSpeed = Math.PI * reactor.impellerDiameter * rotationsPerSecond;
    const baffleFactor = reactor.baffled ? 1 : 0.82;
    const spargerFactor = SPARGER_FACTORS[reactor.spargerType] || 1;
    const kla = clamp(
      65 * Math.pow(Math.max(powerDensity, 0.005), 0.45) * Math.pow(Math.max(vvm, 0.005), 0.40) * impeller.klaFactor * spargerFactor * baffleFactor,
      0,
      1500
    );
    return { powerW, powerDensity, tipSpeed, kla };
  }

  function controllerSettings(scenario, doPercent) {
    const r = scenario.reactor;
    const setpoint = Math.max(1, scenario.process.doSetpoint);
    const shortfall = clamp((setpoint - doPercent) / setpoint, 0, 1.5);
    const rpmStage = clamp(shortfall / 0.45, 0, 1);
    const airStage = clamp((shortfall - 0.28) / 0.45, 0, 1);
    const oxygenStage = clamp((shortfall - 0.62) / 0.38, 0, 1);
    return {
      rpm: r.baseRpm + (r.maxRpm - r.baseRpm) * rpmStage,
      vvm: r.baseVvm + (r.maxVvm - r.baseVvm) * airStage,
      oxygenFraction: 0.21 + (r.maxOxygenFraction - 0.21) * oxygenStage
    };
  }

  function feedRateLh(scenario, time, currentDo, substrateConcentration, volume) {
    const processType = scenario.process.type;
    const feed = scenario.feed;
    if (processType === "batch" || time < feed.start) return { requested: 0, applied: 0 };
    if (processType === "continuous") {
      const rate = Math.max(0, feed.dilutionRate) * volume;
      return { requested: rate, applied: rate };
    }

    let requestedMlMin = 0;
    if (feed.strategy === "constant") {
      requestedMlMin = feed.initialRateMlMin;
    } else if (feed.strategy === "linear") {
      requestedMlMin = feed.initialRateMlMin + feed.linearSlopeMlMinH * Math.max(0, time - feed.start);
    } else if (feed.strategy === "exponential") {
      requestedMlMin = feed.initialRateMlMin * Math.exp(feed.targetGrowthRate * Math.max(0, time - feed.start));
    } else if (feed.strategy === "do-stat") {
      requestedMlMin = currentDo >= feed.doStatThreshold && substrateConcentration < 0.7 ? feed.initialRateMlMin : 0;
    }
    const appliedMlMin = clamp(requestedMlMin, 0, Math.max(0, feed.maxRateMlMin));
    return { requested: requestedMlMin * 0.06, applied: appliedMlMin * 0.06 };
  }

  function temperatureFactor(actual, optimum) {
    return Math.exp(-Math.pow((actual - optimum) / 11, 2));
  }

  function phFactor(actual, optimum) {
    return Math.exp(-Math.pow((actual - optimum) / 0.85, 2));
  }

  function airOxygenSaturation(tempC, pressureGaugeBar) {
    const atOneBar = 0.28 * Math.exp(-0.025 * (tempC - 25));
    return atOneBar * Math.max(0.2, 1 + pressureGaugeBar);
  }

  function* createSimulation(scenario, options = {}) {
    const validation = validateScenario(scenario);
    if (validation.errors.length) throw new Error(validation.errors.join(" "));

    const dt = clamp(scenario.process.timeStep, 0.002, 0.1);
    const maxSteps = Math.ceil(scenario.process.duration / dt);
    const storeEvery = Math.max(1, Math.round(0.1 / dt));
    const r = scenario.reactor;
    const b = scenario.biology;
    const p = scenario.process;
    const product = scenario.product;

    let time = 0;
    let V = r.initialVolume;
    let MX = Math.max(0, p.initialBiomass) * V;
    let MS = Math.max(0, scenario.medium.effectiveCarbon) * V;
    let MP = 0;
    let MA = 0;
    let currentPh = p.phSetpoint;
    const initialTemperature = p.temperature;
    const airReference = airOxygenSaturation(initialTemperature, r.operatingPressure);
    let dissolvedOxygen = airReference * clamp(p.initialDo, 0, 200) / 100;
    let filteredDo = clamp(p.initialDo, 0, 200);
    let activeControls = { rpm: r.baseRpm, vvm: r.baseVvm, oxygenFraction: 0.21 };

    let cumulativeFeed = 0;
    let cumulativeBase = 0;
    let cumulativeOutflow = 0;
    let substrateInFeed = 0;
    let substrateOut = 0;
    let biomassOut = 0;
    let productOut = 0;
    let acetateOut = 0;
    let substrateConsumed = 0;
    let oxygenConsumedMmol = 0;
    let cumulativeGasL = 0;
    let cumulativeInletOxygenMol = 0;
    let carbonDioxideG = 0;
    let oxygenLimitedHours = 0;
    let cascadeLimitedHours = 0;
    let pumpLimitedHours = 0;
    let phDeviationHours = 0;
    let washoutHours = 0;
    let maxVolumeEncountered = false;
    let stoppedReason = "Process duration reached";
    let peakAcetate = 0;
    let peakOur = 0;
    let peakOtr = 0;
    let peakFeedRate = 0;

    const initialSubstrate = MS;
    const records = [];

    const snapshot = () => ({
      time, volume: V, biomassMass: MX, substrateMass: MS, productMass: MP, acetateMass: MA,
      biomassConcentration: MX / V, substrateConcentration: MS / V,
      productConcentration: MP / V, acetateConcentration: MA / V,
      oxygen: dissolvedOxygen, ph: currentPh, filteredDo, ...activeControls,
      cumulativeFeed, cumulativeBase, cumulativeOutflow, substrateInFeed, substrateOut,
      biomassOut, productOut, acetateOut, substrateConsumed, oxygenConsumedMmol,
      cumulativeGasL, cumulativeInletOxygenMol, carbonDioxideG,
      oxygenLimitedHours, cascadeLimitedHours, pumpLimitedHours, phDeviationHours,
      washoutHours, peakAcetate, peakOur, peakOtr, peakFeedRate
    });

    const addRecord = (controls = null, rates = null) => {
      const X = V > 0 ? MX / V : 0;
      const S = V > 0 ? MS / V : 0;
      const A = V > 0 ? MA / V : 0;
      const rawProductMass = product.type === "biomass" ? MX : MP;
      const rawProductConc = product.type === "biomass" ? X : (V > 0 ? MP / V : 0);
      const reference = airOxygenSaturation(
        time >= product.inductionTime && ["recombinant", "secreted"].includes(product.type) ? product.postInductionTemperature : initialTemperature,
        r.operatingPressure
      );
      const doPercent = reference > 0 ? dissolvedOxygen / reference * 100 : 0;
      records.push({
        time: round(time, 4),
        volume: V,
        biomassConcentration: X,
        totalBiomass: MX,
        substrateConcentration: S,
        productConcentration: rawProductConc * product.recoverableFraction,
        totalProduct: rawProductMass * product.recoverableFraction,
        acetateConcentration: A,
        dissolvedOxygen: doPercent,
        ph: currentPh,
        growthRate: rates?.mu || 0,
        substrateUptake: rates?.qS || 0,
        rpm: controls?.rpm || r.baseRpm,
        vvm: controls?.vvm || r.baseVvm,
        oxygenFraction: (controls?.oxygenFraction || 0.21) * 100,
        kla: rates?.kla || powerAndKla(r, V, r.baseRpm, r.baseVvm).kla,
        otr: rates?.otr || 0,
        our: rates?.our || 0,
        feedRateMlMin: (rates?.feedRateLh || 0) / 0.06,
        cumulativeFeed,
        cumulativeBase,
        cumulativeOutflow,
        harvestedProduct: productOut * product.recoverableFraction,
        cumulativeGas: cumulativeGasL
      });
    };

    addRecord();
    yield { kind: "initial", state: snapshot() };

    for (let step = 0; step < maxSteps; step += 1) {
      if (time >= p.duration - 1e-9) break;
      const trace = step === options.traceStep ? { index: step, dt, before: snapshot(), nodes: {} } : null;
      const capture = (id, values) => { if (trace) trace.nodes[id] = values; };

      let X = V > 0 ? MX / V : 0;
      let S = V > 0 ? MS / V : 0;
      let A = V > 0 ? MA / V : 0;
      const induced = ["recombinant", "secreted"].includes(product.type) && time >= product.inductionTime;
      const actualTemperature = induced ? product.postInductionTemperature : initialTemperature;
      const oxygenReference = airOxygenSaturation(actualTemperature, r.operatingPressure);
      const doPercent = oxygenReference > 0 ? dissolvedOxygen / oxygenReference * 100 : 0;
      capture("environment", { actualTemperature, induced, oxygenReference, doPercent,
        oxygen: dissolvedOxygen, ph: currentPh, time });
      const sensorResponse = 1 - Math.exp(-dt / 0.12);
      filteredDo += (doPercent - filteredDo) * sensorResponse;
      const requestedControls = controllerSettings(scenario, filteredDo);
      const actuatorResponse = 1 - Math.exp(-dt / 0.06);
      activeControls.rpm += (requestedControls.rpm - activeControls.rpm) * actuatorResponse;
      activeControls.vvm += (requestedControls.vvm - activeControls.vvm) * actuatorResponse;
      activeControls.oxygenFraction += (requestedControls.oxygenFraction - activeControls.oxygenFraction) * actuatorResponse;
      const controls = { ...activeControls };
      capture("controller", { filteredDo, doPercent, requested: { ...requestedControls }, ...controls,
        doSetpoint: p.doSetpoint, sensorResponse, actuatorResponse });
      const feedRequest = feedRateLh(scenario, time, doPercent, S, V);
      let feedRate = feedRequest.applied;

      if (feedRequest.requested > feedRequest.applied + 1e-9) pumpLimitedHours += dt;
      peakFeedRate = Math.max(peakFeedRate, feedRate / 0.06);

      if (p.type === "fed-batch") {
        const remainingVolume = Math.max(0, r.maxWorkingVolume - V);
        const allowedRate = remainingVolume / dt;
        if (feedRate > allowedRate) {
          feedRate = allowedRate;
          maxVolumeEncountered = true;
        }
      }
      capture("feed", { requestedMlMin: feedRequest.requested / 0.06,
        pumpAppliedMlMin: feedRequest.applied / 0.06, appliedMlMin: feedRate / 0.06,
        feedRate, substrateBeforeFeed: S, doPercent,
        pumpLimited: feedRequest.requested > feedRequest.applied + 1e-9,
        volumeLimited: feedRequest.applied > feedRate + 1e-9,
        active: feedRate > 0, strategy: scenario.feed.strategy });

      const outflowRate = p.type === "continuous" ? feedRate : 0;
      const inflowVolume = feedRate * dt;
      const outflowVolume = Math.min(V, outflowRate * dt);

      if (outflowVolume > 0 && V > 0) {
        const fraction = clamp(outflowVolume / V, 0, 1);
        substrateOut += MS * fraction;
        biomassOut += MX * fraction;
        productOut += MP * fraction;
        acetateOut += MA * fraction;
        MS *= 1 - fraction;
        MX *= 1 - fraction;
        MP *= 1 - fraction;
        MA *= 1 - fraction;
        V -= outflowVolume;
        cumulativeOutflow += outflowVolume;
      }

      if (inflowVolume > 0) {
        const substrateAddition = inflowVolume * scenario.feed.effectiveCarbon;
        V += inflowVolume;
        MS += substrateAddition;
        substrateInFeed += substrateAddition;
        cumulativeFeed += inflowVolume;
      }

      X = V > 0 ? MX / V : 0;
      S = V > 0 ? MS / V : 0;
      A = V > 0 ? MA / V : 0;

      capture("flows", { inflowVolume, outflowVolume, substrateAdded: inflowVolume * scenario.feed.effectiveCarbon,
        volume: V, biomassMass: MX, substrateMass: MS, acetateMass: MA, productMass: MP, X, S, A });
      const substrateTerm = S / (Math.max(1e-9, b.ks) + S);
      const ko = 0.006;
      const oxygenTerm = dissolvedOxygen / (ko + Math.max(0, dissolvedOxygen));
      const acetateInhibition = 1 / (1 + A / 8);
      const burden = induced ? clamp(product.burdenFactor, 0, 1) : 1;
      let mu = b.muMax * substrateTerm * oxygenTerm * temperatureFactor(actualTemperature, b.optimalTemperature) * phFactor(currentPh, b.optimalPh) * acetateInhibition * burden;
      mu = clamp(mu, 0, b.muMax);

      let qS = mu / Math.max(0.01, b.yxS) + b.maintenance * substrateTerm;
      let substrateUse = qS * MX * dt;
      const requestedSubstrateUse = substrateUse;
      const unrestrictedMu = mu;
      let availabilityFactor = 1;
      if (substrateUse > MS && substrateUse > 0) {
        availabilityFactor = MS / substrateUse;
        substrateUse = MS;
        mu *= availabilityFactor;
        qS *= availabilityFactor;
      }
      capture("growth", { substrateTerm, oxygenTerm, acetateInhibition, burden,
        temperatureFactor: temperatureFactor(actualTemperature, b.optimalTemperature),
        phFactor: phFactor(currentPh, b.optimalPh), mu, unrestrictedMu, qS, requestedSubstrateUse,
        substrateUse, availabilityFactor, oxygen: dissolvedOxygen, ph: currentPh, X, S, A,
        biomassUsed: MX, muMax: b.muMax, yxS: b.yxS, maintenance: b.maintenance });

      const biomassGrowth = mu * MX * dt;
      MX += biomassGrowth;
      MS = Math.max(0, MS - substrateUse);
      substrateConsumed += substrateUse;
      capture("biomass", { biomassGrowth, substrateUse, biomassMass: MX, substrateMass: MS });

      let acetateProduced = 0;
      let acetateUsed = 0;
      if (b.enableOverflow && qS > b.overflowThreshold && substrateUse > 0) {
        const overflowRate = 0.34 * (qS - b.overflowThreshold) * MX;
        acetateProduced = Math.min(substrateUse * 0.55, Math.max(0, overflowRate * dt));
        MA += acetateProduced;
      }

      if (b.enableOverflow && S < 0.25 && dissolvedOxygen > oxygenReference * 0.2 && MA > 0) {
        const acetateConsumption = Math.min(MA, 0.08 * (A / (0.3 + A)) * MX * dt);
        acetateUsed = acetateConsumption;
        MA -= acetateConsumption;
        MX += acetateConsumption * 0.22;
      }
      capture("acetate", { enabled: b.enableOverflow, qS, threshold: b.overflowThreshold,
        acetateProduced, acetateUsed, acetateBiomass: acetateUsed * 0.22,
        acetateMass: MA, biomassMass: MX, S, A });

      const productActive = product.type === "biomass" ? false : (!["recombinant", "secreted"].includes(product.type) || induced);
      const productBefore = MP;
      let productFormed = 0;
      if (productActive) {
        const qP = Math.max(0, product.alpha * mu + product.beta);
        productFormed = qP * MX * dt;
        MP += qP * MX * dt;
      }
      if (product.degradation > 0 && MP > 0) {
        MP *= Math.exp(-product.degradation * dt);
      }
      capture("product", { active: productActive, qP: productActive ? Math.max(0, product.alpha * mu + product.beta) : 0,
        productFormed, productDegraded: productBefore + productFormed - MP,
        productMass: MP, biomassUsed: MX, mu, alpha: product.alpha, beta: product.beta, degradation: product.degradation });

      const acidEquivalentMmol = biomassGrowth * 0.45 + acetateProduced / 60.05 * 1000;
      const phBefore = currentPh;
      let baseRequired = 0, baseDelivered = 0, acidUnmet = acidEquivalentMmol;
      if (p.phMode === "controlled") {
        const requiredBaseL = p.baseNormality > 0 ? acidEquivalentMmol / (p.baseNormality * 1000) : 0;
        const maximumBaseL = p.maxBaseRate * 0.06 * dt;
        const deliveredBaseL = Math.min(requiredBaseL, maximumBaseL);
        baseRequired = requiredBaseL;
        baseDelivered = deliveredBaseL;
        if (deliveredBaseL > 0) {
          V += deliveredBaseL;
          cumulativeBase += deliveredBaseL;
        }
        const unmetMmol = Math.max(0, acidEquivalentMmol - deliveredBaseL * p.baseNormality * 1000);
        acidUnmet = unmetMmol;
        if (unmetMmol > 0 && V > 0) {
          currentPh -= unmetMmol / (Math.max(1, p.bufferCapacity) * V);
        } else {
          currentPh += (p.phSetpoint - currentPh) * Math.min(1, dt * 8);
        }
      } else if (V > 0) {
        currentPh -= acidEquivalentMmol / (Math.max(1, p.bufferCapacity) * V);
      }
      currentPh = clamp(currentPh, 3, 10);
      capture("ph", { acidEquivalentMmol, baseRequired, baseDelivered, acidUnmet, phBefore,
        phAfter: currentPh, volume: V, biomassGrowth, acetateProduced,
        setpoint: p.phSetpoint, optimum: b.optimalPh, mode: p.phMode,
        baseNormality: p.baseNormality, bufferCapacity: p.bufferCapacity });

      const oxygenSystem = powerAndKla(r, V, controls.rpm, controls.vvm);
      const cStar = oxygenReference * (controls.oxygenFraction / 0.21);
      const relativeRate = b.muMax > 0 ? mu / b.muMax : 0;
      const our = b.qO2Max * X * (0.12 + 0.88 * relativeRate);
      const otr = Math.max(0, oxygenSystem.kla * (cStar - dissolvedOxygen));
      const equilibrium = oxygenSystem.kla > 0 ? cStar - our / oxygenSystem.kla : 0;
      const oxygenBefore = dissolvedOxygen;
      dissolvedOxygen = equilibrium + (dissolvedOxygen - equilibrium) * Math.exp(-oxygenSystem.kla * dt);
      const oxygenUnclipped = dissolvedOxygen;
      dissolvedOxygen = clamp(dissolvedOxygen, 0, Math.max(cStar, oxygenReference * 2));
      capture("oxygen", { ...oxygenSystem, cStar, oxygenReference, our, otr, equilibrium,
        oxygenBefore, oxygenUnclipped, oxygenAfter: dissolvedOxygen,
        doAfter: oxygenReference > 0 ? dissolvedOxygen / oxygenReference * 100 : 0,
        clipped: oxygenUnclipped !== dissolvedOxygen, biomassConcentrationUsed: X, mu,
        volumeUsed: V, qO2Max: b.qO2Max, ...controls });
      oxygenConsumedMmol += Math.max(0, our) * V * dt;
      const gasVolumeL = Math.max(0, controls.vvm) * V * 60 * dt;
      cumulativeGasL += gasVolumeL;
      cumulativeInletOxygenMol += gasVolumeL * controls.oxygenFraction / 24;
      carbonDioxideG += substrateUse * 0.95;

      const newDoPercent = oxygenReference > 0 ? dissolvedOxygen / oxygenReference * 100 : 0;
      if (newDoPercent < p.doSetpoint * 0.5) oxygenLimitedHours += dt;
      if (
        newDoPercent < p.doSetpoint &&
        controls.rpm >= r.maxRpm * 0.98 &&
        controls.vvm >= r.maxVvm * 0.98 &&
        controls.oxygenFraction >= r.maxOxygenFraction * 0.98
      ) cascadeLimitedHours += dt;
      if (Math.abs(currentPh - p.phSetpoint) > 0.2) phDeviationHours += dt;
      if (p.type === "continuous" && mu < scenario.feed.dilutionRate) washoutHours += dt;
      if (V >= r.maxWorkingVolume - 1e-6) maxVolumeEncountered = true;

      peakAcetate = Math.max(peakAcetate, V > 0 ? MA / V : 0);
      peakOur = Math.max(peakOur, our);
      peakOtr = Math.max(peakOtr, otr);

      time = Math.min(p.duration, time + dt);

      if (step % storeEvery === 0 || step === maxSteps - 1) {
        addRecord(controls, { mu, qS, kla: oxygenSystem.kla, otr, our, feedRateLh: feedRate });
      }

      if (trace) {
        trace.after = snapshot();
        trace.nodes.totals = { gasVolumeL, oxygenUsed: Math.max(0, our) * V * dt,
          co2Produced: substrateUse * 0.95, time, cumulativeFeed, cumulativeBase,
          cumulativeOutflow, oxygenLimitedHours, phDeviationHours, pumpLimitedHours };
        trace.stopReason = p.harvestCondition === "substrate" && p.type === "batch" && time > 0.5 && MS / V < 0.01
          ? "Substrate exhaustion condition reached"
          : p.harvestCondition === "volume" && V >= r.maxWorkingVolume - 1e-6
            ? "Maximum working volume condition reached"
            : time >= p.duration - 1e-9 ? "Process duration reached" : null;
      }
      yield { kind: "step", index: step, time, trace };

      const residualSubstrate = V > 0 ? MS / V : 0;
      if (p.harvestCondition === "substrate" && p.type === "batch" && time > 0.5 && residualSubstrate < 0.01) {
        stoppedReason = "Substrate exhaustion condition reached";
        break;
      }
      if (p.harvestCondition === "volume" && V >= r.maxWorkingVolume - 1e-6) {
        stoppedReason = "Maximum working volume condition reached";
        break;
      }
    }

    if (!records.length || records[records.length - 1].time < time - 1e-8) addRecord();

    const finalX = V > 0 ? MX / V : 0;
    const finalS = V > 0 ? MS / V : 0;
    const finalA = V > 0 ? MA / V : 0;
    const inReactorProduct = product.type === "biomass" ? MX : MP;
    const exportedProduct = product.type === "biomass" ? biomassOut : productOut;
    const recoverableProduct = (inReactorProduct + exportedProduct) * product.recoverableFraction;
    const totalSubstrateInput = initialSubstrate + substrateInFeed;
    const accountedSubstrate = MS + substrateOut + substrateConsumed;
    const balanceClosure = totalSubstrateInput > 0 ? accountedSubstrate / totalSubstrateInput * 100 : 100;
    const productYield = substrateConsumed > 0 ? recoverableProduct / substrateConsumed : 0;
    const biomassYieldObserved = substrateConsumed > 0 ? (MX + biomassOut - p.initialBiomass * r.initialVolume) / substrateConsumed : 0;

    const warnings = [...validation.warnings.map((message) => ({ severity: "low", title: "Input assumption", message }))];
    if (oxygenLimitedHours > 0.2) warnings.push({ severity: oxygenLimitedHours > 2 ? "high" : "medium", title: "Oxygen limitation", message: `Dissolved oxygen remained below half the setpoint for ${round(oxygenLimitedHours, 2)} h.` });
    if (cascadeLimitedHours > 0.1) warnings.push({ severity: "high", title: "DO cascade exhausted", message: `Agitation, airflow and oxygen enrichment were simultaneously at their configured limits for ${round(cascadeLimitedHours, 2)} h.` });
    if (pumpLimitedHours > 0.1) warnings.push({ severity: "medium", title: "Feed pump limited", message: `The requested feed exceeded the pump maximum for ${round(pumpLimitedHours, 2)} h.` });
    if (maxVolumeEncountered && p.type === "fed-batch") warnings.push({ severity: "medium", title: "Working-volume limit", message: "Nutrient feed was reduced or stopped when the maximum working volume was reached." });
    if (peakAcetate > 4) warnings.push({ severity: peakAcetate > 8 ? "high" : "medium", title: "Overflow-metabolite accumulation", message: `Peak simulated acetate reached ${round(peakAcetate, 2)} g/L.` });
    if (phDeviationHours > 0.1) warnings.push({ severity: "medium", title: "pH control insufficient", message: `pH deviated by more than 0.2 units for ${round(phDeviationHours, 2)} h.` });
    if (washoutHours > 0.5 && p.type === "continuous") warnings.push({ severity: "high", title: "Washout risk", message: `The effective growth rate remained below the dilution rate for ${round(washoutHours, 2)} h.` });
    if (Math.abs(balanceClosure - 100) > 0.5) warnings.push({ severity: "high", title: "Numerical balance error", message: `The substrate balance closed at ${round(balanceClosure, 2)}%. Reduce the integration time step.` });
    if (!warnings.length) warnings.push({ severity: "low", title: "No configured constraint reached", message: "The run completed without a major model or equipment warning." });

    return {
      scenario,
      records,
      warnings,
      summary: {
        stoppedReason,
        finalTime: time,
        finalVolume: V,
        finalBiomassConcentration: finalX,
        totalBiomass: MX,
        finalSubstrateConcentration: finalS,
        finalAcetateConcentration: finalA,
        finalProductTiter: V > 0 ? inReactorProduct / V * product.recoverableFraction : 0,
        recoverableProduct,
        productYield,
        biomassYieldObserved,
        cumulativeFeed,
        cumulativeBase,
        cumulativeOutflow,
        initialSubstrate,
        substrateInFeed,
        substrateConsumed,
        residualSubstrate: MS,
        substrateOut,
        balanceClosure,
        oxygenConsumedMmol,
        cumulativeGasL,
        cumulativeInletOxygenMol,
        carbonDioxideG,
        oxygenLimitedHours,
        cascadeLimitedHours,
        pumpLimitedHours,
        phDeviationHours,
        peakAcetate,
        peakOur,
        peakOtr,
        peakFeedRate
      }
    };
  }

  function simulate(scenario) {
    const iterator = createSimulation(scenario);
    let item = iterator.next();
    while (!item.done) item = iterator.next();
    return item.value;
  }

  function createInitialState(scenario) {
    const iterator = createSimulation(scenario);
    const state = iterator.next().value.state;
    iterator.return();
    return state;
  }

  function inspectStep(scenario, requestedStep = 0) {
    if (!Number.isFinite(requestedStep)) throw new Error("Choose a valid time step.");
    const dt = clamp(scenario.process.timeStep, 0.002, 0.1);
    const target = clamp(Math.floor(requestedStep), 0, Math.ceil(scenario.process.duration / dt) - 1);
    const iterator = createSimulation(scenario, { traceStep: target });
    const initialState = iterator.next().value.state;
    let lastIndex = -1;
    for (let item = iterator.next(); !item.done; item = iterator.next()) {
      lastIndex = item.value.index;
      if (item.value.trace) {
        iterator.return();
        return { initialState, trace: item.value.trace, requestedStep, actualStep: lastIndex,
          clamped: requestedStep !== lastIndex, duration: scenario.process.duration };
      }
    }
    if (lastIndex < 0) throw new Error("No calculation step is available for this scenario.");
    const result = inspectStep(scenario, lastIndex);
    return { ...result, requestedStep, clamped: true };
  }

  return { IMPELLERS, SPARGER_FACTORS, effectiveCarbon, sumRole, hasComplex, validateScenario, powerAndKla, controllerSettings, feedRateLh, temperatureFactor, phFactor, airOxygenSaturation, simulate, createSimulation, createInitialState, inspectStep };
});
