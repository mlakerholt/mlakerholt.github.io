(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FermentationExample = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function create() {
    return {
      schemaVersion: "fermentation-simulator/v0.2",
      reactor: {
        preset: "lab-glass-10", name: "10 L laboratory glass vessel · Rushton",
        totalVolume: 10, initialVolume: 1.5, maxWorkingVolume: 8, diameter: 0.21,
        liquidHeight: 0.70, heightDiameterRatio: 3.3, baffled: true,
        maxPressure: 0.5, operatingPressure: 0.05, impellerType: "rushton",
        impellerCount: 2, impellerDiameter: 0.07, powerNumber: 5, gassedPowerFraction: 1,
        baseRpm: 300, maxRpm: 1200, spargerType: "ring", baseVvm: 0.5, maxVvm: 2,
        oxygenSupplyMode: 'fixed', fixedOxygenFraction: 1,
        maxOxygenFraction: 1, allowNitrogen: true, allowCo2: false
      },
      biology: {
        preset: "ecoli-bl21", name: "Escherichia coli BL21(DE3)", category: "Microbial fermentation",
        muMax: 0.55, ks: 0.05, yxS: 0.48, maintenance: 0.02, qO2Max: 12,
        optimalTemperature: 37, optimalPh: 7, overflowThreshold: 0.75, enableOverflow: true
      },
      product: {
        type: "recombinant", name: "Recombinant protein", alpha: 0.025, beta: 0.006,
        degradation: 0.008, inductionTime: 8, postInductionTemperature: 28,
        burdenFactor: 0.72, recoverableFraction: 0.65
      },
      process: {
        type: "fed-batch", initialBiomass: 0.05, duration: 36, timeStep: 0.02,
        initialDo: 100, temperature: 37, phSetpoint: 7, doSetpoint: 30,
        doKp: 0.5, doIntegralTimeSeconds: 120, doSensorTimeSeconds: 15, doActuatorTimeSeconds: 10,
        phMode: "controlled", baseNormality: 4, maxBaseRate: 1, acidNormality: 4, maxAcidRate: 1,
        bufferCapacity: 50, harvestCondition: "duration"
      },
      medium: {
        name: "Defined glucose medium", preset: "defined-hcd", effectiveCarbon: 15,
        components: [{ name: "Glucose", concentration: 15, unit: "g/L", role: "carbon" }]
      },
      feed: {
        name: "Concentrated glucose feed", preset: "glucose", effectiveCarbon: 500,
        components: [{ name: "Glucose", concentration: 500, unit: "g/L", role: "carbon" }],
        strategy: "exponential", start: 6, initialRateMlMin: 0.02, maxRateMlMin: null,
        linearSlopeMlMinH: 0.1, targetGrowthRate: 0.16, dilutionRate: 0.15, doStatThreshold: 45
      }
    };
  }
  return { create };
});
