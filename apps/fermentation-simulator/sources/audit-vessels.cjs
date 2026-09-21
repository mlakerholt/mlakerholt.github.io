/* Reproducible, field-level manufacturer audit. No network access in this build. */
const fs = require('fs'), path = require('path'), z = require('zlib'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p), 'utf8');
const write = (p,s) => fs.writeFileSync(path.join(root,p),s);
const unpack = s => z.gunzipSync(Buffer.from(s.trim(),'base64')).toString();
const pack = s => z.gzipSync(Buffer.from(s),{level:9,mtime:0}).toString('base64');
const backup = path.join(__dirname, 'audit-baseline');
fs.mkdirSync(backup,{recursive:true});
for (const p of ['sources/source-records.payload','vessel-catalog.payload']) {
  const dest = path.join(backup,path.basename(p));
  if (!fs.existsSync(dest)) fs.copyFileSync(path.join(root,p), dest);
}
const before = JSON.parse(unpack(fs.readFileSync(path.join(backup,'source-records.payload'),'utf8')));
const records = structuredClone(before);
const docs = JSON.parse(read('sources/originals/manifest.json')).documents;
function doc(prefix) {
  const d=docs.find(d=>d.status==='archived'&&d.file?.startsWith(prefix)&&d.file.endsWith('.pdf'));
  if(!d) throw Error('Missing original '+prefix);
  return {title:d.title,file:d.file,url:d.importMethod==='user-supplied-local-file'?null:d.url,sha256:d.sha256};
}
const get = id => { const r=records.find(r=>r.id===id); if(!r)throw Error(id); return r; };
const physical = new Set(['minVolume','maxVolume','nominalVolume','totalVolume','material','vesselDiameter','liquidHeight','impellerDiameter']);
function set(r,k,value,document,page,locator,note='',extra={}) {
  if(physical.has(k)) r[k]=value;
  else {r.defaults[k]=value; r[k]=value;}
  r.evidence[k]={status:'Source-supported',document,page,locator,note,...extra};
}
function table(r,values,document,page,locator,note='') {for(const [k,v] of Object.entries(values))set(r,k,v,document,page,locator,note);}
function assumption(r,k,value,note,document=null,page=null,locator='') {set(r,k,value,document,page,locator,note,{status:'App assumption'});}
const genericGap='No matching model/configuration-specific primary specification was verified for this field. Legacy values remain editable modelling assumptions, not equipment ratings. Family marketing ranges, external dimensions, sensor ranges, jacket ratings and experimental setpoints are not substituted for vessel specifications.';
for(const r of records){
  r.audit={date:'2026-09-11',gap:genericGap}; r.evidence={}; r.sourceSupportedFields=[];
  r.notes=[...r.notes, '2026-09-11 field-level review: use the evidence beside each parameter; an archived document does not verify the whole preset.'];
  for(const k of ['minVolume','maxVolume','nominalVolume','material']) r.evidence[k]={status:'App assumption',note:genericGap};
}
const glass=doc('thermo-hyperforma-glass-bioreactor-datasheet');
[1,3,7,15].forEach((size,i)=>{
  const r=get('thermo-glass-'+size);
  table(r,{minVolume:[.3,1.2,2.8,6][i],maxVolume:[.97,2.96,6.83,14.66][i],nominalVolume:size,totalVolume:[1.42,3.03,7.22,16.8][i],material:'Borosilicate glass / 316L stainless steel / silicone'},glass,2,`Specifications table, ${size} L column`,'Loaded working volume and total loaded volume are distinct from the named vessel size.');
  r.evidence.minVolume.approximate=true;
  set(r,'maxRpm',1250,glass,2,'Agitator speed','Published default configured speed; TruBio can configure lower values. Not a universal process-specific safe speed.');
  r.notes.push('Headplate diameter and bioreactor height are external assembly dimensions, not internal diameter or liquid height; they are not used in the geometry model.');
});
const ug=doc('sartorius-univessel-glass-brochure');
[1,2,5,10].forEach((size,i)=>{
  const r=get('sartorius-univessel-glass-'+size);
  set(r,'material','Borosilicate glass / AISI 316L stainless steel / EPDM',ug,6,'Materials of major product wetted parts','Major wetted parts, not just the glass vessel shell.');
  table(r,{minVolume:[.35,.4,.6,1.5][i],maxVolume:size,nominalVolume:size,totalVolume:[1.6,3,7,13][i],vesselDiameter:[.110,.130,.160,.190][i],liquidHeight:[.110,.180,.280,.360][i],heightDiameterRatio:[1,1.4,1.8,1.9][i],impellerDiameter:[.048,.054,.070,.078][i]},ug,8,`Inside Dimensions, ${size} L column`,'Selected 3-blade segment-impeller configuration. Published liquid H/D is rounded; direct dimensions take precedence over recomputation. Millimetres converted to metres.');
  assumption(r,'impellerType','pitched','Actual hardware: 3-blade segment impeller. Pitched-blade is the simulator approximation; its generic power number is not a manufacturer measurement.',ug,8,'Inside Dimensions, segment impeller');
  r.notes.push('The printed impeller/tank ratios do not all match the absolute dimensions. Direct millimetre dimensions are preferred.');
});
const su2=doc('sartorius-univessel-su-2-l-brochure');
table(get('sartorius-univessel-su-2'),{minVolume:.6,maxVolume:2,nominalVolume:2,totalVolume:2.6,material:'Polycarbonate vessel; silicone / C-Flex tubing; EPDM seal',vesselDiameter:.130,impellerCount:2,impellerDiameter:.054,maxPressure:.5},su2,4,'Technical Data','Diameter is the inner top diameter; wall has 1.5 degree slope. Maximum operating pressure is 0.5 bar(g). Do not substitute the heating-jacket rating.');
assumption(get('sartorius-univessel-su-2'),'impellerType','pitched','Actual hardware: two 3-blade segment impellers, 30 degrees, downflow. Pitched-blade is a model approximation.',su2,4,'Agitation');
const su10=doc('sartorius-univessel-su-10-l-datasheet');
['essential','perfusion','cell-therapy'].forEach((type,i)=>{
  const r=get('sartorius-univessel-su-10-'+type);
  table(r,{maxVolume:10,nominalVolume:10},su10,2,'Description','The family accommodates 2.5-10 L. This does not resolve a variant-specific minimum.');
  if(i<2)set(r,'minVolume',2.5,su10,2,'Description','Published family range, applied to the standard segment-impeller design.');
  else assumption(r,'minVolume',4.3,'Legacy 4.3 L minimum is NOT confirmed. The family text says 2.5 L but does not establish the elephant-ear variant minimum; do not silently transfer it.');
  set(r,'impellerCount',i===2?1:2,su10,3,`Technical Specifications, ${type}`,'Count is design-specific.');
  assumption(r,'impellerType',i===2?'hydrofoil':'pitched',i===2?'Actual hardware: one 3-blade elephant-ear impeller. Hydrofoil is a simulation approximation.':'Actual hardware: two 3-blade segment impellers. Pitched-blade is a simulation approximation.',su10,3,'Technical Specifications');
  r.notes.push('PDF p. 5 lists safety-valve activation at 300 mbar +/-30 and a 500 mbar burst disk. Neither is used as a maximum operating-pressure rating. The retained pressure ceiling is unverified.');
});
const cp=doc('sartorius-biostat-cplus-brochure');
[5,10,15,20,30].forEach((size,i)=>{
  const r=get('sartorius-cplus-'+size), aspect=i?3:2;
  r.label=`Biostat Cplus ${size} L - ${aspect}:1 vessel, 6-blade disc configuration (legacy)`;
  table(r,{minVolume:[1.6,3.5,4.5,5.5,7][i],maxVolume:size,nominalVolume:size,totalVolume:[6.8,15,22,30,42][i],maxRpm:[1500,1500,1000,1000,600][i],impellerType:'rushton',material:'316L stainless steel / borosilicate glass / EPDM'},cp,13,`Culture vessel, ${size} L, ${aspect}:1 column`,'Model and aspect-ratio column selected explicitly. Operating minimum differs from minimum fill for full sterilization (50% of maximum working volume).');
  assumption(r,'heightDiameterRatio',aspect,'Published ratio is vessel H/D, not liquid H/D. Using it for the liquid cylinder remains a model assumption.',cp,13,'Culture vessel H:D');
  r.impellerRatio=.4; r.ratioCitation={...cp,page:13};
  set(r,'maxVvm',1.5,cp,12,'Gas supply, microbial application','Published maximum total gas rate for microbial application.');
  r.notes.push(`Vessel design pressure: ${size===5?2.5:3} bar(g) at 150 C; not substituted for the unverified process operating-pressure ceiling.`);
});
const dd=doc('sartorius-biostat-d-dcu-brochure'), dr=get('sartorius-d-dcu');
dr.label='Biostat D-DCU 200 L - 3:1 microbial vessel (legacy)';
table(dr,{minVolume:41,maxVolume:200,nominalVolume:200,totalVolume:323,maxRpm:570,impellerType:'rushton',material:'316L stainless steel / borosilicate glass / EPDM'},dd,16,'Culture vessel, 200 L, 3:1, microbial application','Replaces the invalid 10-200 L family envelope with one actual 200 L configuration. Family model sizes are not the turndown range of one vessel.');
dr.impellerRatio=.4;dr.ratioCitation={...dd,page:16};
assumption(dr,'heightDiameterRatio',3,'Vessel aspect ratio is published; use as liquid H/D remains a model assumption.',dd,16,'Culture vessel H:D');
const rm=doc('sartorius-flexsafe-rm-cultivation-bags');
[1,2,10,20,50,100,200].forEach(size=>{
  const r=get('sartorius-rm-'+size); r.label=`Biostat RM - Flexsafe RM ${size} L basic bag (${size/10}-${size/2} L working)`;
  table(r,{minVolume:size/10,maxVolume:size/2,nominalVolume:size,totalVolume:size},rm,2,`Working Volumes and Surface Areas, ${size} L row`,'Direct tabulated range, not an inferred bag subdivision. Basic-bag configuration. PDF p. 3 recommends 20% of total as minimum for bags with sensors, depending on rocking rate and angle.');
  r.notes.push('Rocking motion has no physical impeller. Stirred-tank geometry, rpm and power fields remain compatibility placeholders, not validated rocking-bag physics.');
});
const a15=doc('sartorius-ambr-15-cell-culture-generation-2');
const ar=get('sartorius-ambr-15');ar.label='Ambr 15 Cell Culture Generation 2 - 10-15 mL working volume';
table(ar,{minVolume:.01,maxVolume:.015,nominalVolume:.015,maxRpm:2000,impellerType:'pitched',impellerCount:1},a15,10,'Functions and micro bioreactor vessel','Generation 2 cell-culture configuration; stirring range 150-2000 rpm.');
const a250=doc('sartorius-ambr-250-modular');
const a=get('sartorius-ambr-250');a.label='Ambr 250 Modular - microbial dual-Rushton vessel, 100-250 mL';
table(a,{minVolume:.1,maxVolume:.25,nominalVolume:.25,impellerType:'rushton',impellerCount:2},a250,7,'Single-use mammalian or microbial bioreactors','Selected microbial dual-Rushton configuration; not the single-impeller unbaffled variant. No model-specific speed limit verified.');
const str=doc('sartorius-biostat-str-generation-3-emerson');
[50,200,500,1000,2000].forEach((size,i)=>{
  const r=get('sartorius-str-gen3-'+size);r.label=`Biostat STR Generation 3 ${size} L - DeltaV, dual 3-blade configuration`;
  table(r,{minVolume:size/4,maxVolume:size,nominalVolume:size,totalVolume:[68,280,700,1300,2800][i],vesselDiameter:[.370,.585,.815,.997,1.295][i],liquidHeight:[.480,.783,1.005,1.360,1.670][i],heightDiameterRatio:[1.3,1.34,1.23,1.36,1.29][i],impellerDiameter:[.143,.225,.310,.379,.492][i]},str,7,`Table 6, ${size} L column`,'Flexsafe STR geometry. Direct dimensions take precedence over rounded ratios; bag configuration can affect immersion volumes.');
  set(r,'impellerCount',2,str,6,'Table 4 footnote 1','Selected 2 x 3-blade impellers, not mixed 3/6-blade configuration.');
  set(r,'maxRpm',[240,150,110,70,70][i],str,size===1000?6:4,size===1000?'Table 4 footnote 2':'Table 4 maximum stirrer speed',size===1000?'At maximum filling level, 1000 L is limited to 70 rpm. The table also lists 90 rpm at other fills; this constant-ceiling simulator conservatively uses 70 rpm.':'Valid for dual 3-blade configuration; mixed-impeller limits may be lower depending on fill.');
  set(r,'maxVvm',.2,str,4,'Table 4 maximum total gassing rate','Total gassing limit. Micro-sparger-only limit is 0.1 vvm.');
});
const sub=doc('thermo-hyperforma-5-to-1-sub-family');
[50,100,250,500,1000,2000].forEach((size,i)=>table(get('thermo-sub-'+size),{minVolume:size/5,maxVolume:size,nominalVolume:size,totalVolume:[65.5,120,316,660,1320,2575][i],heightDiameterRatio:1.5,impellerCount:1,maxRpm:[200,200,150,150,110,75][i]},sub,8,`Technical specifications, ${size} L column`,'Direct table entries. Fluid H/D is 1.5, not overall reactor H/D of 1.9. One three-blade impeller.'));
const rock=doc('thermo-hyperforma-rocker-datasheet');
[10,20,50].forEach(size=>{
  const r=get('thermo-rocker-'+size); r.label=r.label.replace('approximately ','');
  table(r,{minVolume:size/10,maxVolume:size/2,nominalVolume:size,totalVolume:size},rock,2,`${size} L BPC column`,'Direct tabulated minimum and working volume. Rocking rate 2-40 cycles/min and angle 2-12 degrees per side are not impeller specifications.');
  r.notes.push('PDF p. 3 distinguishes LDPE sensor BPCs and Aegis5-14 sensorless BPCs. The preset does not choose a film configuration.');
});
const dy5=doc('thermo-dynadrive-5-l-flyer');
table(get('thermo-dynadrive-5'),{minVolume:1,maxVolume:5,nominalVolume:5},dy5,1,'5 L DynaDrive working volume','Direct 1-5 L range; replaces the unsupported 0.5 L minimum.');
const dy=doc('thermo-dynadrive-50-and-500-l-user');
[50,500].forEach((size,i)=>{
  const r=get('thermo-dynadrive-'+size),p=i?83:80;
  table(r,{minVolume:i?25:5,maxVolume:size,nominalVolume:size,totalVolume:i?586:65.5,vesselDiameter:i?.634:.294,liquidHeight:i?1.5875:.74,heightDiameterRatio:2.5,impellerDiameter:i?.229:.1085,impellerCount:4},dy,p,`Table ${i?'4.3':'4.1'}, printed page ${i?79:76}`,'Chamber diameter and liquid height copied directly. Arrangement is three modified pitched-blade plus one sweep impeller; generic single-type modelling cannot reproduce this exactly.');
  if(i)set(r,'maxRpm',120,dy,p,'Agitation VFD range','35-120 rpm; recommended minimum for culture is above 50 rpm.');
  else {
    assumption(r,'maxRpm',200,'Conflict: table 4.1 lists VFD range 30-250 rpm, while motor specification on PDF p. 81 lists 90-200 rpm. Simulator ceiling conservatively set to 200 pending manufacturer clarification; NOT claimed as a resolved rating.',dy,p,'Table 4.1 agitation; compare following motor table');
    assumption(r,'baseRpm',125,'App-selected starting point above the manufacturer recommended >120 rpm minimum; 125 itself is not a published specification.',dy,p,'Recommended minimum during culture');
  }
});
const suf=doc('thermo-hyperforma-single-use-fermentor-user');
[30,300].forEach((size,i)=>{
  const r=get('thermo-suf-'+size);
  table(r,{minVolume:size/5,maxVolume:size,nominalVolume:size,totalVolume:i?435:43,vesselDiameter:i?.572:.266,liquidHeight:i?1.232:.571,heightDiameterRatio:2,impellerCount:3,impellerType:'rushton',impellerDiameter:i?.1879:.0889,powerNumber:i?4.1:5,baffled:true},suf,116,'Table 4.1, printed page 111','Published vessel diameter (not separate BPC chamber diameter), liquid height, three 6-blade Rushton turbines and four baffles. Power number is an average over 20-100% RPM.');
  assumption(r,'maxRpm',i?120:275,'This simulator has one constant speed ceiling. Conservatively selected the published limit at minimum working volume; it does not implement the full fill-dependent envelope. At full volume the rated ceiling is '+(i?'375':'596')+' rpm.',suf,102,'Maximum speed by working volume');
  if(r.defaults.baseRpm>r.defaults.maxRpm) assumption(r,'baseRpm',r.defaults.maxRpm,'App starting value lowered to the selected constant speed ceiling; not an independent manufacturer recommendation.');
  r.notes.push('Speed envelope, PDF p. 102: '+(i?'60 L: 120 rpm; 150 L: 240 rpm; 300 L: 375 rpm.':'6 L: 275 rpm; 15 L: 350 rpm; 30 L: 598 rpm (technical table p. 116 instead gives 596 rpm).')+' Volume-dependent agitation requires a future model extension; the conservative preset is intentionally restrictive.');
});
const xdr=doc('cytiva-xcellerex-xdr-50-to-2000');
table(get('cytiva-xdr-10'),{minVolume:4.5,maxVolume:10,nominalVolume:10},xdr,1,'XDR family introduction','Explicit XDR-10 range. The separately archived perfusion application note is not an XDR-10 datasheet.');
[50,200,500,1000,2000].forEach((size,i)=>{
  const r=get('cytiva-xdr-'+size);r.label=`Cytiva Xcellerex XDR-${size} - ${i?size/5:25}-${size} L working volume`;
  table(r,{minVolume:i?size/5:25,maxVolume:size,nominalVolume:size},xdr,6,`Table 1, XDR-${size}`,'Model-specific working range; XDR-50 minimum is 25 L, not a family 20% assumption.');
  set(r,'totalVolume',size+[17.16,95.47,175.90,369.17,970.33][i],xdr,6,'Table 1, working volume and headspace','Total calculated by adding the published headspace to maximum working volume.',{status:'Derived / estimated',rule:'total = maximum working volume + published headspace',calculation:`${size} + ${[17.16,95.47,175.90,369.17,970.33][i]} L`});
  table(r,{impellerCount:1,impellerType:'pitched',material:'Ultra-low-density polyethylene (ULDPE) contact layer'},xdr,3,'Disposable bag and impeller description','Single bottom-mounted pitched impeller. The stainless-steel support vessel is not the product-contact layer.');
});
const xp=doc('cytiva-xcellerex-x-platform-datasheet');
[50,200].forEach(size=>{
  const r=get('cytiva-x-platform-'+size);r.label=`Cytiva Xcellerex X-platform ${size} L - downflow configuration`;
  table(r,{minVolume:size/5,maxVolume:size,nominalVolume:size,maxRpm:size===50?285:185},xp,5,`System specifications, X-${size}`,'Direct working range and downflow agitation ceiling. X-200 upflow ceiling is instead 215 rpm.');
  table(r,{impellerCount:1,baffled:true},xp,2,'Bioreactor vessel','Single bottom-centred drive and impeller; baffles described.');
  set(r,'material','ReadyKleer single-use film',xp,3,'Bioreactor bags','Film brand documented; specific contact-layer polymer not established here.');
  assumption(r,'impellerType','pitched','Manufacturer designation is 6B-R50 (PDF p. 5). Pitched-blade is an unvalidated simulation approximation; generic power number is not manufacturer-confirmed.',xp,5,'Impeller type');
});
const microbialWeb=docs.find(d=>d.status==='archived'&&d.title==='Sartorius STR Microbial manufacturer technical article');
if(microbialWeb){
  const d={title:microbialWeb.title,file:microbialWeb.file,url:microbialWeb.url,sha256:microbialWeb.sha256,format:'html'};
  table(get('sartorius-str-microbial-50'),{minVolume:11,maxVolume:40},d,null,'Biostat STR Microbial - A Viable Single-Use Alternative','Direct manufacturer technical article; local raw HTML response retained. PDF datasheet remains unavailable.');
}
// Online primary evidence is usable, but is never labelled as a local original.
const iflex=doc('merck-iflex-ds12340en-v4-2025-');
const mobius3=doc('merck-mobius3-ds26770000-v3-2023-');
table(get('merck-mobius-3'),{minVolume:1,maxVolume:2.4,nominalVolume:3,totalVolume:3,vesselDiameter:.135,impellerDiameter:.0762,impellerType:'marine',material:'Polycarbonate vessel/shaft; HDPE headplate/impeller; silicone seals'},mobius3,2,'Specifications - Volume, Dimensions, Materials','May 2023 dedicated specification, now archived locally. Overall height 244 mm is NOT liquid height. Working range is 1-2.4 L, distinct from nominal 3 L capacity.');
const breez={title:'Merck Mobius Breez datasheet DS12130EN (online only)',file:null,url:'https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/marketing/global/documents/107/533/ds12130en-mobius-breez-microbioreactor-data-sheet-ms.pdf',sha256:null};
set(get('merck-breez'),'maxVolume',.002155,breez,6,'Specifications - Fluid Flow and Volume','Exact specified fixed working volume, more precise than the 2 mL marketing description. Read online 2026-09-11; local original download blocked.');
set(get('merck-breez'),'minVolume',.002155,breez,6,'Specifications - Fluid Flow and Volume','The manufacturer specifies a fixed working volume, not a separate minimum. The app sets both endpoints equal for a fixed-volume preset.',{status:'Derived / estimated',rule:'minimum = specified fixed working volume',calculation:'2.155 mL / 1000 = 0.002155 L'});
set(get('merck-breez'),'nominalVolume',.002,breez,1,'Product description','Named 2 mL platform, distinguished from the exact 2.155 mL working volume. Total capacity remains unverified.');
[200,2000].forEach((size,i)=>{
  const r=get('merck-iflex-'+size);
  table(r,{minVolume:size/5,maxVolume:size,nominalVolume:size,totalVolume:i?2400:240,vesselDiameter:i?1.158:.546,impellerDiameter:i?.406:.210,impellerType:'pitched',powerNumber:i?3.7:3.6,baffled:true},iflex,7,'General System Specifications','Locally archived MK_DS12340EN Ver. 4.0, March 2025 confirms previously gathered values. Four-blade down-pumping pitched impeller, bottom mounted 15 degrees from centre; X-baffle. Metric dimensions take precedence over rounded inch equivalents.');
  set(r,'maxRpm',i?102:144,iflex,9,'Mixer M201, Operating Process Range',`Published process range ${i?'27-102':'0-144'} rpm, not the wider instrument range. The app stores the maximum only; the lower limit is retained here.`);
  set(r,'impellerCount',1,iflex,9,'Mixer M201 notes','Mixer is used with a single-use impeller; single bottom-mounted design also described on pages 5 and 7.');
  set(r,'material','Ultimus single-use film',iflex,4,'Bioreactor Flexware assemblies','Film brand confirmed; woven nylon reinforcement and Irgafos 168-free contact layer described. This does not identify all contact-layer polymers. Page 7 stainless steel is support hardware, not the bag film.');
  set(r,'maxPressure',(i?.4:.5)*0.06894757293168,iflex,9,'PE001 bag pressure: Operating Process Range and MFC-stop interlock',`${i?'0.4':'0.5'} psi above atmospheric pressure, converted using 1 psi = 0.06894757293168 bar. Used as the simulator warning ceiling. This is the published process/interlock limit, NOT a vessel design-pressure rating or the 0-6 psi sensor span. Detection tolerance is +/-0.05 psi.`);
  assumption(r,'operatingPressure',0,'Atmospheric app starting point replaces the legacy 0.05 bar setting, which exceeds the documented process/interlock limit. Zero is not a manufacturer-recommended culture setpoint.',iflex,9,'PE001 process range and atmospheric zero adjustment');
  r.notes.push('Archived local March 2025 edition confirms existing working volumes, diameters, impeller geometry, power numbers, bag film and maximum RPM. Replaces the assumed 0.5 bar warning ceiling with the page 9 bag pressure process/interlock limit; default pressure reset to atmospheric. Individual MFC ranges are not combined into an unsupported total vvm limit.');
  r.notes.push('Published 2:1 is TOTAL vessel height/diameter, not liquid H/D; the liquid geometry remains estimated. No 200/2000 L table values are extrapolated to 50 or 1000 L.');
});
const wave=get('cytiva-wave-25');
wave.label='Cytiva ReadyToProcess WAVE 25 - 20 L Cellbag, 2-10 L working volume';
table(wave,{minVolume:2,maxVolume:10,nominalVolume:20,totalVolume:20},doc('cytiva-wave-25-engineering-characterization'),2,'Materials and methods - Operating parameters','Manufacturer application note explicitly calls 2 L and 10 L the minimal and maximal levels of the 20 L bag. Selected this documented bag configuration, replacing the mixed 0.3-25 L platform envelope.');
wave.notes.push('The WAVE 25 name is a platform name, not a 25 L bag capacity. This preset now represents the 20 L Cellbag studied by the manufacturer. Other bag/tray sizes require separate presets. Rocking is still approximated by a stirred-tank model; do not interpret placeholder impeller fields as physical specifications.');
// Separate, explicitly versioned Mobius family. Never copy this evidence into iFlex.
const mobius2021=doc('merck-mobius-2021-sp1237en00-v4-');
[50,200,1000,2000].forEach((size,i)=>{
  const r={manufacturer:'Merck',id:`merck-mobius-2021-${size}`,label:`Mobius ${size} L - 2021 specification (NOT iFlex)`,profile:'mammalian',sourceRecord:`?id=merck-mobius-2021-${size}`,links:[],notes:[],evidence:{},sourceSupportedFields:[],audit:{date:'2026-09-11',gap:genericGap},defaults:{heightDiameterRatio:2,impellerType:'pitched',impellerCount:1,powerNumber:.4,baseRpm:i<2?50:40,maxRpm:250,baseVvm:.05,maxVvm:.3,baffled:false,maxPressure:.5,operatingPressure:0}};
  records.push(r);
  table(r,{minVolume:size/5,maxVolume:size,nominalVolume:size,totalVolume:[60,250,1250,2500][i],vesselDiameter:[.34,.54,.92,1.16][i],impellerDiameter:[.1085,.1828,.2794,.3302][i],impellerType:'pitched',powerNumber:[3.2,4,3.5,3.3][i],maxRpm:[300,140,100,90][i],maxPressure:.017,baffled:true},mobius2021,2,`Specifications, Mobius ${size} L column`,'SP1237EN00 Ver. 4.0, October 2021. Four blades at 13 degree pitch; bottom mounting 15 degrees from centre; X-baffle. Maximum pressure converted from 17 mbar to 0.017 bar. These values do not apply to iFlex.');
  r.evidence.vesselDiameter.note='The manufacturer row says Diameter; inside/outside convention is not explicit. Used as the model chamber diameter provisionally. This is not the external skid width on page 3.';
  r.evidence.impellerDiameter.note='Absolute tabulated dimension converted from cm to m. Prefer this over the rounded 0.3 impeller/vessel ratio, which does not reproduce all listed dimensions.';
  set(r,'material',`${i<2?'PureFlex':'PureFlex Plus'} bag film; polypropylene impeller`,mobius2021,4,`Materials of Construction, Mobius ${size} L column`,'Bag film and main impeller material; 304L steel describes support hardware, not the product-contact bag. Other wetted components are listed separately in the original table.');
  assumption(r,'baseRpm',i<2?50:40,'Editable app starting point within the manufacturer operating range; not a published process setpoint.');
  assumption(r,'operatingPressure',0,'Atmospheric starting pressure selected by the app; below the documented 0.017 bar maximum.');
  r.notes.push('Separate 2021 Mobius model, not Mobius iFlex. User-supplied original archived unchanged; original publisher download URL was not provided.',`Published agitation range: ${[30,30,10,10][i]}-${[300,140,100,90][i]} rpm. Nominal total H:D is 2:1; no direct liquid height is specified. Liquid height and liquid H:D remain cylinder estimates.`, 'Single-impeller count is a model interpretation of the bottom-mounted design. Starting gas rates and maximum vvm remain assumptions; individual filter/sparger flow limits are not summed into an unsupported total.', 'Page 3 equipment dimensions are external assembly dimensions, not liquid geometry. Jacket pressure is not the vessel operating limit.');
});
// AN12431EN characterization evidence and its cited manufacturer follow-up guide.
const an=doc('merck-an12431-v1-2023-'),pg=doc('merck-iflex-pg12163-rev2-2024-');
const three=get('merck-mobius-3');
set(three,'powerNumber',.3,an,2,'Table 1, 3 L column','Published characterization value for the up-pumping, three-blade marine design; replaces generic 0.4. Not a universal value for other impellers or flow regimes.');
assumption(three,'impellerCount',1,'One shaft-mounted impeller is depicted/described in Table 1 and Figure 1. Replaces generic two-impeller scaling; count is a design interpretation, not an explicit numeric count specification.',an,2,'Table 1 and Figure 1');
three.evidence.vesselDiameter.note+=' Conflict retained: AN12431EN (July 2023), Table 1, gives 137 mm; its cited SP2345000 Rev. B (August 2010) also explicitly gives 137 mm inner diameter. Selected 135 mm from the newer dedicated May 2023 datasheet. No manufacturer correction or revision explanation found; not resolved by averaging.';
three.notes.push('AN12431EN p. 2 supports Np 0.3. Diameter disagreement is an edition-level conflict: 135 mm in DS26770000 (2023) versus 137 mm in SP2345000 (2010) and AN12431EN (2023). No geometric correction is claimed. AN12431EN p. 4 includes 400 rpm at 2.4 L as a performance point, not a verified universal motor limit; the RPM ceiling remains an app assumption.');
[50,1000].forEach((size,i)=>{
  const r=get('merck-iflex-'+size);
  r.label=`Mobius iFlex ${size} L - development design (2023/2024 evidence)`;
  r.audit.developmentDesign=true;
  const warning='DEVELOPMENT DESIGN: source table marks this size in development. These are manufacturer characterization-design values, not confirmed released-equipment specifications. No transfer from the older non-iFlex Mobius family.';
  table(r,{minVolume:i?200:15,maxVolume:size,nominalVolume:size,vesselDiameter:i?.919:.340,impellerType:'pitched',powerNumber:3.6,baffled:true},an,2,`Table 1, ${size} L column (asterisk: in development)`,warning+' Four-blade down-pumping pitched impeller; X-baffle; bottom mounted 15 degrees from centre.');
  set(r,'impellerDiameter',i?.311:.117,pg,4,`Table 1, ${size} L column, Impeller Diameter (cm)`,warning+' Direct absolute dimension from March 2024 guide; preferred to multiplying rounded di:D ratios from the application note.');
  assumption(r,'impellerCount',1,'Single bottom-mounted design interpreted from Table 1 and Figure 1; not an explicitly tabulated impeller count. Development-design qualification applies.',an,2,'Table 1 and Figure 1');
  r.notes.push(warning,'AN12431EN p. 4 RPM/PV pairs are characterization points, not motor-speed ratings. Existing RPM and pressure ceilings remain unverified assumptions. Absolute impeller diameters are from PG12163EN Rev. 2 p. 4; liquid heights remain cylinder estimates.');
});
for(const size of [200,2000])get('merck-iflex-'+size).notes.push('AN12431EN (July 2023), Table 1 p. 2, corroborates working range, vessel diameter, pitched-blade geometry and power number. The March 2025 dedicated datasheet remains preferred. PG12163EN Rev. 2 p. 4 gives 21.1 cm for the 200 L impeller versus the selected 21.0 cm in the 2025 datasheet; do not mix editions silently.');
for(const r of [three,...[50,200,1000,2000].map(s=>get('merck-iflex-'+s))])r.notes.push('Geometry caution: AN12431EN p. 2 prints minimum/maximum liquid-height ratios greater than one; PG12163EN p. 4 repeats this. A reversed ratio heading is plausible but unconfirmed. The maximum-fluid/total-height ratio 0.8 is nominal, not an absolute liquid-height measurement. Neither ratio overwrites the existing liquid-height calculation. Validation scope and conflicts: sources/AN12431-REVIEW.md.');
// Thermo gap review: pressure limits, detailed SUB geometry, and large DynaDrive.
for(const size of [30,300]){
 const r=get('thermo-suf-'+size);
 set(r,'maxPressure',.03,suf,21,'Section 1.4.2 Operating pressure, printed p. 16','Manufacturer prints 0.03 bar (0.5 psi). Use the explicit bar limit; the parenthetical conversion is rounded. BPC operating limit, not jacket pressure or vessel design rating.');
 assumption(r,'operatingPressure',0,'Atmospheric app starting value replaces 0.1 bar, which exceeds the published BPC limit. Not a manufacturer process setpoint.',suf,21,'Section 1.4.2');
}
for(const size of [50,500]){
 const r=get('thermo-dynadrive-'+size);
 assumption(r,'maxPressure',.03,'Conflict: PDF p. 6 states 34 mbar, while p. 8 states 30 mbar; both print 0.5 psi. The simulator selects the lower 0.030 bar ceiling pending clarification. This is a conservative choice, not a resolved manufacturer rating. Inlet and jacket limits are distinct.',dy,8,'BPC operating limits; compare PDF p. 6 burst warning');
 assumption(r,'operatingPressure',0,'Atmospheric app starting value replaces 0.05 bar, above both published BPC limits. Not a manufacturer process setpoint.',dy,8,'BPC operating limits');
}
const subGuide=doc('thermo-sub-5to1-user-guide-');
[50,100,250,500,1000,2000].forEach((size,i)=>{
 const r=get('thermo-sub-'+size),page=142+3*i;
 table(r,{minVolume:size/5,maxVolume:size,nominalVolume:size,totalVolume:[65.5,120,316,660,1320,2575][i],vesselDiameter:[.349,.438,.597,.7556,.959,1.194][i],liquidHeight:[.521,.660,.914,1.1336,1.422,1.787][i],heightDiameterRatio:1.5,impellerDiameter:[.1111,.146,.200,.251,.321,.397][i],impellerCount:1,impellerType:'pitched',powerNumber:2.1,baffled:false},subGuide,page,`Table 4.${1+2*i}, ${size} L, printed p. ${page-5}`,'DOC0022 Rev. H (February 2021). Direct BPC chamber diameter and rated-volume liquid height. One three-blade 45-degree down-pumping impeller. Np 2.1 is manufacturer-calculated, not an independent measured power coefficient. Absolute dimensions take precedence over rounded ratios; 1.5 is the rounded fluid H/D.');
 set(r,'maxPressure',.03,subGuide,9,'BPC operating limits, printed p. 4','Explicit 0.03 bar (0.5 psi) BPC pressure ceiling. Bar value retained; not water-jacket or sparger-inlet pressure.');
 assumption(r,'operatingPressure',0,'Atmospheric app starting value; replaces a default above the published BPC limit. Not a manufacturer culture setpoint.',subGuide,9,'BPC operating limits');
 const ceiling=[107,85,69,59,50,44][i];
 assumption(r,'maxRpm',ceiling,'The app has one constant ceiling, but PDF p. 119 limits 20-50% fill to 20 W/m3. Select the published 20%-fill nominal RPM across the range, rather than misrepresenting the motor maximum as valid at every fill. Full fill allows higher RPM. Published RPM values are rounded and assume water-like fluid.',subGuide,119,`Table 3.3, ${size} L, 20% volume / 20 W/m3`);
 if(r.defaults.baseRpm>ceiling)assumption(r,'baseRpm',ceiling,'Starting RPM lowered to the selected constant low-fill ceiling; not a separately sourced process setpoint.');
 r.notes.push(`Detailed guide motor speed ceiling: ${[200,200,150,150,110,75][i]} rpm. Simulator constant ceiling: ${ceiling} rpm, selected for minimum fill. The actual operating envelope needs a fill-dependent governor; no such governor was added. Table 3.3 p. 119 uses 39.8 cm for the 2000 L impeller, versus 39.7 cm in Table 4.11; the detailed hardware dimension is selected. Product-contact film remains configuration-dependent.`);
});
const big=doc('thermo-dynadrive-3000-5000-setup-es-');
[3000,5000].forEach((size,i)=>{
 const r=get('thermo-dynadrive-'+size),H=i?3.42:2.05;
 table(r,{minVolume:250,maxVolume:size,nominalVolume:size,totalVolume:i?5585:3730,vesselDiameter:1.37,liquidHeight:H,impellerDiameter:.49,impellerCount:i?5:3},big,48,`Table 4.1, ${size} L column; printed p. 46`,'DOC0176ES Rev. A, February 2022. Spanish original. Direct metric dimensions; 137 cm chamber and 49 cm impeller span both columns. Hardware combines modified two-blade impellers with one two-blade sweep impeller; count totals the assemblies, not blades.');
 set(r,'heightDiameterRatio',H/1.37,big,48,'Table 4.1 liquid height and chamber diameter','Published fluid ratios 1.7/2.9 do not match the absolute dimensions. Keep direct heights/diameter, calculate their quotient, and preserve the inconsistency.',{status:'Derived / estimated',rule:'liquid H/D = published liquid height / published chamber diameter',calculation:`${H} / 1.37 = ${H/1.37}`});
 assumption(r,'impellerType','pitched','Mixed modified pitched-blade plus sweep arrangement cannot be represented exactly by the generic single-type simulator. Generic Np remains unverified.',big,48,'Table 4.1 Propulsor');
 assumption(r,'maxRpm',85,'Table 4.1 gives VFD range 0-85 rpm; Table 4.2 on p. 49 gives motor speed 0-90 rpm. Lower ceiling chosen pending clarification. Recommended culture minimum is >30 rpm, not a guaranteed safe range for all conditions.',big,48,'Table 4.1 agitation; compare Table 4.2 p. 49');
 set(r,'maxPressure',.034,big,49,'Table 4.2 Presion maxima de la bolsa','Direct maximum bag pressure 34 mbar (0.5 psi), converted to 0.034 bar; not condenser TCU or jacket pressure.');
 assumption(r,'operatingPressure',0,'Atmospheric app starting value replaces 0.05 bar, above the published bag limit; not a recommended culture setpoint.',big,49,'Table 4.2 bag pressure');
 r.notes.push('Dedicated setup guide explicitly specifies 250 L minimum for BOTH sizes. Do not infer 240 L for the 3000 L system from the rounded 12.5:1 brochure ratio. Geometry-ratio and RPM inconsistencies are preserved in field evidence. Support-vessel steel is not evidence of product-contact bag material.');
});
// User-supplied technical-specification screenshots; edition and page numbers unknown.
const excerpt=section=>{const d=docs.find(d=>d.file?.startsWith('sartorius-ambr15-gen2-excerpt-'+section));if(!d)throw Error('Missing Ambr excerpt '+section);return {title:d.title,file:d.file,sha256:d.sha256,url:d.url,format:'png',excerpt:true};};
const av=excerpt('vessel'),ao=excerpt('operating'),ac=excerpt('cover');
const provenance='User-supplied screenshot excerpt from Scribd; Sartorius Ambr 15 Cell Culture Generation 2 Technical Specification. Revision, publication date and page number unknown; not a complete original PDF.';
table(ar,{minVolume:.01,maxVolume:.015,totalVolume:.018,material:'Polycarbonate / polyethylene',impellerType:'pitched',impellerDiameter:.0114,powerNumber:2.15},av,null,'Microbioreactor vessel table',provenance);
set(ar,'maxRpm',2500,ao,null,'System operating parameters: agitation speed 150-2500 rpm',provenance+' Conflicts with archived brochure PDF p. 10 (150-2000 rpm). Technical-specification excerpt selected by user; edition chronology and installed-hardware applicability unresolved.');
// A fixed VVM ceiling is conservative at the maximum volume, not the exact variable envelope.
assumption(ar,'maxVvm',1/15,'Published maximum total gas flow is 1 mL/min. Constant simulator ceiling selected at 15 mL: 1/15 vvm. At 10 mL the physical flow limit corresponds to 0.1 vvm; the app does not enforce a volume-dependent absolute-flow cap. '+provenance,ao,null,'Maximum air or total gas flow');
assumption(ar,'baseVvm',.05,'Selected starting aeration below the conservative constant ceiling; not a manufacturer setpoint.',ao,null,'Maximum air or total gas flow');
ar.technicalSpecifications={internalDimensionsMm:{length:28,width:14.6,height:59.7},agitationRpm:{min:150,max:2500},maxTotalGasFlowMlMin:1,klaBenchmark:{perHour:17.6,volumeMl:13,fluid:'DI water',rpm:1500,gasFlowMlMin:1,sparged:true},temperatureStandardC:{min:33,max:40,accuracy:.5,aboveAmbient:8},temperatureCooledC:{min:20,max:40,accuracy:.5},temperatureShiftCPer30MinMinimum:5,phSetpoint:{min:6.5,max:7.5},phMonitoring:{min:6,max:8,accuracy:.1},doMonitoringPercentAirSaturation:{min:0,max:200,accuracyAt100:2},documents:{vessel:av,operating:ao,cover:ac}};
ar.notes.push(provenance,
 'Internal L x W x H = 28.0 x 14.6 x 59.7 mm. These are non-cylindrical vessel dimensions, not a tank diameter or working liquid height. Existing cylinder geometry remains an unverified simulation approximation.',
 'kLa benchmark: 17.6 per hour, sparged vessel, 13 mL DI water, 1500 rpm, 1 mL/min gas. Reference condition only; no universal kLa calibration or RPM rating inferred.',
 'Operating excerpt: agitation 150-2500 rpm; maximum air or total gas 1 mL/min. Brochure says 150-2000 rpm; source conflict unresolved. Existing app has no minimum-RPM or fill-dependent gas-flow enforcement.',
 'Standard culture temperature 33-40 C +/-0.5 C (+8 C above ambient); cooled 20-40 C +/-0.5 C; temperature shift >=5 C per 30 minutes. pH setpoint 6.5-7.5, monitoring 6.0-8.0 +/-0.1; DO monitoring 0-200% air saturation, accuracy +/-2% at 100%. Monitoring ranges are not control or inlet-gas limits.',
 'No pressure rating is stated in these excerpts; retained pressure ceiling remains an unverified app assumption. Cover excerpt: '+ac.file);
