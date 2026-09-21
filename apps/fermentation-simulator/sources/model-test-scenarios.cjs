const { create } = require('./simulation-example.js');
module.exports = () => {
  const cases = {
    reference: () => {},
    batch: s => { s.process.type = 'batch'; s.process.harvestCondition = 'substrate'; },
    lowPh: s => { s.process.phSetpoint = 3; },
    oxygenLimited: s => { s.reactor.maxRpm = 300; s.reactor.maxVvm = 0.5; s.reactor.maxOxygenFraction = 0.21; s.reactor.fixedOxygenFraction = 0.21; },
    highFeed: s => { s.feed.initialRateMlMin *= 5; s.feed.maxRateMlMin = 1.25; },
    volumeStop: s => { s.reactor.maxWorkingVolume = 1.51; s.process.harvestCondition = 'volume'; },
    continuous: s => { s.process.type = 'continuous'; },
    uncontrolled: s => { s.process.phMode = 'uncontrolled'; },
    baseLimited: s => { s.process.maxBaseRate = 0; s.process.bufferCapacity = 5; },
    doStat: s => { s.feed.strategy = 'do-stat'; },
    fractionalEnd: s => { s.process.duration = 12.011; },
    biomass: s => { s.product.type = 'biomass'; s.product.recoverableFraction = 1; }
  };
  return Object.entries(cases).map(([name, edit]) => { const scenario = create(); edit(scenario); return { name, scenario }; });
};
