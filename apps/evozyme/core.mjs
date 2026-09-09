export const ENGINE_VERSION='1.1.0';
export const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
export const sd=a=>a.length>1?Math.sqrt(a.reduce((s,x)=>s+(x-mean(a))**2,0)/(a.length-1)):0;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const unique=a=>[...new Set(a)].sort();
const group=(rows,key)=>{const m=new Map();for(const r of rows){const k=key(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r);}return m;};
function need(ok,message){if(!ok)throw new Error(message);}
export function coverage(probabilities,draws){
  need(Number.isSafeInteger(draws)&&draws>=0,'Independent draws must be a nonnegative whole number.');
  need(probabilities.length>0&&probabilities.length<=100000,'Supply between 1 and 100,000 target probabilities.');
  need(probabilities.every(p=>finite(p)&&p>=0&&p<=1),'Probabilities must be finite numbers between 0 and 1.');
  need(probabilities.reduce((s,p)=>s+p,0)<=1+1e-10,'Target probabilities cannot sum above 1.');
  const seen=probabilities.map(p=>draws===0?0:p===1?1:-Math.expm1(draws*Math.log1p(-p)));
  const total=seen.reduce((s,p)=>s+p,0);
  return{draws,target_variants:seen.length,expected_distinct:total,expected_fraction:total/seen.length,probability_all_lower_bound:Math.max(0,1-seen.reduce((s,p)=>s+1-p,0)),probability_all_upper_bound:Math.min(...seen),off_target_probability:Math.max(0,1-probabilities.reduce((s,p)=>s+p,0))};
}
export function nnkProbabilities(){return 'ACDEFGHIKLMNPQRSTVWY'.split('').map(target=>({target,probability_per_draw:('LRS'.includes(target)?3:'AGPTV'.includes(target)?2:1)/32}));}
export function budget(b){
  for(const key of ['primaryPlates','wells','controls','technical','preparations','repeatPlates','confirmCandidates','confirmPreps'])need(Number.isSafeInteger(b[key])&&b[key]>=0,`${key}: enter a nonnegative whole number.`);
  need(b.primaryPlates>0&&b.wells>0&&b.technical>0&&b.preparations>0&&b.confirmPreps>0,'Plates, wells, technical replication, and preparation counts must be positive.');
  need(b.controls<b.wells,'Control wells must be fewer than total wells per plate.');
  need(finite(b.usableFraction)&&b.usableFraction>0&&b.usableFraction<=1,'Usable fraction must be greater than 0 and at most 1.');
  for(const key of ['laborHours','laborRate','prepCost','wellCost','libraryCost','sequenceCost','confirmationCost','readerRate','readerHours','contingency','otherCost','controlPrepCost'])need(finite(b[key])&&b[key]>=0,`${key}: enter a nonnegative cost or quantity.`);
  const perPlate=Math.floor((b.wells-b.controls)/(b.technical*b.preparations));
  need(perPlate>0,'No clone slots remain after controls and replication.');
  const slots=b.primaryPlates*perPlate,usable=slots*b.usableFraction,preps=(b.primaryPlates+b.repeatPlates)*perPlate*b.preparations;
  const items=[['Culture and preparation',preps*b.prepCost],['Primary and repeat assay wells',(b.primaryPlates+b.repeatPlates)*b.wells*b.wellCost],['Library construction',b.libraryCost],['Sequencing',b.confirmCandidates*b.sequenceCost],['Confirmation consumables',b.confirmCandidates*b.confirmPreps*b.confirmationCost],['Labor',b.laborHours*b.laborRate],['Reader access',b.readerHours*b.readerRate],['Additional control preparation',b.controlPrepCost],['Other recurring costs',b.otherCost]];
  const subtotal=items.reduce((s,[,v])=>s+v,0),contingency=subtotal*b.contingency,total=subtotal+contingency;
  need([slots,usable,preps,subtotal,total].every(Number.isFinite),'Budget values are too large to calculate.');
  return{perPlate,slots,usable,preps,confirmationPreps:b.confirmCandidates*b.confirmPreps,items,subtotal,contingency,total,perUsable:total/usable};
}
export function equipmentTotal(items){
  let quoted=0,missing=0;const gaps=[];
  for(const item of items){if(item.access==='missing')gaps.push(item.name);if(item.access==='purchase'){if(!finite(item.price)||item.price<0||!Number.isSafeInteger(item.quantity)||item.quantity<1)missing++;else quoted+=item.price*item.quantity;}}
  return{quoted,missing,gaps,complete:missing===0&&gaps.length===0};
}
export function fitLine(times,values){
  need(times.length>=3&&times.length===values.length&&new Set(times).size===times.length,'A fit needs at least three distinct times and matching measurements.');
  need([...times,...values].every(finite),'Non-finite measurement.');
  const xm=mean(times),ym=mean(values),xx=times.reduce((s,x)=>s+(x-xm)**2,0);
  const slope=times.reduce((s,x,i)=>s+(x-xm)*(values[i]-ym),0)/xx;
  const residual=values.reduce((s,y,i)=>s+(y-ym-slope*(times[i]-xm))**2,0),yy=values.reduce((s,y)=>s+(y-ym)**2,0);
  return{slope,r2:yy?1-residual/yy:0,intercept:ym-slope*xm};
}
export function validateAssay(c){
  for(const key of ['reference_parent_id','run_id','assay_id','signal_unit','data_origin'])need(typeof c[key]==='string'&&c[key].trim(),`Assay settings: ${key} is required.`);
  need([-1,1].includes(c.signal_direction),'Signal direction must be +1 or −1.');
  need(Array.isArray(c.fit_times_s)&&c.fit_times_s.length>=3&&new Set(c.fit_times_s).size===c.fit_times_s.length&&c.fit_times_s.every(t=>finite(t)&&t>=0),'Specify at least three unique, finite, nonnegative fitting times.');
  for(const key of ['minimum_r2','maximum_parent_cv','maximum_technical_cv','maximum_host_fraction'])need(finite(c[key])&&c[key]>=0&&c[key]<=1,`Assay settings: ${key} must be between 0 and 1.`);
  need(finite(c.minimum_fold_for_retest)&&c.minimum_fold_for_retest>1,'Retest fold threshold must be greater than 1.');
  need(finite(c.signal_ceiling)&&c.signal_ceiling>0,'Upper detector limit must be a positive number.');
  if(c.signal_floor!==null&&c.signal_floor!==undefined)need(finite(c.signal_floor)&&c.signal_floor<c.signal_ceiling,'Lower detector limit must be below the upper limit.');
  for(const key of ['minimum_blank_wells','minimum_host_wells','minimum_parent_preparations','minimum_technical_wells'])need(Number.isSafeInteger(c[key])&&c[key]>0,`Assay settings: ${key} must be a positive whole number.`);
  need(c.minimum_parent_preparations>=2,'Use at least two independent parent preparations for between-preparation variation.');
}
export function analyze(input,cfg){
  validateAssay(cfg);
  const maps=input['plate_map.csv'],register=input['clone_register.csv'],measurements=input['measurements.csv'];
  need(maps?.length&&register?.length&&measurements?.length,'Supply plate_map.csv, clone_register.csv, and measurements.csv with data rows.');
  const fail=(file,row,message)=>{throw new Error(`${file}, row ${row._line??'?'}: ${message}`);};
  const required=(rows,file,fields)=>{for(const row of rows)for(const f of fields)if(typeof row[f]!=='string'||!row[f].trim())fail(file,row,`${f} is required.`);};
  required(register,'clone_register.csv',['clone_id','stock_location','data_origin']);required(maps,'plate_map.csv',['plate_id','well','sample_type','assay_id','data_origin']);required(measurements,'measurements.csv',['run_id','plate_id','well','time_s','signal','signal_unit','data_origin']);
  const locations=new Map();
  for(const r of register){if(locations.has(r.clone_id))fail('clone_register.csv',r,'Duplicate clone_id.');locations.set(r.clone_id,r.stock_location);}
  const mapping=new Map(),replicates=new Set(),preparationOwners=new Map();
  for(const row of maps){
    const key=JSON.stringify([row.plate_id,row.well]);
    if(mapping.has(key))fail('plate_map.csv',row,'Duplicate plate/well.');
    if(!/^[A-H](0[1-9]|1[0-2])$/.test(row.well))fail('plate_map.csv',row,'well must be A01–H12.');
    if(!['parent','candidate','blank','host'].includes(row.sample_type))fail('plate_map.csv',row,'Unrecognized sample_type.');
    if(row.sample_type==='parent'&&row.clone_id!==cfg.reference_parent_id)fail('plate_map.csv',row,`Parent control ${row.plate_id}/${row.well}: expected ${cfg.reference_parent_id}, found ${row.clone_id||'missing clone ID'}.`);
    if(row.assay_id!==cfg.assay_id)fail('plate_map.csv',row,'assay_id does not match the settings.');
    if(['candidate','parent'].includes(row.sample_type)){
      if(!locations.get(row.clone_id)?.trim())fail('plate_map.csv',row,`Missing recoverable stock for ${row.clone_id}.`);
      if(!row.prep_id?.trim())fail('plate_map.csv',row,'prep_id is required.');
      const ownerKey=JSON.stringify([row.plate_id,row.prep_id]);const owner=preparationOwners.get(ownerKey);
      if(owner&&owner!==row.clone_id)fail('plate_map.csv',row,'prep_id is shared by different clones.');preparationOwners.set(ownerKey,row.clone_id);
      const rep=JSON.stringify([row.plate_id,row.clone_id,row.prep_id,row.technical_rep]);
      if(!row.technical_rep?.trim()||replicates.has(rep))fail('plate_map.csv',row,'Missing or duplicate technical_rep.');replicates.add(rep);
    }
    mapping.set(key,{...row,stock_location:locations.get(row.clone_id)||''});
  }
  const obs=new Map(),seen=new Set();
  for(const row of measurements){
    const key=JSON.stringify([row.plate_id,row.well]);if(!mapping.has(key))fail('measurements.csv',row,'Observation has no matching plate/well.');
    if(row.run_id!==cfg.run_id)fail('measurements.csv',row,'run_id does not match the settings.');
    if(row.signal_unit!==cfg.signal_unit)fail('measurements.csv',row,'signal_unit does not match the settings.');
    const t=Number(row.time_s),y=Number(row.signal);if(!finite(t)||!finite(y)||t<0)fail('measurements.csv',row,'time_s and signal must be finite; time_s must be nonnegative.');
    const id=JSON.stringify([row.plate_id,row.well,t]);if(seen.has(id))fail('measurements.csv',row,'Duplicate observation at the same time.');seen.add(id);
    if(!obs.has(key))obs.set(key,[]);obs.get(key).push([t,y]);
  }
  const times=[...cfg.fit_times_s].sort((a,b)=>a-b),timeSet=new Set(times),wells=[];
  for(const [key,row]of mapping){
    const points=(obs.get(key)||[]).sort((a,b)=>a[0]-b[0]),selected=points.filter(([t])=>timeSet.has(t));
    const flags=[];let fit=null;
    if(selected.length!==times.length||selected.some(([t],i)=>t!==times[i]))flags.push('missing_timepoints');
    else{fit=fitLine(selected.map(([t])=>t/60),selected.map(([,y])=>y));
      if(selected.some(([,y])=>y>=cfg.signal_ceiling))flags.push('signal_at_or_above_ceiling');
      if(cfg.signal_floor!==null&&cfg.signal_floor!==undefined&&selected.some(([,y])=>y<=cfg.signal_floor))flags.push('signal_at_or_below_floor');
      if(['candidate','parent'].includes(row.sample_type)&&fit.r2<cfg.minimum_r2)flags.push('nonlinear_or_low_signal');
    }
    wells.push({...row,raw_slope_per_min:fit?.slope??null,r2:fit?.r2??null,intercept:fit?.intercept??null,corrected_rate_per_min:null,flags,points});
  }
  const quality={},candidates=[];
  for(const[plate,rows]of group(wells,r=>r.plate_id)){
    const reasons=[],blanks=rows.filter(r=>r.sample_type==='blank'&&!r.flags.length).map(r=>r.raw_slope_per_min);
    if(blanks.length<cfg.minimum_blank_wells)reasons.push('insufficient_valid_blanks');
    if(rows.some(r=>['parent','blank','host'].includes(r.sample_type)&&r.flags.length))reasons.push('failed_control_measurement');
    const background=mean(blanks);for(const r of rows)if(r.raw_slope_per_min!==null&&background!==null)r.corrected_rate_per_min=(r.raw_slope_per_min-background)*cfg.signal_direction;
    const parentMeans=[];
    for(const[,rr]of group(rows.filter(r=>r.sample_type==='parent'),r=>r.prep_id)){
      const vals=rr.filter(r=>!r.flags.length&&r.corrected_rate_per_min!==null).map(r=>r.corrected_rate_per_min);
      if(vals.length<cfg.minimum_technical_wells)reasons.push('incomplete_parent_preparation');
      else if(mean(vals)<=0||sd(vals)/mean(vals)>cfg.maximum_technical_cv)reasons.push('unstable_parent_preparation');
      else parentMeans.push(mean(vals));
    }
    if(parentMeans.length<cfg.minimum_parent_preparations)reasons.push('insufficient_parent_preparations');
    const pm=mean(parentMeans),pc=parentMeans.length>1&&pm>0?sd(parentMeans)/pm:null;
    if(pc===null||pc>cfg.maximum_parent_cv)reasons.push('parent_variation_exceeds_rule');
    const hosts=rows.filter(r=>r.sample_type==='host'&&!r.flags.length&&r.corrected_rate_per_min!==null).map(r=>r.corrected_rate_per_min),hm=mean(hosts);
    if(hosts.length<cfg.minimum_host_wells)reasons.push('insufficient_valid_host_controls');
    if(hm!==null&&pm!==null&&hm>cfg.maximum_host_fraction*pm)reasons.push('host_background_exceeds_rule');
    quality[plate]={usable:!reasons.length,reasons:unique(reasons),blank_slope_per_min:background,parent_rate_per_min:pm,parent_prep_count:parentMeans.length,parent_cv:pc,host_rate_per_min:hm,zprime_descriptive:parentMeans.length>1&&hosts.length>1&&pm!==hm?1-3*(sd(parentMeans)+sd(hosts))/Math.abs(pm-hm):null};
    for(const[clone,rr]of group(rows.filter(r=>r.sample_type==='candidate'),r=>r.clone_id)){
      const flags=rr.flatMap(r=>r.flags),prepids=unique(rr.map(r=>r.prep_id));
      if(prepids.length!==1)fail('plate_map.csv',rr[0],'Only one preparation per candidate per plate is supported. Review independent confirmation separately.');
      const rates=rr.filter(r=>r.corrected_rate_per_min!==null&&!r.flags.length).map(r=>r.corrected_rate_per_min);
      if(rates.length<cfg.minimum_technical_wells)flags.push('insufficient_valid_technical_wells');
      const rate=mean(rates),cv=rates.length>1&&rate?sd(rates)/Math.abs(rate):null;
      if(rate!==null&&rate<=0)flags.push('nonpositive_rate');if(cv!==null&&cv>cfg.maximum_technical_cv)flags.push('technical_disagreement');if(reasons.length)flags.push('plate_requires_review');
      const fold=rate!==null&&pm&&!flags.length?rate/pm:null;
      candidates.push({plate_id:plate,clone_id:clone,prep_id:prepids[0],valid_wells:rates.length,rate_per_min:rate,technical_cv:cv,fold_vs_parent:fold,decision:flags.length?'review_measurement':fold>=cfg.minimum_fold_for_retest?'retest_candidate':'below_retest_threshold',flags:unique(flags).join(';'),stock_location:rr[0].stock_location});
    }
  }
  candidates.sort((a,b)=>(a.fold_vs_parent===null)-(b.fold_vs_parent===null)||(b.fold_vs_parent||0)-(a.fold_vs_parent||0)||a.clone_id.localeCompare(b.clone_id)||a.plate_id.localeCompare(b.plate_id));
  return{engineVersion:ENGINE_VERSION,config:structuredClone(cfg),quality,candidates,wells,counts:{plates:Object.keys(quality).length,mapRows:maps.length,observations:measurements.length},dataOrigins:unique([...maps,...register,...measurements].map(r=>r.data_origin))};
}
export function confirmationSummary(rows,parentId,normalization='product'){
  need(parentId?.trim(),'Specify the parent clone ID for confirmation.');
  need(['product','enzyme'].includes(normalization),'Unknown confirmation normalization.');
  const seen=new Set();const prepared=rows.map(r=>{need(r.clone_id?.trim()&&r.prep_id?.trim()&&r.assay_id?.trim(),'Confirmation rows need clone, preparation, and assay IDs.');const key=JSON.stringify([r.assay_id,r.clone_id,r.prep_id]);need(!seen.has(key),'Duplicate confirmation preparation.');seen.add(key);const p=Number(r.product_uM_per_min),e=Number(r.enzyme_uM);need(r.product_uM_per_min!==null&&r.product_uM_per_min!==undefined&&String(r.product_uM_per_min).trim()!==''&&finite(p)&&p>=0,'Product rates must be finite and nonnegative; blank is not zero.');if(normalization==='enzyme')need(r.enzyme_uM!==''&&finite(e)&&e>0,'Enzyme normalization requires a positive enzyme concentration for every preparation.');return{...r,value:normalization==='enzyme'?p/e:p};});
  const result=[];
  for(const[assay,rs]of group(prepared,r=>r.assay_id)){
    const parent=rs.filter(r=>r.clone_id===parentId),pm=mean(parent.map(r=>r.value));
    for(const[clone,rr]of group(rs,r=>r.clone_id)){const values=rr.map(r=>r.value);result.push({assay_id:assay,clone_id:clone,n:rr.length,mean:mean(values),sd:values.length>1?sd(values):null,parent_n:parent.length,fold:pm>0?mean(values)/pm:null,values});}
  }
  return result;
}