// Historical manufacturer-authored characterization: do not merge different editions/configurations.
const dw=doc('sartorius-dewilde-scalability-2014-');
for(const id of ['sartorius-ambr-250','sartorius-univessel-su-2',...[50,200,500,1000,2000].map(s=>'sartorius-str-gen3-'+s)]){
 const r=get(id);
 r.supplementalSources=[{...dw,page:2,locator:'Table 1; printed p. 15',scope:'Historical comparison only; not blanket validation of current model'}];
 r.notes.push('Reviewed De Wilde et al., Superior Scalability of Single-Use Bioreactors, BPI September 2014, PDF pp. 1-6 (printed 14-19). Manufacturer-authored characterization article, not a current hardware datasheet. Archived source: '+dw.file);
 if(id==='sartorius-ambr-250')r.notes.push('Historical ambr250 cell-culture evidence is not matched to this microbial dual-Rushton Modular preset. Table 1 reports 60-250 mL working, 360 mL total, vessel D 62.5 mm, liquid height 90 mm and impeller D 26 mm. These values are NOT applied. The article draws ambr characterization from Bareither et al. 2013, reference 20; 200-800 rpm are study conditions, not hardware ratings.');
 else {
  assumption(r,'powerNumber',r.defaults.powerNumber,'De Wilde 2014 PDF p. 5 reports torque-based Ne about 1.3 for the TWO three-blade segment impeller configuration in turbulent flow (Re >10000), not an unambiguous per-impeller coefficient. Retained app coefficient is unverified; do not silently apply configuration-level Ne to each impeller or transfer it to mixed impellers.',dw,5,'Process engineering characterization, printed p. 18');
  if(id==='sartorius-univessel-su-2')r.notes.push('2014 Table 1 corroborates 130 mm vessel and 54 mm impeller diameters, but states 1 L minimum and 3 L total versus selected datasheet 0.6 L and 2.6 L. Keep the selected datasheet values. Historical liquid height 177 mm, vessel height 240 mm and spacing 70 mm remain unapplied pending configuration equivalence; current liquid height remains a cylinder estimate.');
  else r.notes.push('2014 Table 1 corroborates current selected absolute vessel/impeller diameters and liquid height. Current Generation 3 datasheet remains controlling; historical 25% minimum fills, sparger details and process-study speeds do not override current limits. Article text p. 4 says vessel H/D 2:1 whereas Table 1 lists 1.8; neither is substituted for liquid H/D.');
 }
}
// Finalize every record, including unresolved families, without upgrading guesses.
for(const r of records){
  if(r.manufacturer==='Custom'){r.status='Custom template';continue;}
  if(r.vesselDiameter && r.liquidHeight == null){
    const D=r.vesselDiameter,V=r.maxVolume/1000,H=4*V/(Math.PI*D*D),e=r.evidence.vesselDiameter;
    const extra={status:'Derived / estimated',rule:'H = 4 V / (pi D^2); liquid H/D = H / D',calculation:`V = ${V} m3; D = ${D} m; H = ${H} m; H/D = ${H/D}`};
    set(r,'liquidHeight',H,e.document,e.page,e.locator,'Ideal-cylinder estimate from published diameter and working volume. Ignores tapered walls, curved bottoms and internals; not a manufacturer liquid-height specification.',extra);
    set(r,'heightDiameterRatio',H/D,e.document,e.page,e.locator,'Derived liquid aspect ratio. Does not reuse an overall vessel ratio or generic profile ratio as if it described the liquid.',extra);
  }
  r.sourceSupportedFields=Object.keys(r.evidence).filter(k=>r.evidence[k].status==='Source-supported');
  r.status=r.sourceSupportedFields.length?'Field-level manufacturer evidence; remaining values unverified':'Unverified preset - primary specification gaps';
  if(r.audit.developmentDesign)r.status='Development-design evidence (2023/2024), not verified released-equipment specifications';
  r.volumeBasis=['minVolume','maxVolume','nominalVolume','totalVolume'].map(k=>{let e=r.evidence[k];return `${k}: ${e?.document ? e.document.title+(e.page?', PDF p. '+e.page:', page unknown') : 'model assumption'}${e?.approximate?' (published approximate value)':''}`;}).join('. ');
  r.materialBasis=r.evidence.material.document?`${r.evidence.material.document.title}${r.evidence.material.page?', PDF p. '+r.evidence.material.page:', page unknown'}. ${r.evidence.material.note}`:genericGap;
  // Discard stale free-form claims; baseline preserves the historical rationale.
  r.notes=r.notes.filter(n=>!/engineering estimate|assumed|derived minimum|turndown|approximately|5:1/i.test(n)||n.includes('2026-09-11')||n.includes('family envelope'));
  r.notes.push(genericGap);
}
write('sources/vessel-records.json',JSON.stringify(records,null,2)+'\n');
write('sources/source-records.payload',pack(JSON.stringify(records))+'\n');
let runtime=unpack(fs.readFileSync(path.join(backup,'vessel-catalog.payload'),'utf8'));
const catalog={};for(const r of records)(catalog[r.manufacturer]??=[]).push({...r,...r.defaults,sourcePage:`sources/pdfs/${r.id}.pdf`});
runtime=runtime.replace(/const VESSEL_CATALOG = [\s\S]*?\n  const PROFILE_DEFAULTS/,`const VESSEL_CATALOG = ${JSON.stringify(catalog)};\n  const PROFILE_DEFAULTS`);
runtime=runtime.replace('Math.max(selectedVessel.nominalVolume, maxVolume)','Math.max(selectedVessel.totalVolume ?? selectedVessel.nominalVolume, maxVolume)')
 .replace('const diameter = Math.cbrt','const diameter = selectedVessel.vesselDiameter ?? Math.cbrt')
 .replace('const liquidHeight = diameter * ratio;','const liquidHeight = selectedVessel.liquidHeight ?? diameter * ratio;')
 .replace('const impellerDiameter = Math.max(diameter * 0.33, 0.001);','const impellerDiameter = selectedVessel.impellerDiameter ?? Math.max(diameter * (selectedVessel.impellerRatio ?? 0.33), 0.001);');
