(function(root) {
  'use strict';
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=value=>Number.isFinite(value)?Number(value.toPrecision(5)).toString():'—';
  function create({getScenario,getPreferredMu,applyValues}) {
    const api=root.FermentationFeedDerivation,box=document.getElementById('feedDerivation');
    const status=document.getElementById('feedDerivationStatus'),body=document.getElementById('feedDerivationBody');
    const button=document.getElementById('applyDerivedFeedBtn');
    let worker=null,timer=null,key=null,batch=null,sequence=0;
    function growthReadout(s,plan) {
      const growth=plan?.growthBasis||api.growthBasis(s,getPreferredMu(s));
      const continuous=s.process.type==='continuous';
      const target=continuous?s.feed.dilutionRate:s.feed.targetGrowthRate;
      const percent=Number.isFinite(growth.maxMu)&&growth.maxMu>0?100*target/growth.maxMu:NaN;
      const message=Number.isFinite(percent)?`Organism μmax: ${fmt(growth.maxMu)} h⁻¹. Selected ${continuous?'D':'μset'}: ${fmt(percent)}% of μmax.`:'Enter a positive organism μmax and a valid growth target to calculate the percentage.';
      const recommendation=plan?.ok?` Recommended: ${fmt(plan.mu)} h⁻¹ (${fmt(100*plan.mu/growth.maxMu)}% of μmax); limiting: ${plan.limiting.join(', ')}.`:'';
      const warnings=api.growthWarnings(s,growth,plan);
      const readout=document.getElementById('dilutionGrowthReadout');
      if(readout)readout.textContent=continuous?message+recommendation:'';
      for(const [prefix,shown] of [['feed',!continuous],['dilution',continuous]]) {
        const warning=document.getElementById(prefix+'GrowthWarning');
        if(warning){warning.textContent='';warning.hidden=true;}
      }
    }
    function cancel() {root.clearTimeout(timer);timer=null;if(worker)worker.terminate();worker=null;sequence++;}
    function unavailable(message) {button.disabled=true;body.innerHTML='';status.textContent=message;box.setAttribute('aria-busy','false');}
    function render() {
      const s=getScenario();
      if(!batch||key!==api.batchKey(s))return;
      const d=api.derive(s,batch,getPreferredMu(s));
      growthReadout(s,d);
      if(!d.ok) {unavailable(d.reason);return;}
      button.disabled=false;box.setAttribute('aria-busy','false');
      status.textContent='Live recommendation ready. Current feed settings are unchanged until you apply it.';
      const continuous=s.process.type==='continuous',strategy=s.feed.strategy;
      const row=(label,formula,value)=>`<tr><th scope="row">${label}</th><td>${formula}</td><td>${value}</td></tr>`;
      const rows=[];
      rows.push(row('Feed start',continuous?'Continuous operation: begin at t = 0.':
        `First no-feed model state with S ≤ max(0.1, S<sub>threshold</sub> + K<sub>S</sub>) = ${fmt(d.threshold)} g/L.`,
        `${fmt(d.start.time)} h <small>Current: ${fmt(s.feed.start)} h</small>`));
      rows.push(row('Viable biomass at feed start',`M₀ = X₀ × V₀ = ${fmt(d.start.biomassMass/d.start.volume)} g/L × ${fmt(d.start.volume)} L`,`${fmt(d.start.biomassMass)} gDCW`));
      rows.push(row(continuous?'Dilution rate D':'Target specific growth rate μ<sub>set</sub>',
        `Organism μmax = ${fmt(d.growthBasis.maxMu)} h⁻¹.<br>Starting target = ${fmt(d.nominal)} h⁻¹ (${fmt(d.growthBasis.nominalPercent)}% of μmax; ${escape(d.growthBasis.nominalSource)}). Condition-adjusted kinetic upper bound = ${fmt(d.growthBasis.conditionLimit)} h⁻¹; 80% planning allowance = ${fmt(d.kinetic)} h⁻¹. Reduce as needed for respiration, overflow, oxygen, pump and volume limits over ${fmt(d.horizon)} h.<br>Limiting: ${escape(d.limiting.join(', ')||'planning bounds')}.`,
        `${fmt(d.mu)} h⁻¹ <small>${fmt(100*d.mu/d.growthBasis.maxMu)}% of μmax</small><small>Current: ${fmt(continuous?s.feed.dilutionRate:s.feed.targetGrowthRate)} h⁻¹</small>`));
      rows.push(row('Specific substrate demand',
        `q<sub>S</sub> = μ/Y<sub>X/S</sub> + m<sub>S</sub> + q<sub>P</sub>/Y<sub>P/S</sub><br>= ${fmt(d.mu)}/${fmt(d.Y)} + ${fmt(d.maintenance)} + ${fmt(d.qP)}/${fmt(d.Yp)}`,
        `${fmt(d.qS)} g/gDCW/h`));
      rows.push(row(continuous?'Initial inlet flow':'Initial feed rate F₀',continuous?
        `F₀ = D × V₀ × 1000/60 = ${fmt(d.mu)} × ${fmt(d.start.volume)} × 1000/60`:
        `F₀ = q<sub>S</sub> × M₀/S<sub>feed</sub> × 1000/60<br>= ${fmt(d.qS)} × ${fmt(d.start.biomassMass)}/${fmt(s.feed.effectiveCarbon)} × 1000/60`,
        `${fmt(d.initialRateMlMin)} mL/min <small>Current: ${fmt(continuous?s.feed.dilutionRate*s.reactor.initialVolume/.06:s.feed.initialRateMlMin)} mL/min</small>`));
      let formula=continuous?`F = D × V; matching outlet maintains volume.`:
        strategy==='exponential'?`F(t) = ${fmt(d.initialRateMlMin)} × exp[${fmt(d.mu)} × (t − ${fmt(d.start.time)})] mL/min`:
        strategy==='linear'?`F(t) = F₀ + a × (t − t₀); a = μF₀ = ${fmt(d.values.linearFeedSlope)} mL/min/h (initial exponential tangent).`:
        strategy==='constant'?`F(t) = ${fmt(d.initialRateMlMin)} mL/min after t₀. Growth rate will not remain constant.`:
        `On-rate = ${fmt(d.initialRateMlMin)} mL/min when DO ≥ ${fmt(d.values.doStatThreshold)}% and S < 0.7 g/L. Trigger = min(100, DO setpoint + 15 percentage points), a planning assumption.`;
      rows.push(row('Selected profile',formula,escape(continuous?'Continuous':strategy)));
      rows.push(row('Oxygen envelope',
        `OTR = min[kLa(C* − C<sub>set</sub>), inlet O₂]. At feed start: kLa = ${fmt(d.cap0.kla)} h⁻¹ at ${fmt(s.reactor.maxRpm)} rpm, ${fmt(s.reactor.maxVvm)} vvm, ${fmt(d.cap0.oxygenFraction*100)}% O₂ (${s.reactor.oxygenSupplyMode==='fixed'?'fixed supply':'adaptive maximum'}).<br>Budget = 80% of the lowest OTR across the planned volume range; demand = qO₂ × highest planned X.`,
        `${fmt(d.demandMax)} / ${fmt(d.oxygenBudget)} mmol/L/h <small>Demand / planning budget</small>`));
      rows.push(row('Volume envelope',continuous?'Inlet equals outlet; no feed-driven volume increase.':
        `V<sub>end</sub> = V₀ + F₀[L/h] × (exp(μΔt) − 1)/μ.<br>Use 90% of available headroom; reserve 10% for other additions.`,
        `${fmt(d.finalVolume)} L <small>${continuous?'Constant-volume estimate':`Planning ceiling: ${fmt(d.volumeBudget)} L; vessel maximum: ${fmt(s.reactor.maxWorkingVolume)} L`}</small>`));
      rows.push(row('Pump maximum','An equipment setting, not inferred from strain or vessel size. Apply leaves this field unchanged.',s.feed.maxRateMlMin==null?'Unlimited':`${fmt(s.feed.maxRateMlMin)} mL/min`));
      const current=d.current.state;
      const currentText=current&&!continuous?`At your current start (${fmt(s.feed.start)} h), the no-feed estimate gives ${fmt(current.biomassMass)} gDCW in ${fmt(current.volume)} L and ${fmt(current.substrateConcentration)} g/L residual substrate. For the current planning μ (${fmt(d.current.mu)} h⁻¹), the carbon-demand formula gives F₀ = ${fmt(d.current.requiredRate)} mL/min.`:'';
      body.innerHTML=`<p class="feed-derivation-context">${escape(s.biology.name)} · ${escape(s.reactor.name)} · initial volume ${fmt(s.reactor.initialVolume)} L · feed carbon ${fmt(s.feed.effectiveCarbon)} g/L</p>
        <div class="table-scroll"><table class="feed-derivation-table"><thead><tr><th scope="col">Parameter</th><th scope="col">Derivation using this scenario</th><th scope="col">Recommended value</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
        ${currentText?`<p>${currentText}</p>`:''}
        <details><summary>Planning assumptions and sources</summary>
          <p>The feed-start estimate runs the same simulation engine without nutrient feed, at 3.6-second intervals, up to ${fmt(batch.horizon)} h (maximum preview horizon 480 h). The current-start readout interpolates 0.1-hour records. This is a model estimate, not a measured batch endpoint.</p>
          <p>The feeding envelope assumes carbon-limited growth, no overflow, constant yield and full maintenance demand. Product allowance uses qP = αμ + β. Observed yields are maintenance-corrected using the engine. Oxygen demand uses the engine’s carbon/electron assumptions. The kinetic allowance uses 80% of environmentally adjusted μmax; the oxygen allowance is 80% of maximum transfer. These margins and the carbon-low threshold are editable-code planning assumptions, not literature constants. No acid/base addition volume is predicted during feeding; the headroom reserve is not a guarantee.</p>
          <p>Organism targets come from the selected preset; absent a target, 60% of the current organism μmax is used as a planning heuristic, with no generic 0.16 h⁻¹ ceiling. pH is held at its estimated feed-start value for the envelope. Scheduled temperature/burden changes use conservative bounds. These estimates do not balance nitrogen, amino acids, viability or broth rheology. In exponential feeding, μset is the exponent in F(t) = F₀ exp[μset(t − t₀)]; it is a target, not guaranteed actual growth. Applying values sets an open-loop schedule, not feedback growth control; run the full simulation to check the result.</p>
          <p>Equation basis: <a href="https://journals.asm.org/doi/10.1128/AEM.05219-11" target="_blank" rel="noopener">Wenzel et al., maintenance-inclusive exponential feeding</a>; <a href="https://chemnettools.anc.univie.ac.at/FedBatchDesigner/" target="_blank" rel="noopener">FedBatchDesigner, product-inclusive substrate demand</a>. These sources support the formula structure, not this scenario’s parameter values. <a href="sources/simulation.html" target="_blank" rel="noopener">Simulation equations</a>.</p>
        </details>`;
    }
    function refresh() {
      if(!api) {unavailable('Feed derivation module unavailable. Current settings are unchanged.');return;}
      const s=getScenario(),errors=root.FermentationModel.validateScenario(s).errors;
      growthReadout(s);
      if(errors.length||s.process.type==='batch') {cancel();key=null;batch=null;unavailable(errors[0]||'Batch mode: nutrient feed is disabled.');return;}
      const nextKey=api.batchKey(s);
      if(nextKey===key) {if(batch)render();return;}
      cancel();key=nextKey;batch=null;
      unavailable('Estimating the no-feed phase for this organism, vessel and volume…');box.setAttribute('aria-busy','true');
      if(s.process.type==='continuous') {batch=api.estimateBatch(s);render();return;}
      const id=sequence;
      timer=root.setTimeout(()=>{
        if(typeof root.Worker!=='function') {unavailable('The batch estimate needs browser worker support. Current settings are unchanged.');return;}
        try {
          worker=new root.Worker('feed-derivation-worker.js?v='+api.VERSION);
          worker.onmessage=event=>{
            if(id!==sequence||event.data.id!==id)return;
            worker.terminate();worker=null;
            if(event.data.error)unavailable(event.data.error);
            else {batch=event.data.batch;render();}
          };
          worker.onerror=()=>{if(id!==sequence)return;worker.terminate();worker=null;unavailable('Could not estimate the batch phase. Current settings are unchanged.');};
          worker.postMessage({id,scenario:s});
        } catch(error) {unavailable('Could not start the batch estimate: '+error.message);}
      },250);
    }
    button.addEventListener('click',()=>{
      const s=getScenario();
      if(!batch||key!==api.batchKey(s)){refresh();return;}
      const d=api.derive(s,batch,getPreferredMu(s));
      if(!d.ok){unavailable(d.reason);return;}
      const fields=s.process.type==='continuous'?['feedStart','dilutionRate']:
        ['feedStart','initialFeedRate','targetGrowthRate',...(s.feed.strategy==='linear'?['linearFeedSlope']:[]),...(s.feed.strategy==='do-stat'?['doStatThreshold']:[])];
      applyValues(Object.fromEntries(fields.map(k=>[k,d.values[k]])));
    });
    return {refresh};
  }
  root.FermentationFeedDerivationUI={create};
})(window);
