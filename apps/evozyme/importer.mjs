import {parseCSV} from './io.mjs';
export const IMPORT_VERSION=1;
export const HEADERS={map:['plate_id','well','clone_id','prep_id','technical_rep','sample_type','assay_id','data_origin'],register:['clone_id','parent_id','round','sequence_status','stock_location','data_origin'],measurements:['run_id','plate_id','well','time_s','signal','signal_unit','data_origin']};
export const wellID=value=>{const m=/^([A-H])0?([1-9]|1[0-2])$/i.exec(String(value).trim());if(!m)throw new Error('Invalid 96-well coordinate: '+value);return m[1].toUpperCase()+m[2].padStart(2,'0');};
export function canonicalCSV(rows,headers){const cell=v=>{const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};return[headers,...rows.map(r=>headers.map(h=>r[h]))].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';}
export function sourceRows(source,delimiter=','){return parseCSV(source.text,source.name,delimiter);}
export function suggestSource(source){
  if(/\.json$/i.test(source.name))return{name:source.name,role:'settings',delimiter:',',columns:{}};
  let rows=[];try{rows=sourceRows(source);}catch{}
  const keys=Object.keys(rows[0]||{}).filter(k=>k!=='_line');
  const role=keys.includes('sample_type')?'map':keys.includes('stock_location')?'register':keys.some(k=>/^(time|time_s|seconds|minutes)$/i.test(k))?'measurements':'unused';
  return{name:source.name,role,delimiter:',',columns:suggestColumns(keys,role)};
}
export function suggestColumns(keys,role){const aliases={time_s:['time','seconds','minutes'],well:['position'],signal:['value','reading'],plate_id:['plate'],clone_id:['clone'],prep_id:['preparation'],stock_location:['stock']};return Object.fromEntries((HEADERS[role]||[]).map(h=>[h,keys.find(k=>k.toLowerCase()===h)||keys.find(k=>(aliases[h]||[]).includes(k.toLowerCase()))||'']));}
export function newRecipe(originals,config){return{version:IMPORT_VERSION,sources:originals.map(suggestSource),layout:'long',timeUnit:'seconds',decimal:'.',plateId:'',signalUnit:config.signal_unit,wideTime:'',mapOverride:null,registerOverride:null};}
function number(value,decimal,where){let s=String(value??'').trim();if(decimal===','){if(s.includes('.'))throw new Error(where+': decimal comma selected, but a dot was found. Thousands separators are not supported.');s=s.replace(',','.');}if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)||!Number.isFinite(Number(s)))throw new Error(where+': invalid numeric value '+value);return Number(s);}
export function transform(originals,recipe,config){
  if(recipe.version!==IMPORT_VERSION)throw new Error('Unsupported mapping recipe version.');
  if(!['long','wide'].includes(recipe.layout)||!['seconds','minutes','milliseconds'].includes(recipe.timeUnit)||!['.',','].includes(recipe.decimal))throw new Error('Choose a supported layout, time unit and decimal format.');
  if(recipe.signalUnit!==config.signal_unit)throw new Error('Raw signal unit differs from analysis settings. Set the assay unit explicitly; no activity conversion is applied.');
  const roleSources=role=>recipe.sources.filter(s=>s.role===role);
  for(const role of ['map','register','settings'])if(roleSources(role).length>1)throw new Error('Assign at most one '+role+' file.');
  if(roleSources('measurements').length!==1)throw new Error('Assign exactly one measurements file for this import.');
  const read=entry=>{const original=originals.find(o=>o.name===entry.name);if(!original)throw new Error('Original file missing: '+entry.name);const rows=sourceRows(original,entry.delimiter),keys=Object.keys(rows[0]||{});if(!(entry.role==='measurements'&&recipe.layout==='wide'))for(const [field,column]of Object.entries(entry.columns))if(column&&!keys.includes(column))throw new Error(entry.name+': selected column '+column+' for '+field+' is missing. Review the mapping.');return rows;};
  const mapped=role=>{const entry=roleSources(role)[0];return entry?read(entry).map(row=>Object.fromEntries(HEADERS[role].map(h=>[h,entry.columns[h]?row[entry.columns[h]]??'':'']))):[];};
  const entry=roleSources('measurements')[0],raw=read(entry),factor={seconds:1,minutes:60,milliseconds:.001}[recipe.timeUnit];
  let measurements=[];
  if(recipe.layout==='long')measurements=raw.map(row=>{
    const value=h=>entry.columns[h]?row[entry.columns[h]]??'':'';
    return{run_id:value('run_id')||config.run_id,plate_id:value('plate_id')||recipe.plateId,well:wellID(value('well')),time_s:number(value('time_s'),recipe.decimal,entry.name+' row '+row._line+' time')*factor,signal:number(value('signal'),recipe.decimal,entry.name+' row '+row._line+' signal'),signal_unit:value('signal_unit')||recipe.signalUnit,data_origin:value('data_origin')||config.data_origin};
  });
  else{
    const keys=Object.keys(raw[0]||{}).filter(k=>k!=='_line'),wells=keys.filter(k=>k!==recipe.wideTime);
    if(!keys.includes(recipe.wideTime)||!wells.length)throw new Error('Select the time column; every other column must be a 96-well coordinate.');
    const normalized=wells.map(wellID);if(new Set(normalized).size!==normalized.length)throw new Error('Wide file has duplicate well columns.');
    for(const row of raw)for(let i=0;i<wells.length;i++)measurements.push({run_id:config.run_id,plate_id:recipe.plateId,well:normalized[i],time_s:number(row[recipe.wideTime],recipe.decimal,entry.name+' row '+row._line+' time')*factor,signal:number(row[wells[i]],recipe.decimal,entry.name+' row '+row._line+' '+wells[i]),signal_unit:recipe.signalUnit,data_origin:config.data_origin});
  }
  if(measurements.some(m=>!m.plate_id))throw new Error('Supply a plate ID or map its column.');
  let map=structuredClone(recipe.mapOverride??mapped('map')),register=structuredClone(recipe.registerOverride??mapped('register'));
  if(!map.length){const seen=new Set();for(const m of measurements){const key=m.plate_id+'/'+m.well;if(!seen.has(key)){seen.add(key);map.push({plate_id:m.plate_id,well:m.well,clone_id:'',prep_id:'',technical_rep:'',sample_type:'',assay_id:config.assay_id,data_origin:config.data_origin});}}}
  for(const row of map){row.well=wellID(row.well);row.plate_id||=recipe.plateId;row.assay_id||=config.assay_id;row.data_origin||=config.data_origin;}
  return{map,register,measurements};
}
export function canonicalFiles(mapped){return Object.fromEntries([['plate_map.csv',mapped.map,HEADERS.map],['clone_register.csv',mapped.register,HEADERS.register],['measurements.csv',mapped.measurements,HEADERS.measurements]].map(([name,rows,headers])=>[name,{name,text:canonicalCSV(rows,headers),rows:rows.length}]));}
export function previewIssues(mapped,config){
  const issues=[],seen=new Set(),observed=new Map();
  for(const row of mapped.measurements){const key=row.plate_id+'/'+row.well,full=key+'/'+row.time_s;if(seen.has(full))issues.push('Duplicate observation: '+full);seen.add(full);if(!observed.has(key))observed.set(key,new Set());observed.get(key).add(row.time_s);}
  const mapKeys=new Set();for(const row of mapped.map){const key=row.plate_id+'/'+row.well;if(mapKeys.has(key))issues.push('Duplicate plate-map well: '+key);mapKeys.add(key);if(!['blank','host','parent','candidate'].includes(row.sample_type))issues.push(key+': assign a sample type.');if(['candidate','parent'].includes(row.sample_type)&&(!row.clone_id||!row.prep_id||!row.technical_rep))issues.push(key+': clone, preparation and technical replicate IDs are required.');if(row.sample_type==='parent'&&row.clone_id!==config.reference_parent_id)issues.push(key+': expected reference '+config.reference_parent_id+', observed '+row.clone_id);const times=observed.get(key);if(!times)issues.push(key+': no measurements.');else if(config.fit_times_s.some(t=>!times.has(t)))issues.push(key+': missing a configured fitting time.');if(row.clone_id&&!mapped.register.some(c=>c.clone_id===row.clone_id&&c.stock_location))issues.push(key+': clone register needs stock reference for '+row.clone_id);}
  for(const key of observed.keys())if(!mapKeys.has(key))issues.push(key+': measurement has no plate-map entry.');
  return [...new Set(issues)];
}
export function assignWells(mapped,{plate,wells,sample_type,clone_id,prep_id,stock_location,parent_id,round,data_origin,assay_id}){
  const selected=[...new Set(wells.split(/[\s,;]+/).filter(Boolean).map(wellID))];if(!plate||!selected.length)throw new Error('Choose a plate and at least one well.');
  if(!['blank','host','parent','candidate'].includes(sample_type))throw new Error('Choose a sample type.');
  if(['candidate','parent'].includes(sample_type)&&(!clone_id.trim()||!prep_id.trim()||!stock_location.trim()))throw new Error('Enter explicit clone, preparation and stock identities.');
  const map=structuredClone(mapped.map),register=structuredClone(mapped.register);
  selected.forEach((well,i)=>{const row={plate_id:plate,well,sample_type,clone_id:clone_id.trim(),prep_id:prep_id.trim(),technical_rep:String(i+1),assay_id,data_origin};const at=map.findIndex(r=>r.plate_id===plate&&r.well===well);if(at<0)map.push(row);else map[at]=row;});
  if(clone_id.trim()){const row={clone_id:clone_id.trim(),parent_id,round:String(round),sequence_status:'not reviewed',stock_location:stock_location.trim(),data_origin};const at=register.findIndex(r=>r.clone_id===row.clone_id);if(at<0)register.push(row);else register[at]={...register[at],stock_location:row.stock_location};}
  return{...mapped,map,register};
}