runtime=runtime.replace('    const grid = document.createElement("div");',`    // Manufacturer decimals and small-volume presets need non-quantized controls.
    ["totalVolume", "initialVolume", "maxWorkingVolume", "vesselDiameter", "liquidHeight", "impellerDiameter", "heightDiameterRatio", "maxPressure", "operatingPressure"].forEach(id => {
      const input = document.getElementById(id); if(input) input.step = "any";
    });
    const grid = document.createElement("div");`);
write('vessel-catalog.payload',pack(runtime)+'\n');
const context={window:{}};vm.runInNewContext(read('source-derivations.js'),context);const d=context.window.FermentationSourceDerivations;
const sheets=records.map(r=>({...r,parameters:d.allParameters(r)}));
write('sources/audited-sheets.json',JSON.stringify(sheets,null,2)+'\n');
const changes=[];
for(const r of records){const old=before.find(o=>o.id===r.id);for(const p of d.allParameters(r)){const prev=old?d.valueFor(old,p.key):null,next=d.valueFor(r,p.key);if(prev!==next)changes.push({id:r.id,parameter:p.key,before:prev,after:next,status:p.status,reason:p.explanation.rationale});}}
const counts={};for(const r of sheets)for(const p of r.parameters)counts[p.status]=(counts[p.status]||0)+1;
write('sources/audit-results.json',JSON.stringify({date:'2026-09-11',presets:records.length,counts,changes,unresolved:records.filter(r=>r.manufacturer!=='Custom'&&!r.sourceSupportedFields.length).map(r=>r.id)},null,2)+'\n');
console.log(JSON.stringify({presets:records.length,counts,changes:changes.length}));
