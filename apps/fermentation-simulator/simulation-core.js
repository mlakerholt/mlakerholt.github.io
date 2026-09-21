/* Shared calculation engine. Conservative resource-coupled screening model, version 2026-09-21.1. */
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


  const MODEL_VERSION = "2026-09-21.1";
  // Deliberately rigid teaching rules, not literature-fitted lethal limits.
  function failureProfile(s) {
    const family=[s.biology.category,s.biology.preset,s.biology.name].join(" ");
    if (/animal|mammal|cho|hybridoma|hek293|vero|bhk|ns0|sp2/i.test(family))
      return {id:"mammalian",name:"Mammalian",phMin:6.6,phMax:7.6,substrateMax:10,tipMax:3};
    if (/saccharomyces|cerevis|yeast/i.test(family))
      return {id:"yeast",name:"S. cerevisiae / yeast",phMin:3,phMax:6.5,substrateMax:250,tipMax:10};
    if (/aspergillus|niger|fung/i.test(family))
      return {id:"fungal",name:"A. niger / filamentous fungus",phMin:1.5,phMax:6,substrateMax:250,tipMax:3};
    return {id:"bacterial",name:"E. coli / general bacterial",phMin:5.5,phMax:8,substrateMax:50,tipMax:10};
  }
  function failureRules(s) {
    const p=failureProfile(s), mammal=p.id==="mammalian", aerobic=s.process.aerobicFailureRules!==false;
    const rules=[];
    const add=(id,title,image,parameter,unit,comparison,limit,hours,penalty,extra={})=>
      rules.push({id,title,image,parameter,unit,comparison,limit,hours,penalty,...extra});
    if(aerobic) {
      add("low-do","Oxygen limitation","oxygen","dissolvedOxygen","% air saturation","below",5,.5,"stress");
      add("anoxia","Prolonged oxygen depletion","oxygen","dissolvedOxygen","% air saturation","below",1,2,
        mammal||p.id==="fungal"?"culture-failure":"batch-failure");
    }
    if(mammal) {
      add("high-do","Hyperoxia","hyperoxia","dissolvedOxygen","% air saturation","above",200,1,"stress");
      add("lethal-do","Prolonged hyperoxia","hyperoxia","dissolvedOxygen","% air saturation","above",300,6,"culture-failure");
    }
    add("ph-stress","pH outside operating range","ph","ph","pH units","outside",[p.phMin,p.phMax],.5,"stress");
    add("ph-failure","Prolonged pH excursion","ph","ph","pH units","outside",[p.phMin,p.phMax],2,"culture-failure");
    add("substrate-stress","Excess broth substrate","substrate","substrateConcentration","g/L glucose equivalent","above",p.substrateMax,1,"stress");
    add("substrate-failure","Extreme broth substrate","substrate","substrateConcentration","g/L glucose equivalent","above",2*p.substrateMax,1,"batch-failure");
    if(p.id==="bacterial"&&s.biology.enableOverflow) {
      add("acetate-stress","Acetate accumulation","acetate","acetateConcentration","g/L","above",5,1,"stress");
      add("acetate-failure","Prolonged acetate accumulation","acetate","acetateConcentration","g/L","above",10,2,"culture-failure");
    }
    add("starvation","Carbon starvation","starvation","substrateConcentration","g/L glucose equivalent","below",.02,mammal?4:8,
      mammal?"culture-failure":"batch-failure",{starvation:true});
    add("tip-stress","Excess impeller tip speed","shear","tipSpeed","m/s","above",p.tipMax,.5,"stress");
    add("tip-failure","Extreme impeller tip speed","shear","tipSpeed","m/s","above",1.5*p.tipMax,.5,"batch-failure");
    add("working-volume","Working volume exceeded","volume","volume","L","above",s.reactor.maxWorkingVolume,0,"warning");
    add("overfill","Sustained overfilling","volume","volume","L","above",1.1*s.reactor.maxWorkingVolume,5/60,"batch-failure");
    add("total-volume","Total vessel capacity reached","volume","volume","L","at-or-above",s.reactor.totalVolume,0,"batch-failure");
    return rules;
  }
  function createFailureState(s) {
    return {enabled:s.process.strictFailures===true,profile:failureProfile(s),rules:failureRules(s),
      timers:{},events:[],cultureFailed:false,batchFailed:false,invalidExtrapolation:false,stressMultiplier:1};
  }
  function updateFailureState(s,f,m,dt,time) {
    if(!f.enabled)return;
    for(const r of f.rules) {
      const value=m[r.parameter], limit=Array.isArray(r.limit)?(value<r.limit[0]?r.limit[0]:r.limit[1]):r.limit;
      let outside=r.comparison==="outside"?value<r.limit[0]||value>r.limit[1]:
        r.comparison==="below"?value<limit:r.comparison==="at-or-above"?value>=limit:value>limit;
      // Low residual substrate alone is normal in fed-batch. Require no meaningful
      // growth-supporting uptake, and no usable acetate pool, before timing starvation.
      if(r.starvation) outside=outside&&!(s.biology.enableOverflow&&m.acetateConcentration>=.02)&&
        !(m.growthRate>=.001&&m.substrateUptake>0);
      const t=f.timers[r.id]??=( {exposure:0,recovery:0,active:false,fired:false,eventIndex:null} );
      if(outside) {
        t.exposure+=dt;t.recovery=0;
        if(!t.fired&&t.exposure+1e-10>=r.hours) {
          t.fired=true;t.active=true;
          const deviation=Math.abs(value-limit);
          const event={...r,time,value,threshold:limit,deviation,deviationPercent:limit?100*deviation/Math.abs(limit):null,
            worstValue:value,worstDeviation:deviation,triggerExposureHours:t.exposure,exposureHours:t.exposure,active:true,resolvedAt:null};
          t.eventIndex=f.events.push(event)-1;
          if(r.penalty==="culture-failure") f.cultureFailed=true;
          if(r.penalty==="batch-failure"||r.penalty==="culture-failure")f.batchFailed=true;
          if(r.id==="total-volume")f.invalidExtrapolation=true;
        }
        if(t.eventIndex!==null) {
          const event=f.events[t.eventIndex];
          event.exposureHours=t.exposure;
          if(Math.abs(value-limit)>event.worstDeviation) {
            event.worstValue=value;event.worstDeviation=Math.abs(value-limit);
          }
        }
      } else {
        t.recovery+=dt;
        if(t.recovery+1e-10>=1/60) {
          t.exposure=0;t.active=false;
          if(t.eventIndex!==null&&f.events[t.eventIndex].active) {
            f.events[t.eventIndex].active=false;f.events[t.eventIndex].resolvedAt=time;
          }
          // A recovered episode's diagnostics are immutable. Failure flags remain
          // latched; only warning/stress episodes may trigger again in this run.
          t.eventIndex=null;
          if(r.penalty==="stress"||r.penalty==="warning")t.fired=false;
        }
      }
    }
    f.stressMultiplier=f.cultureFailed?0:f.rules.some(r=>r.penalty==="stress"&&f.timers[r.id]?.active)?.25:1;
  }
  // Engineering defaults, not parameters fitted to an organism or reactor experiment.
  const DO_DEFAULTS = Object.freeze({doKp:.5, doIntegralTimeSeconds:120,
    doSensorTimeSeconds:15, doActuatorTimeSeconds:10});
  // Explicit glucose-equivalent screening assumptions, not measured organism compositions.
  const ASSUMPTIONS = Object.freeze({ substrateCarbon: 0.4, biomassCarbon: 0.5,
    productCarbon: 0.5, acetateCarbon: 0.4, biomassReduction: 4.2,
    productReduction: 4.2, substrateReduction: 4, productYield: 0.5 });
  const integrationStep = s => Math.min(s.process.timeStep, 0.001);
  const molecularWeights = { glucose:180.156, "d-glucose":180.156, glycerol:92.094,
    sucrose:342.296, fructose:180.156, lactose:342.296, galactose:180.156, xylose:150.13 };
  function concentrationGL(c) {
    const value = Number(c.concentration);
    if (c.unit === "g/L") return value;
    if (c.unit === "mg/L") return value / 1000;
    if (c.unit === "mmol/L" || c.unit === "mM") {
      const mw = c.molecularWeight ?? molecularWeights[String(c.name).trim().toLowerCase()];
      return Number.isFinite(mw) && mw > 0 ? value * mw / 1000 : NaN;
    }
    return NaN;
  }
  function effectiveCarbon(components) {
    if (!Array.isArray(components)) return NaN;
    return components.reduce((sum, c) => {
      if (!c || typeof c !== "object") return NaN;
      if (!["carbon","complex"].includes(c.role)) return sum;
      return sum + concentrationGL(c) * (c.role === "complex" ? 0.35 : 1);
    }, 0);
  }
  function sumRole(components, role) {
    return components.reduce((sum,c) => sum + (c.role === role ? concentrationGL(c) : 0), 0);
  }
  const hasComplex = components => Array.isArray(components) && components.some(c => c?.role === "complex");
  function growthYield(b) {
    return b.yieldBasis === "observed"
      ? 1 / (1 / b.yxS - b.maintenance / b.yieldReferenceGrowthRate) : b.yxS;
  }
  function validateScenario(s) {
    const errors=[], warnings=[];
    if (!s || typeof s !== "object") return {errors:["A complete scenario is required."],warnings};
    for (const group of ["reactor","biology","process","medium","feed","product"])
      if (!s[group] || typeof s[group] !== "object") errors.push("Missing " + group + " settings.");
    if (errors.length) return {errors,warnings};
    const {reactor:r,biology:b,process:p,medium,feed,product}=s;
    const number=(o,k,min,max=Infinity,optional=false)=>{
      if (optional && o[k] === undefined) return;
      if (!Number.isFinite(o[k]) || o[k]<min || o[k]>max)
        errors.push(k + " must be a finite number between " + min + " and " + (max===Infinity?"the supported physical limit":max) + ".");
    };
    const choice=(o,k,values,optional=false)=>{
      if (optional && o[k] === undefined) return;
      if (!values.includes(o[k])) errors.push("Unsupported " + k + ".");
    };
    for(const k of ["totalVolume","initialVolume","maxWorkingVolume","diameter","impellerDiameter"]) number(r,k,1e-9);
    for(const k of ["baseRpm","maxRpm","baseVvm","maxVvm","powerNumber","maxPressure"]) number(r,k,0);
    number(r,"operatingPressure",0,r.maxPressure); number(r,"impellerCount",1,20);
    if(!Number.isInteger(r.impellerCount)) errors.push("Impeller count must be an integer.");
    number(r,"maxOxygenFraction",.21,1);
    choice(r,"oxygenSupplyMode",["fixed","adaptive"],true);
    number(r,"fixedOxygenFraction",.21,1,true);
    number(r,"measuredKla",0,1500,true);
    number(r,"gassedPowerFraction",.05,1,true);
    choice(r,"impellerType",Object.keys(IMPELLERS)); choice(r,"spargerType",Object.keys(SPARGER_FACTORS));
    if(r.maxWorkingVolume>r.totalVolume) errors.push("Maximum working volume must not exceed total vessel volume.");
    if(r.initialVolume>r.maxWorkingVolume) warnings.push("Initial volume exceeds the working-volume limit. The simulation will continue and report the excess.");
    if(r.impellerDiameter>=r.diameter) errors.push("Impeller diameter must be smaller than vessel diameter.");
    if(r.baseRpm>r.maxRpm || r.baseVvm>r.maxVvm) errors.push("Initial agitation/aeration exceeds its maximum.");
    number(b,"muMax",1e-9,10); number(b,"yxS",1e-9,1);
    for(const k of ["ks","maintenance","qO2Max","overflowThreshold"]) number(b,k,0);
    number(b,"optimalTemperature",0,100); number(b,"optimalPh",0,14);
    number(b,"substrateThreshold",0,100,true);
    choice(b,"yieldBasis",["true","observed"],true);
    if(b.yieldBasis==="observed") number(b,"yieldReferenceGrowthRate",1e-9,10);
    const maxYield=ASSUMPTIONS.substrateCarbon*4/(ASSUMPTIONS.biomassCarbon*ASSUMPTIONS.biomassReduction);
    if(!Number.isFinite(growthYield(b)) || growthYield(b)<=0 || growthYield(b)>maxYield)
      errors.push("Maintenance-corrected yield exceeds the aerobic glucose-equivalent carbon/electron budget; reconcile yield and maintenance.");
    choice(p,"type",["batch","fed-batch","continuous"]); choice(p,"phMode",["controlled","uncontrolled"]);
    choice(p,"harvestCondition",["duration","volume","substrate"]);
    for(const key of ["strictFailures","aerobicFailureRules"])
      if(p[key]!==undefined&&typeof p[key]!=="boolean")errors.push(key+" must be true or false.");
    number(p,"initialBiomass",0); number(p,"duration",1e-9,10000);
    number(p,"timeStep",.0001,.1); number(p,"initialDo",0,200);
    number(p,"temperature",0,100); number(p,"phSetpoint",0,14); number(p,"doSetpoint",1,200);
    number(p,"initialPh",0,14,true);
    number(p,"doKp",.01,10,true);
    number(p,"doIntegralTimeSeconds",30,3600,true);
    number(p,"doSensorTimeSeconds",5,600,true);
    number(p,"doActuatorTimeSeconds",5,600,true);
    choice(p,"inoculumMode",["dcw","od"],true);
    if(p.inoculumMode === "od") { number(p,"initialOd",0); number(p,"odToDcw",1e-12); }
    if(p.inoculumMode === "od" && Math.abs(p.initialBiomass-p.initialOd*p.odToDcw)>1e-10*Math.max(1,p.initialBiomass))
      errors.push("Initial biomass must match OD multiplied by its measured calibration.");
    number(p,"baseNormality",0,100); number(p,"maxBaseRate",0); number(p,"bufferCapacity",1e-9);
    number(p,"acidNormality",0,100,true); number(p,"maxAcidRate",0,Infinity,true);
    if(p.duration/integrationStep(s)>500000) errors.push("Choose duration/step requiring at most 500,000 internal intervals.");
    choice(product,"type",["biomass","mab","recombinant","secreted","plasmid","growth-metabolite","nongrowth-metabolite","custom"]);
    for(const k of ["alpha","beta","degradation","inductionTime"]) number(product,k,0);
    number(product,"postInductionTemperature",0,100); number(product,"burdenFactor",0,1);
    number(product,"recoverableFraction",0,1);
    number(product,"substrateYield",1e-9,maxYield,true);
    choice(feed,"strategy",["constant","linear","exponential","do-stat"]);
    for(const k of ["start","initialRateMlMin","targetGrowthRate","dilutionRate","doStatThreshold"]) number(feed,k,0);
    // null or omission means no pump-capacity restriction; zero remains a real zero limit.
    if(feed.maxRateMlMin != null) number(feed,"maxRateMlMin",0);
    number(feed,"linearSlopeMlMinH",-100000,100000);
    for(const [name,pool] of [["medium",medium],["feed",feed]]) {
      if(!Array.isArray(pool.components)) {errors.push(name+" components must be an array.");continue;}
      for(const c of pool.components) {
        if(!c || typeof c!=="object" || typeof c.concentration!=="number" || !Number.isFinite(c.concentration) || c.concentration<0)
          errors.push(name+" contains an invalid component concentration.");
        else if(["carbon","complex"].includes(c.role) && !Number.isFinite(concentrationGL(c)))
          errors.push(name+": unsupported carbon unit or unknown molecular weight for "+c.name+". Use g/L or supply molecularWeight.");
      }
      const calculated=effectiveCarbon(pool.components);
      if(!Number.isFinite(pool.effectiveCarbon) || pool.effectiveCarbon<0 ||
         !Number.isFinite(calculated) || Math.abs(calculated-pool.effectiveCarbon)>1e-8*Math.max(1,calculated))
        errors.push(name+" carbon total must match its component recipe.");
    }
    if(p.type!=="batch" && feed.maxRateMlMin != null && feed.initialRateMlMin>feed.maxRateMlMin && feed.strategy!=="do-stat")
      errors.push("Initial feed rate exceeds the pump maximum.");
    if(Math.abs(p.phSetpoint-b.optimalPh)>.7) warnings.push("The selected pH setpoint is outside the organism's assumed preferred range. Check retained settings.");
    if(Math.abs(p.temperature-b.optimalTemperature)>5) warnings.push("Process temperature differs from the organism's assumed optimum.");
    if(s.schemaVersion === "fermentation-simulator/v0.1" || (s.inputModelVersion && s.inputModelVersion !== MODEL_VERSION))
      warnings.push("Imported scenario from another model version: results may differ. Supplied biology, feed and explicit equipment limits are retained; missing optional settings use current defaults.");
    warnings.push("Screening model: glucose-equivalent carbon/electron accounting assumes 50% carbon and degree of reduction 4.2 for biomass/product. Nitrogen, phosphate, amino acids and ATP are not balanced. Optional strict death rules are teaching assumptions, not calibrated survival kinetics. Recalibrate before process design.");
    if(hasComplex(medium.components)||hasComplex(feed.components)) warnings.push("Complex nutrients contribute an assumed 35% glucose equivalent.");
    const family=(b.category||"")+" "+(b.preset||"");
    if(/animal|cho|hybridoma|hek293/i.test(family)) warnings.push("Mechanistic animal-cell viability/survival, lactate/ammonia, osmolality and glycosylation are not modeled; strict failure rules use artificial operating limits.");
    if(/saccharomyces/i.test(family)) warnings.push("S. cerevisiae ethanol overflow and diauxic growth are not modeled.");
    if(/aspergillus/i.test(family)) warnings.push("A. niger pellet morphology and broth rheology are not modeled.");
    if(b.preset?.startsWith("generalized-")) warnings.push("Generalized profile: point estimates include uncalibrated assumptions, not an uncertainty distribution.");
    if(product.type!=="biomass") warnings.push("Product kinetics and substrate yield are generic unless calibrated; product formation now consumes substrate.");
    if(r.measuredKla===undefined) {
      warnings.push("kLa uses Van't Riet's coalescing, low-viscosity stirred-tank correlation. Broth, antifoam, sparger and geometry effects require measured calibration; this is not a manufacturer performance prediction.");
      if((r.gassedPowerFraction??1)===1) warnings.push("Gassed power is approximated by calculated shaft power (fraction 1). Aeration can reduce actual power; enter a measured gassed/ungassed power ratio when available.");
      if(!r.baffled) warnings.push("The stirred-tank transfer correlation is not calibrated for an unbaffled vessel.");
    }
    return {errors,warnings};
  }
  function powerAndKla(r,volume,rpm,vvm) {
    const powerW=r.powerNumber*1000*Math.pow(rpm/60,3)*Math.pow(r.impellerDiameter,5)*r.impellerCount;
    const powerDensity=powerW/volume, tipSpeed=Math.PI*r.impellerDiameter*rpm/60;
    const gassedPowerW=powerW*(r.gassedPowerFraction??1), volumeM3=volume/1000;
    const powerDensityWm3=gassedPowerW/volumeM3;
    const gasFlowM3s=vvm*volumeM3/60, tankAreaM2=Math.PI*r.diameter*r.diameter/4;
    const superficialGasVelocity=gasFlowM3s/tankAreaM2;
    // Van't Riet (1979), coalescing system: 1/s = .026 (W/m³)^.4 (m/s)^.5.
    // DOI: 10.1021/i260071a001. No arbitrary impeller/sparger multipliers or kLa ceiling.
    const kla=r.measuredKla ?? (rpm>0 && vvm>0 ?
      3600*.026*Math.pow(powerDensityWm3,.4)*Math.pow(superficialGasVelocity,.5):0);
    return {powerW,powerDensity,tipSpeed,kla,gassedPowerW,powerDensityWm3,gasFlowM3s,
      tankAreaM2,superficialGasVelocity,klaMethod:r.measuredKla===undefined?"van-t-riet-coalescing":"measured-fixed"};
  }
  // Omitted mode preserves the adaptive cascade in legacy saved scenarios.
  function inletOxygenLimit(r) {
    return r.oxygenSupplyMode === "fixed" ? (r.fixedOxygenFraction ?? 1) : r.maxOxygenFraction;
  }
  function controllerSettings(s,output) {
    const r=s.reactor, fixed=r.oxygenSupplyMode==="fixed";
    const requested={rpm:r.baseRpm,vvm:r.baseVvm,oxygenFraction:fixed?inletOxygenLimit(r):.21};
    const stages=[["rpm",r.baseRpm,r.maxRpm],["vvm",r.baseVvm,r.maxVvm],
      ...(!fixed?[["oxygenFraction",.21,r.maxOxygenFraction]]:[])]
      .filter(([,low,high])=>high>low);
    // Equal sections of the output range, skipping actuators with no available range.
    stages.forEach(([key,low,high],i)=>{requested[key]=low+(high-low)*clamp(output*stages.length-i,0,1);});
    return requested;
  }
  function updateDoController(s,doPercent,state,dt) {
    const p=s.process, kp=p.doKp??DO_DEFAULTS.doKp;
    const integralSeconds=p.doIntegralTimeSeconds??DO_DEFAULTS.doIntegralTimeSeconds;
    const error=(p.doSetpoint-doPercent)/100;
    const previous=state.integral??0, unsaturated=previous+kp*error;
    // Conditional integration prevents windup against the output limits, but permits recovery.
    const hold=(unsaturated>=1 && error>0)||(unsaturated<=0 && error<0);
    const integral=hold?previous:clamp(previous+kp*error*dt*3600/integralSeconds,0,1);
    const output=clamp(integral+kp*error,0,1);
    return {integral,output,error,antiWindup:hold,requested:controllerSettings(s,output)};
  }
  function feedRateLh(s,time,doPercent,S,V) {
    const f=s.feed;
    const capacity=f.maxRateMlMin == null?Infinity:f.maxRateMlMin*.06;
    if(s.process.type==="batch" || time+1e-10<f.start) return {requested:0,applied:0};
    if(s.process.type==="continuous") {
      const requested=f.dilutionRate*V;
      return {requested,applied:Math.min(requested,capacity)};
    }
    const elapsed=Math.max(0,time-f.start);
    let rate=f.strategy==="constant"?f.initialRateMlMin:
      f.strategy==="linear"?f.initialRateMlMin+f.linearSlopeMlMinH*elapsed:
      f.strategy==="exponential"?f.initialRateMlMin*Math.exp(Math.min(700,f.targetGrowthRate*elapsed)):
      doPercent>=f.doStatThreshold && S<.7?f.initialRateMlMin:0;
    const requested=Math.max(0,rate)*.06;
    return {requested,applied:Math.min(requested,capacity)};
  }
  const temperatureFactor=(actual,optimum)=>Math.exp(-Math.pow((actual-optimum)/11,2));
  const phFactor=(actual,optimum)=>Math.exp(-Math.pow((actual-optimum)/.85,2));
  const airOxygenSaturation=(temp,pressure)=>.28*Math.exp(-.025*(temp-25))*(1+pressure);

  // Backward resource solve: reactions use end-interval S and C, frozen starting MX.
  // Carbon partition and reducing equivalents determine CO2/O2; qO2Max is a capacity.
  function solveReactions(s, state, environment, controls, dt) {
    const b=s.biology, p=s.product, {V,MX,MS,MA,C}=state;
    const system=powerAndKla(s.reactor,V,controls.rpm,controls.vvm);
    const cStar=environment.oxygenReference*controls.oxygenFraction/.21;
    const gasL=controls.vvm*V*60*dt, gasO2=gasL*controls.oxygenFraction/24*1000;
    const carbon=ASSUMPTIONS, Y=growthYield(b), Yp=p.substrateYield??carbon.productYield;
    const factor=temperatureFactor(environment.actualTemperature,b.optimalTemperature)*phFactor(environment.ph,b.optimalPh)/
      (1+MA/V/8)*(environment.induced?p.burdenFactor:1);
    const active=p.type!=="biomass" && (!["recombinant","secreted"].includes(p.type)||environment.induced);
    function rates(S,O) {
      const fS=S/(Math.max(1e-12,b.ks)+S), fO=O/(.006+O);
      const above=Math.max(0,S-(b.substrateThreshold??0));
      const growthS=above/(Math.max(1e-12,b.ks)+above);
      const potential=b.muMax*growthS*fO*factor;
      if(MX<=0)return {mu:0,product:0,substrate:0,acetate:0,reuse:0,acetateBiomass:0,carbonGas:0,oxygen:0,
        fS,growthS,fO,potential:0,capacity:1,maintenance:0};
      let growthSub=potential/Y;
      const maintenance=b.maintenance*fS*fO, stress=environment.stressMultiplier??1;
      let acetate=b.enableOverflow?Math.min(growthSub*.55,.34*Math.max(0,growthSub+maintenance-b.overflowThreshold)):0;
      let mu=(growthSub-acetate)*Y;
      let product=active?(p.alpha*mu+p.beta*fS*fO):0;
      // Apply once to growth and product potential, before resource/electron coupling.
      growthSub*=stress;acetate*=stress;mu*=stress;product*=stress;
      let substrate=growthSub+maintenance+product/Yp;
      let reuse=b.enableOverflow?Math.min(MA/Math.max(MX*dt,1e-30),.08*(MA/V/(.3+MA/V))*(.25/(.25+S))*fO)*stress:0;
      let acetateBiomass=reuse*.22;
      let carbonGas=substrate*.4+reuse*.4-(mu+acetateBiomass)*.5-product*.5-acetate*.4;
      let oxygen=(4*(substrate*.4+reuse*.4-acetate*.4)-4.2*.5*(mu+acetateBiomass+product))/4/12.011*1000;
      if(carbonGas< -1e-10 || oxygen< -1e-10) throw new Error("Reaction yield violates the configured carbon/electron budget.");
      const capacity=oxygen>0?Math.min(1,b.qO2Max/oxygen):1;
      mu*=capacity;product*=capacity;substrate*=capacity;acetate*=capacity;reuse*=capacity;acetateBiomass*=capacity;
      carbonGas*=capacity;oxygen*=capacity;
      return {mu,product,substrate,acetate,reuse,acetateBiomass,carbonGas:Math.max(0,carbonGas),
        oxygen:Math.max(0,oxygen),fS,growthS,fO,potential,capacity,maintenance:maintenance*capacity};
    }
    function atOxygen(O) {
      let lo=0,hi=MS/V;
      // Bracketed scalar solve: S + qS(S,C) MX dt/V = S_before.
      for(let i=0;i<32;i++) {
        const mid=(lo+hi)/2, q=rates(mid,O);
        if(mid+q.substrate*MX*dt/V>MS/V) hi=mid; else lo=mid;
      }
      const S=(lo+hi)/2, q=rates(S,O);
      // Limit gas-to-liquid transfer by inlet oxygen as well as kLa.
      const transfer=Math.min(system.kla*(cStar-O)*V*dt,gasO2);
      return {S,q,transfer,residual:O-C+(q.oxygen*MX*dt-transfer)/V};
    }
    let lo=0,hi=Math.max(C,cStar), selected;
    if(hi===0 || (C===0 && gasO2===0)) selected=atOxygen(0);
    else {
      for(let i=0;i<34;i++) {
        const mid=(lo+hi)/2, value=atOxygen(mid);
        if(value.residual>0) hi=mid; else lo=mid;
      }
      selected=atOxygen((lo+hi)/2);
    }
    const q=selected.q;
    // Tiny roundoff only; nonnegative resource roots are solved before rates are applied.
    const used=Math.min(MS,q.substrate*MX*dt), scale=q.substrate*MX*dt>0?used/(q.substrate*MX*dt):1;
    for(const key of ["mu","product","substrate","acetate","reuse","acetateBiomass","carbonGas","oxygen","maintenance"]) q[key]*=scale;
    const oxygenUsed=q.oxygen*MX*dt;
    const oxygenAfter=C+(selected.transfer-oxygenUsed)/V;
    if(oxygenAfter < -1e-7) throw new Error("Oxygen solve failed conservation tolerance; reduce the interval.");
    return {q,substrateUse:used,oxygenAfter:Math.max(0,oxygenAfter),oxygenUsed,transfer:selected.transfer,
      solvedSubstrate:selected.S,system,cStar,gasL,gasO2,Y,Yp,active};
  }

  function* createSimulation(scenario, options={}) {
    const validation=validateScenario(scenario);
    if(validation.errors.length) throw new Error(validation.errors.join(" "));
    // Own the input snapshot so later UI changes cannot rewrite result provenance.
    const s=JSON.parse(JSON.stringify(scenario));
    for(const [key,value] of Object.entries(DO_DEFAULTS)) s.process[key]??=value;
    // Missing acid settings mean a legacy base-only run; do not silently enable a new pump.
    s.process.acidNormality??=4;s.process.maxAcidRate??=0;
    // Old exported scenarios preserve their original kinetics unless explicitly enabled.
    s.process.strictFailures??=false;s.process.aerobicFailureRules??=true;
    s.reactor.gassedPowerFraction??=1;
    s.reactor.oxygenSupplyMode??="adaptive";
    s.reactor.fixedOxygenFraction??=1;
    s.feed.maxRateMlMin??=null;
    const {reactor:r,biology:b,process:p,product}=s;
    const failures=createFailureState(s);
    const stepSize=integrationStep(s), events=[p.duration,s.feed.start];
    if(["recombinant","secreted"].includes(product.type)) events.push(product.inductionTime);
    let time=0,V=r.initialVolume,MX=p.initialBiomass*V,MS=s.medium.effectiveCarbon*V,MA=0,MP=0,MD=0;
    let nonviableBiomass=0;
    let acid=(p.phSetpoint-(p.initialPh??p.phSetpoint))*p.bufferCapacity*V;
    let currentPh=p.initialPh??p.phSetpoint;
    let C=airOxygenSaturation(p.temperature,r.operatingPressure)*p.initialDo/100;
    let filteredDo=p.initialDo, controls=controllerSettings(s,0);
    let doController={integral:0,output:0};
    let cumulativeFeed=0,cumulativeBase=0,cumulativeAcid=0,cumulativeOutflow=0,substrateInFeed=0,substrateOut=0,biomassOut=0,productOut=0,acetateOut=0,degradedOut=0;
    let substrateConsumed=0,oxygenConsumedMmol=0,oxygenTransferredMmol=0,cumulativeGasL=0,cumulativeInletOxygenMol=0,carbonDioxideG=0;
    let oxygenOutMmol=0,acidOutMmol=0,acidGeneratedMmol=0,baseAddedMmol=0,acidAddedMmol=0;
    const initialOxygenMmol=C*V,initialAcidMmol=acid,initialSubstrate=MS,initialBiomass=MX;
    let oxygenLimitedHours=0,cascadeLimitedHours=0,pumpLimitedHours=0,phDeviationHours=0,washoutHours=0,baseLimitedHours=0,acidLimitedHours=0;
    let peakAcetate=0,peakOur=0,peakOtr=0,peakFeedRate=0,peakVolume=V;
    const volumeTolerance=1e-9*Math.max(1,r.maxWorkingVolume);
    let workingVolumeExceededAt=V>r.maxWorkingVolume+volumeTolerance?0:null;
    let stoppedReason="Process duration reached",lastRates=null,lastTrace=null;
    const records=[];
    const failureMetrics=()=>({volume:V,ph:currentPh,substrateConcentration:MS/V,acetateConcentration:MA/V,
      dissolvedOxygen:C/airOxygenSaturation(lastRates?.temperature??p.temperature,r.operatingPressure)*100,
      tipSpeed:Math.PI*r.impellerDiameter*controls.rpm/60,growthRate:lastRates?.mu??0,substrateUptake:lastRates?.qS??0});
    updateFailureState(s,failures,failureMetrics(),0,0);
    const snapshot=()=>({time,volume:V,workingVolumeExcess:Math.max(0,V-r.maxWorkingVolume),peakVolume,workingVolumeExceededAt,
      viableBiomassMass:MX-nonviableBiomass,nonviableBiomassMass:nonviableBiomass,
      cultureFailed:failures.cultureFailed,batchFailed:failures.batchFailed,stressMultiplier:failures.stressMultiplier,
      biomassMass:MX,substrateMass:MS,productMass:MP,acetateMass:MA,degradedProductMass:MD,
      biomassConcentration:MX/V,substrateConcentration:MS/V,productConcentration:MP/V,acetateConcentration:MA/V,
      oxygen:C,ph:currentPh,acidExcessMmol:acid,filteredDo,doIntegral:doController.integral,doControllerOutput:doController.output,
      ...controls,cumulativeFeed,cumulativeBase,cumulativeAcid,cumulativeOutflow,
      substrateInFeed,substrateOut,biomassOut,productOut,acetateOut,substrateConsumed,oxygenConsumedMmol,oxygenTransferredMmol,
      cumulativeGasL,cumulativeInletOxygenMol,carbonDioxideG,oxygenLimitedHours,cascadeLimitedHours,pumpLimitedHours,phDeviationHours,
      washoutHours,peakAcetate,peakOur,peakOtr,peakFeedRate,baseLimitedHours,acidLimitedHours});
    function addRecord() {
      const temperature=lastRates?.temperature??p.temperature, reference=airOxygenSaturation(temperature,r.operatingPressure);
      const raw=product.type==="biomass"?MX:MP;
      records.push({time,volume:V,workingVolumeExcess:Math.max(0,V-r.maxWorkingVolume),biomassConcentration:MX/V,totalBiomass:MX,substrateConcentration:MS/V,
        viableBiomassConcentration:(MX-nonviableBiomass)/V,nonviableBiomassConcentration:nonviableBiomass/V,
        cultureFailed:failures.cultureFailed,batchFailed:failures.batchFailed,invalidExtrapolation:failures.invalidExtrapolation,
        stressMultiplier:failures.stressMultiplier,acceptedProduct:failures.batchFailed?0:
          (raw+(product.type==="biomass"?biomassOut:productOut))*product.recoverableFraction,
        productConcentration:raw/V*product.recoverableFraction,totalProduct:raw*product.recoverableFraction,
        acetateConcentration:MA/V,dissolvedOxygen:C/reference*100,ph:currentPh,growthRate:lastRates?.mu??0,
        substrateUptake:lastRates?.qS??0,rpm:controls.rpm,vvm:controls.vvm,oxygenFraction:controls.oxygenFraction*100,
        filteredDo,doControllerOutput:doController.output,doIntegral:doController.integral,
        kla:lastRates?.kla??powerAndKla(r,V,controls.rpm,controls.vvm).kla,otr:lastRates?.otr??0,our:lastRates?.our??0,
        feedRateMlMin:(lastRates?.feedRateLh??0)/.06,cumulativeFeed,cumulativeBase,cumulativeAcid,cumulativeOutflow,
        harvestedProduct:(product.type==="biomass"?biomassOut:productOut)*product.recoverableFraction,
        cumulativeGas:cumulativeGasL,acidExcessMmol:acid,oxygenConsumedMmol,carbonDioxideG});
    }
    function removeBroth(amount) {
      const fraction=Math.min(1,amount/V);
      substrateOut+=MS*fraction;biomassOut+=MX*fraction;productOut+=MP*fraction;acetateOut+=MA*fraction;degradedOut+=MD*fraction;
      MS*=1-fraction;MX*=1-fraction;MP*=1-fraction;MA*=1-fraction;MD*=1-fraction;
      nonviableBiomass*=1-fraction;
      oxygenOutMmol+=C*amount;acidOutMmol+=acid*fraction;acid*=1-fraction;
      V-=amount;cumulativeOutflow+=amount;
    }
    addRecord(); yield {kind:"initial",state:snapshot()};
    let step=0,nextRecord=.1;
    while(time<p.duration-1e-10) {
      let dt=Math.min(stepSize,p.duration-time);
      for(const event of events) if(event>time+1e-10) dt=Math.min(dt,event-time);
      if(++step>500005) throw new Error("Internal interval limit exceeded.");
      const index=step-1, before=snapshot();
      const trace={index,dt,before,nodes:{}},capture=(id,value)=>trace.nodes[id]=value;
      const induced=["recombinant","secreted"].includes(product.type)&&time+1e-10>=product.inductionTime;
      const temperature=induced?product.postInductionTemperature:p.temperature;
      const reference=airOxygenSaturation(temperature,r.operatingPressure),doPercent=C/reference*100;
      capture("environment",{actualTemperature:temperature,induced,oxygenReference:reference,doPercent,oxygen:C,ph:currentPh,time});
      const sensorResponse=1-Math.exp(-dt*3600/p.doSensorTimeSeconds),actuatorResponse=1-Math.exp(-dt*3600/p.doActuatorTimeSeconds);
      filteredDo+=(doPercent-filteredDo)*sensorResponse;
      doController=updateDoController(s,filteredDo,doController,dt);
      const requested=doController.requested;
      for(const key of ["rpm","vvm","oxygenFraction"]) controls[key]+=(requested[key]-controls[key])*actuatorResponse;
      capture("controller",{filteredDo,doPercent,...doController,requested:{...requested},...controls,doSetpoint:p.doSetpoint,
        sensorResponse,actuatorResponse,kp:p.doKp,integralTimeSeconds:p.doIntegralTimeSeconds,
        sensorTimeSeconds:p.doSensorTimeSeconds,actuatorTimeSeconds:p.doActuatorTimeSeconds});
      const preS=MS/V,feedRequest=feedRateLh(s,time,doPercent,preS,V);
      const feedRate=feedRequest.applied;
      if(!Number.isFinite(feedRate)) throw new Error("Feed schedule exceeded the numerical range. Reduce the feed exponent or duration.");
      if(feedRequest.requested>feedRequest.applied+1e-10) pumpLimitedHours+=dt;
      peakFeedRate=Math.max(peakFeedRate,feedRate/.06);
      capture("feed",{requestedMlMin:feedRequest.requested/.06,pumpAppliedMlMin:feedRequest.applied/.06,appliedMlMin:feedRate/.06,
        pumpMaximumMlMin:s.feed.maxRateMlMin,
        feedRate,substrateBeforeFeed:preS,doPercent,pumpLimited:feedRequest.requested>feedRequest.applied+1e-10,
        volumeLimited:false,active:feedRate>0,strategy:s.feed.strategy});
      const inflowVolume=feedRate*dt,outflowVolume=p.type==="continuous"?inflowVolume:0;
      if(outflowVolume>=V) throw new Error("Continuous turnover exceeds one interval; reduce the time step.");
      if(outflowVolume>0) removeBroth(outflowVolume);
      const oxygenMass=C*V;
      V+=inflowVolume;C=oxygenMass/V;MS+=inflowVolume*s.feed.effectiveCarbon;
      substrateInFeed+=inflowVolume*s.feed.effectiveCarbon;cumulativeFeed+=inflowVolume;
      currentPh=p.phSetpoint-acid/(p.bufferCapacity*V);
      const X=(MX-nonviableBiomass)/V,S=MS/V,A=MA/V,oldMX=MX-nonviableBiomass,oldMS=MS,oldMP=MP,oldMA=MA,flowV=V,oldC=C;
      capture("flows",{inflowVolume,outflowVolume,substrateAdded:inflowVolume*s.feed.effectiveCarbon,volume:V,oxygen:C,ph:currentPh,
        biomassMass:MX,substrateMass:MS,acetateMass:MA,productMass:MP,X,S,A});
      const appliedStressMultiplier=failures.stressMultiplier;
      const plan=solveReactions(s,{V,MX:oldMX,MS,MA,C},{actualTemperature:temperature,oxygenReference:reference,ph:currentPh,induced,
        stressMultiplier:appliedStressMultiplier},controls,dt);
      const q=plan.q,biomassGrowth=q.mu*oldMX*dt,acetateProduced=q.acetate*oldMX*dt,acetateUsed=q.reuse*oldMX*dt;
      const acetateBiomass=q.acetateBiomass*oldMX*dt,productFormed=q.product*oldMX*dt;
      const co2Produced=q.carbonGas*oldMX*dt/(12.011/44.0095);
      capture("growth",{substrateTerm:q.growthS,oxygenTerm:q.fO,acetateInhibition:1/(1+A/8),burden:induced?product.burdenFactor:1,
        temperatureFactor:temperatureFactor(temperature,b.optimalTemperature),phFactor:phFactor(currentPh,b.optimalPh),
        mu:q.mu,unrestrictedMu:q.potential,qS:q.substrate,requestedSubstrateUse:q.substrate*oldMX*dt,substrateUse:plan.substrateUse,
        availabilityFactor:q.capacity,oxygen:plan.oxygenAfter,ph:currentPh,X,S:plan.solvedSubstrate,A,
        biomassUsed:oldMX,muMax:b.muMax,yxS:plan.Y,maintenance:b.maintenance,substrateThreshold:b.substrateThreshold??0});
      MX+=biomassGrowth;MS=Math.max(0,MS-plan.substrateUse);substrateConsumed+=plan.substrateUse;
      capture("biomass",{biomassGrowth,substrateUse:plan.substrateUse,biomassMass:MX,substrateMass:MS});
      MX+=acetateBiomass;MA=Math.max(0,MA+acetateProduced-acetateUsed);
      capture("acetate",{enabled:b.enableOverflow,qS:q.substrate,threshold:b.overflowThreshold,acetateProduced,acetateUsed,
        acetateBiomass,acetateMass:MA,biomassMass:MX,S,A});
      MP=(MP+productFormed)*Math.exp(-product.degradation*dt);
      const productDegraded=oldMP+productFormed-MP;MD+=productDegraded;
      capture("product",{active:plan.active,qP:q.product,productFormed,productDegraded,productMass:MP,biomassUsed:oldMX,
        mu:q.mu,alpha:product.alpha,beta:product.beta,degradation:product.degradation,substrateYield:plan.Yp,substrateForProduct:productFormed/plan.Yp});
      const phBefore=currentPh,acidEquivalentMmol=(biomassGrowth+acetateBiomass)*.45+(acetateProduced-acetateUsed)/60.05*1000;
      acid+=acidEquivalentMmol;acidGeneratedMmol+=acidEquivalentMmol;
      const baseRequired=p.phMode==="controlled"&&p.baseNormality>0?Math.max(0,acid)/(p.baseNormality*1000):0;
      const acidRequired=p.phMode==="controlled"&&p.acidNormality>0?Math.max(0,-acid)/(p.acidNormality*1000):0;
      // Both requests use the same signed inventory, so only one pump can dose per interval.
      // Continuous level control withdraws mixed broth after titrant addition.
      // Working volume is a reporting threshold, never a titrant or nutrient-feed cap.
      const baseDelivered=Math.min(baseRequired,p.maxBaseRate*.06*dt);
      const acidDelivered=Math.min(acidRequired,p.maxAcidRate*.06*dt);
      if(baseRequired>baseDelivered+1e-12) baseLimitedHours+=dt;
      if(acidRequired>acidDelivered+1e-12) acidLimitedHours+=dt;
      acid-=baseDelivered*p.baseNormality*1000;baseAddedMmol+=baseDelivered*p.baseNormality*1000;
      acid+=acidDelivered*p.acidNormality*1000;acidAddedMmol+=acidDelivered*p.acidNormality*1000;
      const oxygenAfterReactionMass=plan.oxygenAfter*V;
      V+=baseDelivered+acidDelivered;cumulativeBase+=baseDelivered;cumulativeAcid+=acidDelivered;C=oxygenAfterReactionMass/V;
      let baseOutflow=0,acidOutflow=0;
      if(p.type==="continuous"&&baseDelivered+acidDelivered>0) {
        baseOutflow=baseDelivered;acidOutflow=acidDelivered;removeBroth(baseOutflow+acidOutflow);
      }
      currentPh=p.phSetpoint-acid/(p.bufferCapacity*V);
      capture("ph",{acidEquivalentMmol,baseRequired,baseDelivered,acidRequired,acidDelivered,acidUnmet:acid,phBefore,phAfter:currentPh,volume:V,
        biomassGrowth:biomassGrowth+acetateBiomass,acetateProduced,setpoint:p.phSetpoint,optimum:b.optimalPh,mode:p.phMode,
        baseNormality:p.baseNormality,acidNormality:p.acidNormality,bufferCapacity:p.bufferCapacity,baseOutflow,acidOutflow});
      const our=plan.oxygenUsed/(flowV*dt),otr=plan.transfer/(flowV*dt);
      capture("oxygen",{...plan.system,cStar:plan.cStar,oxygenReference:reference,our,otr,oxygenBefore:oldC,
        oxygenUnclipped:plan.oxygenAfter,oxygenAfter:C,doAfter:C/reference*100,clipped:false,
        equilibrium:plan.system.kla>0?plan.cStar-our/plan.system.kla:0,biomassConcentrationUsed:X,mu:q.mu,volumeUsed:flowV,
        qO2Max:b.qO2Max,...controls,oxygenUsed:plan.oxygenUsed,oxygenTransferred:plan.transfer,oxygenAfterReaction:plan.oxygenAfter});
      oxygenConsumedMmol+=plan.oxygenUsed;oxygenTransferredMmol+=plan.transfer;
      cumulativeGasL+=plan.gasL;cumulativeInletOxygenMol+=plan.gasO2/1000;carbonDioxideG+=co2Produced;
      const finalDO=C/reference*100;
      if(finalDO<p.doSetpoint*.5) oxygenLimitedHours+=dt;
      if(finalDO<p.doSetpoint && controls.rpm>=r.maxRpm*.98 && controls.vvm>=r.maxVvm*.98 && controls.oxygenFraction>=inletOxygenLimit(r)*.98) cascadeLimitedHours+=dt;
      if(Math.abs(currentPh-p.phSetpoint)>.2) phDeviationHours+=dt;
      if(p.type==="continuous"&&q.mu<s.feed.dilutionRate) washoutHours+=dt;
      peakAcetate=Math.max(peakAcetate,MA/V);peakOur=Math.max(peakOur,our);peakOtr=Math.max(peakOtr,otr);
      time=Math.min(p.duration,time+dt);
      for(const event of events) if(Math.abs(time-event)<1e-10) time=event;
      peakVolume=Math.max(peakVolume,V);
      if(workingVolumeExceededAt===null&&V>r.maxWorkingVolume+volumeTolerance) workingVolumeExceededAt=time;
      lastRates={mu:q.mu,qS:q.substrate,kla:plan.system.kla,otr,our,feedRateLh:feedRate,temperature};
      const priorFailureCount=failures.events.length;
      updateFailureState(s,failures,failureMetrics(),dt,time);
      if(failures.cultureFailed) {
        nonviableBiomass=MX;
        lastRates.mu=0;lastRates.qS=0;
      }
      capture("failures",{enabled:failures.enabled,profile:failures.profile.id,appliedStressMultiplier,
        nextStressMultiplier:failures.stressMultiplier,cultureFailed:failures.cultureFailed,batchFailed:failures.batchFailed,
        invalidExtrapolation:failures.invalidExtrapolation,newEvents:failures.events.slice(priorFailureCount),
        viableBiomassMass:MX-nonviableBiomass,nonviableBiomassMass:nonviableBiomass});
      let stop=null;
      if(!p.strictFailures&&(currentPh<0||currentPh>14)) stop="pH outside the supported 0–14 range";
      else if(p.harvestCondition==="substrate"&&p.type==="batch"&&time>.5&&MS/V<.01) stop="Substrate exhaustion condition reached";
      // Legacy volume-harvest scenarios now continue to duration, with an excess warning.
      else if(time>=p.duration-1e-10) stop="Process duration reached";
      if(time>=nextRecord-1e-10||stop||failures.events.length>priorFailureCount) {addRecord();while(nextRecord<=time+1e-10)nextRecord+=.1;}
      trace.after=snapshot();trace.nodes.totals={gasVolumeL:plan.gasL,oxygenUsed:plan.oxygenUsed,co2Produced,time,
        cumulativeFeed,cumulativeBase,cumulativeAcid,cumulativeOutflow,oxygenLimitedHours,phDeviationHours,pumpLimitedHours,
        workingVolumeExcess:Math.max(0,V-r.maxWorkingVolume),peakVolume,workingVolumeExceededAt};
      trace.stopReason=stop;lastTrace=trace;
      const wanted=options.traceStep===index || (options.traceTime!==undefined && time>options.traceTime+1e-10);
      yield {kind:"step",index,time,trace:wanted?trace:null};
      if(stop){stoppedReason=stop;break;}
    }
    if(records.at(-1).time<time-1e-10)addRecord();
    const inProduct=product.type==="biomass"?MX:MP,exported=product.type==="biomass"?biomassOut:productOut;
    const recoverableProduct=(inProduct+exported)*product.recoverableFraction;
    const substrateInput=initialSubstrate+substrateInFeed;
    const carbonInput=substrateInput*.4+initialBiomass*.5;
    const carbonAccounted=(MS+substrateOut+MA+acetateOut)*.4+
      (MX+biomassOut+MP+productOut+MD+degradedOut)*.5+carbonDioxideG*(12.011/44.0095);
    const warnings=validation.warnings.map(message=>({severity:"low",title:"Model scope",message}));
    const warn=(test,title,message,severity="medium")=>{if(test)warnings.push({severity,title,message});};
    const maxWorkingVolumeExcess=Math.max(0,peakVolume-r.maxWorkingVolume);
    const maxWorkingVolumeExcessPercent=100*maxWorkingVolumeExcess/r.maxWorkingVolume;
    const display=value=>Number(value.toPrecision(6)).toString();
    warn(workingVolumeExceededAt!==null,"Maximum working volume exceeded",
      `Peak volume ${display(peakVolume)} L exceeded the ${display(r.maxWorkingVolume)} L limit by ${display(maxWorkingVolumeExcess)} L (${display(maxWorkingVolumeExcessPercent)}%). First exceeded at ${display(workingVolumeExceededAt??0)} h. Volume did not cap dosing or stop the run. Results beyond this limit are extrapolations; physical overflow/spillage is not modeled.`,"high");
    warn(peakVolume>r.totalVolume+volumeTolerance,"Total vessel volume exceeded",
      `Peak volume ${display(peakVolume)} L exceeded the ${display(r.totalVolume)} L total vessel volume by ${display(Math.max(0,peakVolume-r.totalVolume))} L (${display(100*Math.max(0,peakVolume-r.totalVolume)/r.totalVolume)}%). The modeled liquid could not physically fit in this vessel; the calculation continues without modeling spillage.`,"high");
    warn(oxygenLimitedHours>.2,"Oxygen limitation","DO below half the setpoint for "+round(oxygenLimitedHours,2)+" h.");
    warn(cascadeLimitedHours>.1,"DO cascade exhausted","Configured transfer controls reached their limits.");
    warn(pumpLimitedHours>.1,"Feed pump limited","Feed requests exceeded pump capacity.");
    warn(baseLimitedHours>0,"Base limited","Base requests exceeded the configured pump capacity.");
    warn(acidLimitedHours>0,"Acid limited","Acid requests exceeded the configured pump capacity.");
    warn(phDeviationHours>.1,"pH control insufficient","Residual acidity or alkalinity caused deviation from the pH setpoint.");
    warn(peakAcetate>4,"Overflow-metabolite accumulation","Acetate exceeded 4 g/L.");
    warn(washoutHours>.5,"Washout risk","Growth remained below the configured dilution rate.");
    const summary={stoppedReason,finalTime:time,finalVolume:V,peakVolume,maxWorkingVolumeExcess,maxWorkingVolumeExcessPercent,workingVolumeExceededAt,
      strictFailures:failures.enabled,failureProfile:failures.profile.name,cultureFailed:failures.cultureFailed,
      batchFailed:failures.batchFailed,invalidExtrapolation:failures.invalidExtrapolation,failureEventCount:failures.events.length,
      acceptedProduct:failures.batchFailed?0:recoverableProduct,viableBiomass:MX-nonviableBiomass,nonviableBiomass,
      finalBiomassConcentration:MX/V,totalBiomass:MX,
      finalSubstrateConcentration:MS/V,finalAcetateConcentration:MA/V,finalProductTiter:inProduct/V*product.recoverableFraction,
      recoverableProduct,productYield:substrateConsumed>0?recoverableProduct/substrateConsumed:0,
      biomassYieldObserved:substrateConsumed>0?(MX+biomassOut-initialBiomass)/substrateConsumed:0,
      cumulativeFeed,cumulativeBase,cumulativeAcid,cumulativeOutflow,initialSubstrate,substrateInFeed,substrateConsumed,residualSubstrate:MS,substrateOut,
      balanceClosure:substrateInput>0?(MS+substrateOut+substrateConsumed)/substrateInput*100:100,
      carbonBalanceClosure:carbonInput>0?carbonAccounted/carbonInput*100:100,
      carbonBalanceResidualG:carbonAccounted-carbonInput,
      oxygenBalanceResidualMmol:initialOxygenMmol+oxygenTransferredMmol-oxygenConsumedMmol-oxygenOutMmol-C*V,
      acidBalanceResidualMmol:initialAcidMmol+acidGeneratedMmol+acidAddedMmol-baseAddedMmol-acidOutMmol-acid,
      degradedProductMass:MD,oxygenConsumedMmol,oxygenTransferredMmol,cumulativeGasL,cumulativeInletOxygenMol,carbonDioxideG,
      oxygenLimitedHours,cascadeLimitedHours,pumpLimitedHours,phDeviationHours,baseLimitedHours,acidLimitedHours,
      peakAcetate,peakOur,peakOtr,peakFeedRate,integrationStep:stepSize,intervalCount:step};
    return {modelVersion:MODEL_VERSION,assumptions:{...ASSUMPTIONS},scenario:s,records,warnings,summary,lastTrace,
      failures:{enabled:failures.enabled,profile:failures.profile,events:failures.events}};
  }
  function simulate(s) {const it=createSimulation(s);let next=it.next();while(!next.done)next=it.next();const r=next.value;delete r.lastTrace;return r;}
  function createInitialState(s) {const it=createSimulation(s);const state=it.next().value.state;it.return();return state;}
  function inspect(s,options,requestedStep) {
    const it=createSimulation(s,options),initialState=it.next().value.state;
    let next=it.next();
    while(!next.done) {
      if(next.value.trace){it.return();return {initialState,trace:next.value.trace,requestedStep,actualStep:next.value.index,
        clamped:requestedStep!==undefined&&requestedStep!==next.value.index,duration:s.process.duration};}
      next=it.next();
    }
    const trace=next.value.lastTrace;
    if(!trace)throw new Error("No calculation interval is available.");
    return {initialState,trace,requestedStep,actualStep:trace.index,clamped:true,duration:s.process.duration};
  }
  function inspectStep(s,step=0) {
    if(!Number.isFinite(step)||step<0)throw new Error("Choose a nonnegative interval index.");
    return inspect(s,{traceStep:Math.floor(step)},step);
  }
  function inspectTime(s,time=0) {
    if(!Number.isFinite(time)||time<0)throw new Error("Choose a nonnegative time.");
    return inspect(s,{traceTime:time});
  }
  return {MODEL_VERSION,ASSUMPTIONS,DO_DEFAULTS,IMPELLERS,SPARGER_FACTORS,concentrationGL,effectiveCarbon,sumRole,hasComplex,
    failureProfile,failureRules,createFailureState,updateFailureState,
    growthYield,integrationStep,validateScenario,powerAndKla,inletOxygenLimit,controllerSettings,updateDoController,feedRateLh,temperatureFactor,phFactor,
    airOxygenSaturation,simulate,createSimulation,createInitialState,inspectStep,inspectTime};
});
