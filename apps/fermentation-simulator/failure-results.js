/* Results-only presentation. No rule is evaluated in the input form. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id), dialog=$('failureDialog');
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=value=>Number.isFinite(value)?Number(value.toPrecision(5)).toString():'—';
  const labels={warning:'Process warning',stress:'Severe stress','batch-failure':'Batch failed','culture-failure':'Culture failed'};
  const parameters={ph:'pH',volume:'Broth volume',dissolvedOxygen:'Dissolved oxygen',substrateConcentration:'Broth substrate',
    acetateConcentration:'Acetate',tipSpeed:'Impeller tip speed'};
  const penalties={warning:'Reporting only. No dosing cap or automatic stop.',
    stress:'Growth and new-product formation potentials reduced to 25%. Multiple stress rules do not multiply the penalty. Clears after one minute of recovery.',
    'batch-failure':'Irreversible batch rejection: accepted product is zero. Cells, feed and controllers continue; physical product remains in the balance.',
    'culture-failure':'Irreversible culture death: all remaining biomass is nonviable. Growth, uptake, respiration and new product formation stop. Accepted product is zero. Feed and controllers continue.'};
  const art={
    oxygen:['The culture ordered oxygen. Apparently it was out of stock.','Surreal cleanroom scene: scientists and oversized microbial cells gasp for air around a menacing fermenter displaying DO 0%.'],
    hyperoxia:['Oxygen: excellent servant, enthusiastic saboteur.','Panicked cleanroom scientists flee a menacing, excessively bubbling fermenter surrounded by oxygen cylinders and giant floating bubbles; its display reads DO 350%.'],
    ph:['The cells requested a pH range, not a sightseeing tour.','A horrified cleanroom scientist tangled in endless pH indicator paper flees a strange fermenter with oversized acid and base vessels and a pH 3.0 display.'],
    substrate:['All-you-can-eat was not a process specification.','Hysterical cleanroom scientists flee a sinister fermenter dwarfed by a giant glucose reservoir, oversized sugar cubes and serpentine feed tubing.'],
    acetate:['Congratulations: the by-product has taken over management.','Panicked cleanroom scientists flee a menacing fermenter filled with enormous pickles as a surreal acetate metaphor; one clutches a pickle jar and the display reads ACETATE 12 g/L.'],
    starvation:['The feed menu has been reduced to wishful thinking.','A frantic cleanroom scientist searches an enormous empty feed bottle for its last drop while colleagues rush past a hungry-looking fermenter with empty reservoirs.'],
    shear:['The impeller has mistaken cell culture for smoothie preparation.','Horrified cleanroom scientists flee a monstrous fermenter with a tornado-like liquid vortex; one holds a tiny whisk while another reaches for the stop button.'],
    volume:['The vessel has declined your request for extra dimensions.','Hysterical cleanroom scientists flee a menacing, tentacle-hosed fermenter overflowing with a mountain of foam; one clutches a hopelessly small sponge.']
  };
  // Icons are code-native SVGs; category assignment does not change engine output.
  const categories=[
    {id:'oxygen',label:'Oxygen',icon:'<circle cx="8" cy="15" r="5"/><circle cx="17" cy="7" r="3"/>'},
    {id:'ph',label:'pH',icon:'<path d="M12 3C9 8 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7-7-12Z"/><path d="M8 15h8m-4-4v8"/>'},
    {id:'feed',label:'Feed & nutrients',icon:'<path d="M8 3h8M9 3v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V3M7 15h10"/>'},
    {id:'metabolites',label:'Metabolites',icon:'<circle cx="5" cy="12" r="3"/><circle cx="17" cy="5" r="3"/><circle cx="17" cy="19" r="3"/><path d="m8 10 6-4M8 14l6 4M17 8v8"/>'},
    {id:'agitation',label:'Agitation',icon:'<circle cx="12" cy="12" r="2"/><path d="M12 10V3c6 0 6 5 2 7m0 2h7c0 6-5 6-7 2m-2 0v7c-6 0-6-5-2-7m0-2H3c0-6 5-6 7-2"/>'},
    {id:'volume',label:'Volume',icon:'<path d="M5 3h14v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2ZM5 14h14M15 7h4M15 10h4"/>'},
    {id:'growth',label:'Growth',icon:'<path d="M3 3v18h18M6 17l4-5 4 2 6-9m-5 0h5v5"/>'},
    {id:'model',label:'Model notes',icon:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>'},
    {id:'other',label:'Other',icon:'<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v1"/>'}
  ];
  const eventCategories={oxygen:'oxygen',hyperoxia:'oxygen',ph:'ph',substrate:'feed',starvation:'feed',acetate:'metabolites',shear:'agitation',volume:'volume'};
  const warningCategories={'Oxygen limitation':'oxygen','DO cascade exhausted':'oxygen','Feed pump limited':'feed',
    'Base limited':'ph','Acid limited':'ph','pH control insufficient':'ph','Overflow-metabolite accumulation':'metabolites',
    'Washout risk':'growth','Maximum working volume exceeded':'volume','Total vessel volume exceeded':'volume','Model scope':'model'};
  const priority={'culture-failure':0,'batch-failure':1,stress:2,warning:3,high:3,medium:4,low:5};
  const categoryFor=(mapping,key)=>Object.hasOwn(mapping,key)?mapping[key]:'other';
  let current=null,index=0,selected=null,groups={};
  function eventOrder(){return (groups[selected]??[]).filter(item=>item.eventIndex!==undefined).map(item=>item.eventIndex);}
  function renderCategories() {
    $('warningCategoryButtons').innerHTML=categories.filter(c=>c.id!=='other'||groups.other?.length).map(c=>{
      const items=groups[c.id]??[],count=items.length;
      const severity=items.some(item=>item.rank<=3)?'high':items.some(item=>item.rank===4)?'medium':'low';
      return `<button type="button" id="warning-category-${c.id}" class="warning-category ${count?'has-warnings '+severity:'empty'}" data-warning-category="${c.id}" aria-controls="warningCategoryPanel" aria-expanded="${selected===c.id}" aria-label="${escape(c.label)}: ${count} warning${count===1?'':'s'}"${count?'':' disabled'}><span class="warning-category-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg><span class="warning-count"><span>${count}</span></span></span><span class="warning-category-label">${escape(c.label)}</span></button>`;
    }).join('');
    const category=categories.find(c=>c.id===selected),items=groups[selected]??[];
    $('warningCategoryPanel').hidden=!category;
    $('warningCategoryTitle').textContent=category?`${category.label} · ${items.length} warning${items.length===1?'':'s'}`:'';
    $('warningList').innerHTML=category?items.map(item=>{
      if(item.eventIndex!==undefined) {
        const e=current.failures.events[item.eventIndex];
        return `<article class="failure-event"><div><strong>${escape(labels[e.penalty])}: ${escape(e.title)}</strong><p>${escape(number(e.time))} h · ${escape(number(e.value))} ${escape(e.unit)} · ${escape(number(e.deviation))} ${escape(e.unit)} outside boundary</p></div><button type="button" data-failure-event="${item.eventIndex}">View process warning</button></article>`;
      }
      const w=item.warning,severity=['high','medium','low'].includes(w.severity)?w.severity:'low';
      return `<div class="warning-item ${severity}"><strong>${escape(w.title)}</strong>${escape(w.message)}</div>`;
    }).join(''):'';
  }
  function selectCategory(id) {
    if(!groups[id]?.length)return;
    selected=selected===id?null:id;
    renderCategories();$('warning-category-'+id)?.focus();
  }
  function openEvent(i) {
    const events=current?.failures?.events??[];
    const order=eventOrder(),position=order.indexOf(i);
    if(position<0)return;
    index=i;
    const event=events[index], illustration=art[event.image]??art.volume;
    $('failureDialogTitle').textContent=`${labels[event.penalty]} · ${event.title}`;
    $('failureDialogQuip').textContent=illustration[0];
    const image=$('failureDialogImage');image.hidden=false;
    image.src=`assets/failures/${Object.hasOwn(art,event.image)?event.image:'volume'}.png`;
    image.alt=illustration[1];image.onerror=()=>{image.hidden=true;};
    $('failureDialogStatus').textContent=event.resolvedAt!==null
      ?`Condition recovered at ${number(event.resolvedAt)} h.${event.penalty.includes('failure')?' Failure remains latched.':''}`
      :'Condition was still active at the end of the run.';
    const threshold=Array.isArray(event.limit)?event.limit.map(number).join('–'):number(event.limit);
    const direction=event.value<event.threshold?'below':'above';
    const rows=[['Rule profile',current.failures.profile.name],['Triggered at',`${number(event.time)} h`],
      ['Parameter',parameters[event.parameter]??event.parameter],['Value at trigger',`${number(event.value)} ${event.unit}`],
      ['Rule boundary',`${event.comparison} ${threshold} ${event.unit}`],
      ['Excursion at trigger',`${number(event.deviation)} ${event.unit} ${direction} boundary${event.parameter==='volume'?` (${number(event.deviationPercent)}%)`:''}`],
      ['Required exposure',event.hours?`${number(event.hours*60)} min`:'Immediate'],
      ['Exposure at trigger',`${number(event.triggerExposureHours*60)} min`],
      ['Total out-of-range exposure in episode',`${number(event.exposureHours*60)} min`],
      ['Worst measured value in episode',`${number(event.worstValue)} ${event.unit}`],
      ['Largest excursion in episode',`${number(event.worstDeviation)} ${event.unit}`]];
    $('failureDialogData').innerHTML=rows.map(([k,v])=>`<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`).join('');
    $('failureDialogPenalty').textContent=penalties[event.penalty]+(event.id==='total-volume'?' Subsequent values are invalid physical extrapolations; no spillage model is applied.':'');
    $('failureDialogPosition').textContent=`Event ${position+1} of ${order.length} in ${categories.find(c=>c.id===selected).label}`;
    $('failureDialogPrevious').disabled=position===0;
    $('failureDialogNext').disabled=position===order.length-1;
    if(!dialog.open)dialog.showModal();
  }
  $('failureDialogClose').addEventListener('click',()=>dialog.close());
  $('failureDialogPrevious').addEventListener('click',()=>{const order=eventOrder();openEvent(order[order.indexOf(index)-1]);});
  $('failureDialogNext').addEventListener('click',()=>{const order=eventOrder();openEvent(order[order.indexOf(index)+1]);});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  $('warningCategoryButtons').addEventListener('click',event=>{
    const button=event.target.closest('[data-warning-category]');if(button)selectCategory(button.dataset.warningCategory);
  });
  $('warningCategoryClose').addEventListener('click',()=>{if(selected)selectCategory(selected);});
  $('warningList').addEventListener('click',event=>{
    const button=event.target.closest('[data-failure-event]');if(button)openEvent(Number(button.dataset.failureEvent));
  });
  window.FermentationFailureResults={
    render(result) {
      if(current!==result){dialog.close();selected=null;}
      current=result;
      groups=Object.fromEntries(categories.map(c=>[c.id,[]]));
      (result.failures?.events??[]).forEach((event,eventIndex)=>{
        groups[categoryFor(eventCategories,event.image)].push({eventIndex,rank:priority[event.penalty]??3});
      });
      (result.warnings??[]).forEach(warning=>{
        groups[categoryFor(warningCategories,warning.title)].push({warning,rank:priority[warning.severity]??5});
      });
      for(const items of Object.values(groups))items.sort((a,b)=>a.rank-b.rank);
      if(!groups[selected]?.length)selected=null;
      renderCategories();
    },
    reset(){dialog.close();current=null;selected=null;groups={};$('warningCategoryButtons').replaceChildren();
      $('warningCategoryPanel').hidden=true;$('warningCategoryTitle').textContent='';$('warningList').replaceChildren();}
  };
})();
