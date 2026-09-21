const assert=require('node:assert/strict');
const model=require('../simulation-core.js');
const {create}=require('./simulation-example.js');
const near=(a,b,tol=1e-10)=>assert(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} vs ${b}`);

// Independent dimensional example: exactly 40 W / 0.04 m³, 60 L/min / tank area.
const s=create(),r=s.reactor;
Object.assign(r,{diameter:.257,impellerDiameter:.1,impellerCount:1,powerNumber:4,gassedPowerFraction:1});
const rpm=60*Math.cbrt(40/(4*1000*.1**5));
const value=model.powerAndKla(r,40,rpm,1.5);
near(value.powerW,40);near(value.powerDensity,1);near(value.powerDensityWm3,1000);
near(value.gasFlowM3s,.001);near(value.superficialGasVelocity,.001/(Math.PI*.257**2/4));
near(value.kla,205.96706698142264,1e-8);
near(model.powerAndKla({...r,gassedPowerFraction:.7},40,rpm,1.5).kla/value.kla,.7**.4);
near(model.powerAndKla({...r,diameter:.514},40,rpm,1.5).kla/value.kla,.5);
near(model.powerAndKla(r,40,rpm,6).kla/value.kla,2);
near(model.powerAndKla({...r,impellerType:'hydrofoil',spargerType:'micro',baffled:false},40,rpm,1.5).kla,value.kla);
assert.equal(model.powerAndKla(r,40,0,1.5).kla,0);assert.equal(model.powerAndKla(r,40,rpm,0).kla,0);
assert.equal(model.powerAndKla({...r,measuredKla:680},40,rpm,1.5).kla,680);
assert(model.powerAndKla(r,40,rpm*10,20).kla>1500,'Calculated correlation is not silently clipped');

const control=create();
control.reactor.oxygenSupplyMode='adaptive';
const held=model.updateDoController(control,control.process.doSetpoint,{integral:.8},.001);
assert.equal(held.output,.8);assert.equal(held.integral,.8);
assert(held.requested.oxygenFraction>.21,'Enrichment can persist at setpoint');
for(const e of [-1000,-10,0,10,1000]) {
  const v=model.updateDoController(control,control.process.doSetpoint-e,{integral:.5},.001);
  assert(v.output>=0&&v.output<=1&&v.integral>=0&&v.integral<=1);
}
let state={integral:1};
for(let i=0;i<1000;i++) state=model.updateDoController(control,0,state,.001);
assert.equal(state.integral,1);assert(state.antiWindup);
state=model.updateDoController(control,100,state,.001);
assert(state.integral<1&&state.output<1,'Reversed error unwinds a saturated controller');
const fixed=structuredClone(control);fixed.reactor.maxRpm=fixed.reactor.baseRpm;fixed.reactor.maxVvm=fixed.reactor.baseVvm;
near(model.controllerSettings(fixed,.5).oxygenFraction,.605);
fixed.reactor.maxOxygenFraction=.21;
assert.deepEqual(model.controllerSettings(fixed,.9),{rpm:fixed.reactor.baseRpm,vvm:fixed.reactor.baseVvm,oxygenFraction:.21});

// Independent fixed-OUR oxygen plant. No growth/feed kinetics or biomass fitting.
// Exercises reachable setpoints, demand steps, saturation and recovery using the real PI update.
function plant(dt) {
  const s=create();s.process.doSetpoint=35;s.reactor.oxygenSupplyMode='adaptive';
  s.reactor.maxRpm=s.reactor.baseRpm;s.reactor.maxVvm=s.reactor.baseVvm;
  const ref=model.airOxygenSaturation(37,0),p=model.DO_DEFAULTS;
  let C=ref,filtered=100,O=.21,controller={integral:0};
  const samples=[];
  for(let time=0;time<1.5-1e-10;time+=dt) {
    const demand=time<.3?50:time<.6?100:time<.9?300:40;
    filtered+=(100*C/ref-filtered)*(1-Math.exp(-dt*3600/p.doSensorTimeSeconds));
    controller=model.updateDoController(s,filtered,controller,dt);
    O+=(controller.requested.oxygenFraction-O)*(1-Math.exp(-dt*3600/p.doActuatorTimeSeconds));
    const equilibrium=ref*O/.21-demand/200;
    C=Math.max(0,equilibrium+(C-equilibrium)*Math.exp(-200*dt));
    samples.push({time,DO:100*C/ref,O,output:controller.output,I:controller.integral});
  }
  for(const [start,end] of [[.25,.3],[.55,.6],[1.4,1.5]]) {
    const window=samples.filter(v=>v.time>=start&&v.time<end);
    assert(Math.max(...window.map(v=>Math.abs(v.DO-35)))<.5,`Reachable load tracks within 0.5 DO point at ${start} h: ${window[0].DO} to ${window.at(-1).DO}`);
  }
  assert(samples.some(v=>v.time>.8&&v.time<.9&&v.output===1&&v.DO<1),'Impossible demand is not masked by controller');
  assert(samples.at(-1).I<.1,'Integral recovers after extended saturation');
  return samples.at(-1).DO;
}
near(plant(.001),plant(.0005),.001);

// Full three-stage nonlinear plant: check stability at finer sampling, not just endpoint biomass.
function cascadePlant(dt) {
  const s=structuredClone(require('../benchmarks/w3110-str50-2022/scenario-preset.json'));
  const ref=model.airOxygenSaturation(37,0),p=model.DO_DEFAULTS;
  let C=ref,filtered=100,controller={integral:0};
  const controls=model.controllerSettings(s,0),samples=[];
  for(let time=0;time<2-1e-10;time+=dt) {
    const demand=time<.4?20:time<.8?50:time<1.2?150:time<1.6?300:50;
    filtered+=(100*C/ref-filtered)*(1-Math.exp(-dt*3600/p.doSensorTimeSeconds));
    controller=model.updateDoController(s,filtered,controller,dt);
    for(const key of Object.keys(controls)) controls[key]+=(controller.requested[key]-controls[key])*(1-Math.exp(-dt*3600/p.doActuatorTimeSeconds));
    const kla=model.powerAndKla(s.reactor,24,controls.rpm,controls.vvm).kla;
    const equilibrium=ref*controls.oxygenFraction/.21-demand/kla;
    C=Math.max(0,equilibrium+(C-equilibrium)*Math.exp(-kla*dt));
    samples.push({time,DO:100*C/ref,output:controller.output});
  }
  for(const end of [.4,.8,1.2,2]) {
    const settled=samples.filter(v=>v.time>=end-.05&&v.time<end);
    assert(Math.max(...settled.map(v=>Math.abs(v.DO-35)))<.5,`Three-stage settling, dt=${dt}, end=${end}`);
  }
  assert(samples.some(v=>v.time>1.5&&v.time<1.6&&v.output===1&&v.DO<1));
}
for(const dt of [.001,.0005,.00025]) cascadePlant(dt);

for(const [group,key,bad] of [['reactor','gassedPowerFraction',0],['reactor','gassedPowerFraction',1.1],
  ['process','doKp',NaN],['process','doIntegralTimeSeconds',0],['process','doSensorTimeSeconds',-1],['process','doActuatorTimeSeconds',Infinity]]) {
  const s=create();s[group][key]=bad;assert(model.validateScenario(s).errors.some(e=>e.includes(key)));
}
const old=create();for(const k of Object.keys(model.DO_DEFAULTS)) delete old.process[k];delete old.reactor.gassedPowerFraction;
old.process.duration=.01;const result=model.simulate(old);
for(const [k,v] of Object.entries(model.DO_DEFAULTS)) assert.equal(result.scenario.process[k],v);
assert.equal(result.scenario.reactor.gassedPowerFraction,1);assert.equal(old.process.doKp,undefined,'Input is not rewritten');

// Transfer cannot spend more oxygen than inlet supply, even with a fixed high kLa.
const gas=create();gas.process.duration=.02;gas.process.initialDo=0;gas.process.initialBiomass=10;
Object.assign(gas.reactor,{measuredKla:1500,baseVvm:.0001,maxVvm:.0001,maxOxygenFraction:.21,oxygenSupplyMode:'adaptive'});
const g=model.simulate(gas).summary;
assert(g.oxygenTransferredMmol<=g.cumulativeInletOxygenMol*1000+1e-7);
assert(Math.abs(g.oxygenBalanceResidualMmol)<1e-6);assert(Math.abs(g.carbonBalanceClosure-100)<1e-6);
console.log('PASS: dimensional kLa, geometry/flow/power sensitivity, PI retention/staging/anti-windup, independent demand-step plant, refinement, import defaults and inlet oxygen conservation.');
