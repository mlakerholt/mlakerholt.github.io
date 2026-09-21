/* Feed-planning estimates. Does not alter the simulation engine or input scenario. */
(function(root,factory) {
  const api=factory(typeof module==='object'&&module.exports?require('./simulation-core.js'):root.FermentationModel);
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.FermentationFeedDerivation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(model) {
  'use strict';
  const VERSION='2026-09-21.1';
  const OXYGEN_FRACTION=.8, HEADROOM_FRACTION=.9, KINETIC_FRACTION=.8, GROWTH_FRACTION=.6;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const initial=s=>({time:0,volume:s.reactor.initialVolume,
    biomassMass:s.process.initialBiomass*s.reactor.initialVolume,
    substrateConcentration:s.medium.effectiveCarbon,ph:s.process.initialPh??s.process.phSetpoint});
  const compact=x=>({time:x.time,volume:x.volume,biomassMass:x.viableBiomassMass??x.biomassMass,
    substrateConcentration:x.substrateConcentration,ph:x.ph});
  function batchKey(s) {
    // Feed settings/composition do not affect this no-feed calculation.
    return JSON.stringify([s.reactor,s.biology,s.product,s.process,s.medium]);
  }
  function estimateBatch(s) {
    const threshold=Math.max(.1,(s.biology.substrateThreshold??0)+s.biology.ks);
    const start=initial(s),points=[start];
    if(s.process.type!=='fed-batch') return {threshold,points,start:s.process.type==='continuous'?start:null,horizon:0};
    if(!(start.biomassMass>0)) return {threshold,points,start:null,horizon:0,reason:'No inoculum: a feed-start biomass cannot be estimated.'};
    const batch=copy(s);
    Object.assign(batch.process,{type:'batch',harvestCondition:'duration',timeStep:.001,duration:Math.min(s.process.duration,480)});
    const it=model.createSimulation(batch,{traceTime:-1});
    let next=it.next(),depleted=start.substrateConcentration<=threshold?start:null,nextPoint=.1,last=start;
    while(!(next=it.next()).done) {
      const after=next.value.trace.after;last=compact(after);
      if(!depleted&&after.substrateConcentration<=threshold) depleted=last;
      if(after.time>=nextPoint-1e-9) {points.push(last);nextPoint+=.1;}
    }
    if(points.at(-1).time<last.time) points.push(last);
    return {threshold,points,start:depleted,horizon:last.time,
      reason:depleted?null:`Carbon-low threshold not reached within ${last.time.toFixed(1)} h; no feed-start recommendation.`};
  }
  function stateAt(batch,time) {
    if(time<0||time>batch.horizon+1e-8) return null;
    const right=batch.points.findIndex(x=>x.time>=time);
    if(right<0) return batch.points.at(-1);
    if(right===0) return batch.points[0];
    const a=batch.points[right-1],b=batch.points[right],f=(time-a.time)/(b.time-a.time);
    return Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+f*(b[k]-a[k])]));
  }
  function demand(s,mu,active) {
    const Y=model.growthYield(s.biology),Yp=s.product.substrateYield??model.ASSUMPTIONS.productYield;
    const qP=active?s.product.alpha*mu+s.product.beta:0;
    const growth=mu/Y,maintenance=s.biology.maintenance,product=qP/Yp;
    const qS=growth+maintenance+product,a=model.ASSUMPTIONS;
    const qO=Math.max(0,(a.substrateReduction*a.substrateCarbon*qS-
      a.biomassReduction*a.biomassCarbon*mu-a.productReduction*a.productCarbon*qP)/4/12.011*1000);
    return {Y,Yp,qP,qS,qO,growth,maintenance,product};
  }
  function capacity(s,volume,temperature) {
    const r=s.reactor,p=model.powerAndKla(r,volume,r.maxRpm,r.maxVvm);
    const oxygenFraction=model.inletOxygenLimit(r);
    const ref=model.airOxygenSaturation(temperature,r.operatingPressure),cStar=ref*oxygenFraction/.21;
    const cSet=ref*s.process.doSetpoint/100;
    const inlet=r.maxVvm*60*oxygenFraction/24*1000;
    return {...p,oxygenFraction,cStar,cSet,inlet,otr:Math.max(0,Math.min(p.kla*(cStar-cSet),inlet))};
  }
  function growthBasis(s,preferredMu,ph=s.process.initialPh??s.process.phSetpoint) {
    const {biology:b,process:p,reactor:r,product}=s;
    const induced=['recombinant','secreted'].includes(product.type);
    const active=product.type!=='biomass'&&(!induced||product.inductionTime<p.duration);
    const temperatures=induced&&active?[p.temperature,product.postInductionTemperature]:[p.temperature];
    const temperature=Math.max(...temperatures);
    const ref=model.airOxygenSaturation(temperature,r.operatingPressure),cSet=ref*p.doSetpoint/100;
    const environmental=Math.min(...temperatures.map(t=>model.temperatureFactor(t,b.optimalTemperature)))*
      model.phFactor(ph,b.optimalPh)*cSet/(.006+cSet)*(induced&&active?product.burdenFactor:1);
    const hasPreset=Number.isFinite(preferredMu)&&preferredMu>0;
    const nominal=hasPreset?preferredMu:GROWTH_FRACTION*b.muMax;
    return {maxMu:b.muMax,nominal,nominalSource:hasPreset?'organism preset target':'60% of organism μmax (planning heuristic)',
      nominalPercent:100*nominal/b.muMax,conditionLimit:b.muMax*environmental,
      kinetic:KINETIC_FRACTION*b.muMax*environmental,temperature,active};
  }
  function growthWarnings(s,basis,plan) {
    const continuous=s.process.type==='continuous';
    if(!continuous&&(s.process.type!=='fed-batch'||s.feed.strategy!=='exponential'))return [];
    const target=continuous?s.feed.dilutionRate:s.feed.targetGrowthRate;
    if(!Number.isFinite(target)||target<0||!Number.isFinite(basis.maxMu)||basis.maxMu<=0)return [];
    const label=continuous?'Dilution rate D':'Target μset',display=n=>Number(n.toPrecision(5));
    if(target>basis.maxMu+1e-10)return [`${label} (${display(target)} h⁻¹) exceeds the organism’s μmax (${display(basis.maxMu)} h⁻¹). The model cannot achieve this growth target. Your entered value is retained.`];
    if(Number.isFinite(basis.conditionLimit)&&target>basis.conditionLimit+1e-10)
      return [`${label} (${display(target)} h⁻¹) exceeds the condition-adjusted kinetic upper bound (${display(basis.conditionLimit)} h⁻¹). Temperature, pH, DO and scheduled expression burden reduce the modeled growth capability. Your entered value is retained.`];
    if(plan?.ok&&target>plan.mu+1e-6)
      return [`${label} is above the planning recommendation (${display(plan.mu)} h⁻¹; limiting: ${plan.limiting.join(', ')}). This recommendation includes planning margins, not just biological limits. Use Apply derived values to adopt it.`];
    return [];
  }
  function derive(s,batch,preferredMu) {
    const p=s.process,r=s.reactor,b=s.biology,f=s.feed,product=s.product;
    const errors=model.validateScenario(s).errors;
    if(errors.length) return {ok:false,reason:errors[0]};
    if(p.type==='batch') return {ok:false,reason:'Batch mode: nutrient feed is disabled. No feed parameters are applied.'};
    if(!(f.effectiveCarbon>0)) return {ok:false,reason:'The feed needs a positive glucose-equivalent carbon concentration.'};
    const start=p.type==='continuous'?initial(s):batch.start;
    if(!start) return {ok:false,reason:batch.reason||'A feed-start state is not available.'};
    if(!(start.biomassMass>0)) return {ok:false,reason:'No biomass is available at feed start.'};
    const horizon=p.duration-start.time;
    if(horizon<=0) return {ok:false,reason:'Estimated feed start is at or beyond the process duration.'};
    const growth=growthBasis(s,preferredMu,start.ph);
    const {kinetic,nominal,temperature,active}=growth;
    const overflow=b.enableOverflow?Math.max(0,(b.overflowThreshold-b.maintenance)*model.growthYield(b)):Infinity;
    const upper=Math.min(nominal,kinetic,overflow,2);
    const volumeBudget=start.volume+HEADROOM_FRACTION*Math.max(0,r.maxWorkingVolume-start.volume);
    function evaluate(mu) {
      const q=demand(s,mu,active),F0=q.qS*start.biomassMass/f.effectiveCarbon; // L/h
      const continuous=p.type==='continuous';
      const exponent=mu*horizon,gain=Math.exp(Math.min(700,exponent));
      const fedVolume=continuous?mu*start.volume*horizon:F0*(mu>1e-12?Math.expm1(Math.min(700,exponent))/mu:horizon);
      const finalVolume=continuous?start.volume:start.volume+fedVolume;
      const finalMass=continuous?start.biomassMass:start.biomassMass*gain;
      // Ideal continuous carbon balance; include initial biomass as a conservative bound.
      const X0=start.biomassMass/start.volume;
      const Xend=continuous?(q.qS>0?mu*f.effectiveCarbon/q.qS:0):finalMass/finalVolume;
      const cap0=capacity(s,start.volume,temperature),capEnd=capacity(s,finalVolume,temperature);
      const oxygenBudget=OXYGEN_FRACTION*Math.min(cap0.otr,capEnd.otr);
      const demandMax=q.qO*Math.max(X0,Xend);
      const finalRate=(continuous?mu*start.volume:F0*gain)/.06;
      const violations=[];
      if(!Number.isFinite(finalVolume)||exponent>700) violations.push('growth horizon');
      if(!continuous&&finalVolume>volumeBudget+1e-10) violations.push('vessel headroom');
      if(q.qO>b.qO2Max+1e-10) violations.push('organism respiratory capacity');
      if(demandMax>oxygenBudget+1e-10) violations.push('vessel oxygen transfer');
      if(f.maxRateMlMin!=null&&finalRate>f.maxRateMlMin+1e-10) violations.push('specified feed-pump capacity');
      return {...q,F0,initialRateMlMin:(continuous?mu*start.volume:F0)/.06,finalRate,finalVolume,
        finalMass,finalBiomass:Xend,fedVolume,cap0,capEnd,oxygenBudget,demandMax,violations};
    }
    let low=0,high=upper;
    const zero=evaluate(0);
    if(upper<.001||zero.violations.length) return {ok:false,reason:`No feasible positive growth recommendation: ${zero.violations.join(', ')||'kinetic/overflow bound below 0.001 h⁻¹'}. Current settings are unchanged.`};
    for(let i=0;i<48;i++) {const mid=(low+high)/2;if(evaluate(mid).violations.length)high=mid;else low=mid;}
    const mu=Math.floor(low*1e6)/1e6;
    if(mu<.001) return {ok:false,reason:'The planning limits permit less than 0.001 h⁻¹. No values are applied.'};
    const chosen=evaluate(mu),limiting=evaluate(mu+Math.max(1e-6,mu*.001)).violations;
    if(Math.abs(mu-upper)<2e-6) limiting.push(upper===nominal?growth.nominalSource:upper===kinetic?'kinetic allowance':upper===overflow?'overflow threshold':'supported growth-rate range');
    const currentState=p.type==='continuous'?initial(s):stateAt(batch,f.start);
    const currentMu=p.type==='continuous'?f.dilutionRate:f.targetGrowthRate;
    const currentDemand=demand(s,currentMu,active);
    const currentRequired=currentState?currentDemand.qS*currentState.biomassMass/f.effectiveCarbon/.06:null;
    const current=model.feedRateLh(s,p.duration,p.doSetpoint,0,start.volume);
    const warnings=[];
    if(currentState&&currentState.substrateConcentration>batch.threshold*2&&p.type==='fed-batch')
      warnings.push(`Current feed start precedes carbon depletion: estimated residual substrate ${currentState.substrateConcentration.toFixed(2)} g/L.`);
    if(active) warnings.push('Product demand is included throughout the planning envelope if production is active at any time during feeding.');
    if(s.biology.category?.includes('Animal')) warnings.push('Animal-cell planning uses dry-biomass/glucose equivalents; amino-acid demand and viability are not modeled.');
    if(['constant','linear','do-stat'].includes(f.strategy)&&p.type==='fed-batch') warnings.push('The capacity check uses an exponential demand envelope. Constant, linear and DO-stat profiles do not maintain a constant growth rate.');
    if(f.strategy==='do-stat'&&p.doSetpoint>=100) warnings.push('The DO setpoint leaves no higher trigger within the supported 0–100% DO-stat range.');
    return {ok:true,start,horizon,threshold:batch.threshold,previewHorizon:batch.horizon,growthBasis:growth,nominal,kinetic,overflow,
      mu,temperature,active,volumeBudget,limiting:[...new Set(limiting)],...chosen,warnings,
      current:{state:currentState,mu:currentMu,requiredRate:currentRequired,demand:currentDemand,
        requestedEndRate:current.requested/.06,appliedEndRate:current.applied/.06},
      values:{feedStart:start.time,initialFeedRate:chosen.initialRateMlMin,targetGrowthRate:mu,
        linearFeedSlope:mu*chosen.initialRateMlMin,dilutionRate:mu,doStatThreshold:Math.min(100,p.doSetpoint+15)}};
  }
  return {VERSION,OXYGEN_FRACTION,HEADROOM_FRACTION,KINETIC_FRACTION,GROWTH_FRACTION,batchKey,estimateBatch,stateAt,demand,capacity,growthBasis,growthWarnings,derive};
});
