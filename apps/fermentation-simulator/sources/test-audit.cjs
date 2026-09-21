const fs=require('fs'),z=require('zlib'),vm=require('vm'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
// Public releases retain citations/checksums but do not redistribute third-party originals.
// Missing originals remain an error unless the public-release check is explicitly requested.
const publicRelease=process.argv.includes('--public');
const records=JSON.parse(read('sources/vessel-records.json'));
assert.deepStrictEqual(records,JSON.parse(z.gunzipSync(Buffer.from(read('sources/source-records.payload').trim(),'base64'))));
const ctx={window:{},document:{createElement:()=>({}),head:{appendChild(){}},getElementById:id=>controls[id]},Event:class{},console};
const controls={};
vm.runInNewContext(read('source-derivations.js'),ctx);
let runtime=z.gunzipSync(Buffer.from(read('vessel-catalog.payload').trim(),'base64')).toString();
runtime=runtime.replace('  installManufacturerVesselSelector();','  window.testCatalog={VESSEL_CATALOG,applyVesselToForm,formatInputNumber};');
assert(runtime.includes('window.testCatalog='));vm.runInNewContext(runtime,ctx);
const d=ctx.window.FermentationSourceDerivations,c=ctx.window.testCatalog;
const mapping={minVolume:'initialVolume',maxVolume:'maxWorkingVolume',totalVolume:'totalVolume',heightDiameterRatio:'heightDiameterRatio',vesselDiameter:'vesselDiameter',liquidHeight:'liquidHeight',impellerDiameter:'impellerDiameter',impellerType:'impellerType',impellerCount:'impellerCount',powerNumber:'powerNumber',baseRpm:'baseRpm',maxRpm:'maxRpm',baseVvm:'baseVvm',maxVvm:'maxVvm',baffled:'baffled',maxPressure:'maxPressure',operatingPressure:'operatingPressure',maxOxygenFraction:'maxOxygenFraction'};
// Include the DOM methods used by the current impeller-configuration helper.
for(const id of Object.values(mapping))controls[id]={type:id==='baffled'?'checkbox':'text',dispatchEvent(){},setAttribute(name,value){this[name]=value;},closest(){return null;}};
let checked=0;
for(const r of records){
  assert(r.minVolume<=r.maxVolume,r.id+' volume range');
  assert(d.geometryFor(r).totalVolume>=r.maxVolume,r.id+' total');
  assert(r.defaults.baseRpm<=r.defaults.maxRpm,r.id+' rpm range');
  const entry=c.VESSEL_CATALOG[r.manufacturer].find(e=>e.id===r.id);assert(entry,r.id);
  c.applyVesselToForm(entry);
  for(const [key,id] of Object.entries(mapping)){
    const value=d.valueFor(r,key),expected=typeof value==='number'?c.formatInputNumber(value):value;
    assert.strictEqual(controls[id][id==='baffled'?'checked':'value'],id==='baffled'?!!expected:String(expected),r.id+' '+key);checked++;
  }
  for(const [key,e] of Object.entries(r.evidence||{})){
    if(e.status==='Source-supported')assert(e.document,r.id+' '+key+' missing source');
    if(e.document?.file&&!publicRelease){
      const bytes=fs.readFileSync(path.join(__dirname,'originals',e.document.file));
      assert.strictEqual(crypto.createHash('sha256').update(bytes).digest('hex'),e.document.sha256);
      if(e.document.file.endsWith('.pdf'))assert(Number.isInteger(e.page)&&e.page>0);
    }
  }
}
const ambr=records.find(r=>r.id==='sartorius-ambr-15');
assert.strictEqual(ambr.totalVolume,.018);
assert.strictEqual(ambr.impellerDiameter,.0114);
assert.strictEqual(ambr.defaults.powerNumber,2.15);
assert.strictEqual(ambr.defaults.maxRpm,2500);
assert.strictEqual(ambr.defaults.maxVvm,1/15);
assert(ambr.defaults.baseVvm<=ambr.defaults.maxVvm);
assert.strictEqual(ambr.technicalSpecifications.maxTotalGasFlowMlMin,1);
assert.notStrictEqual(d.statusFor(ambr,'vesselDiameter'),'Source-supported');
assert.notStrictEqual(d.statusFor(ambr,'liquidHeight'),'Source-supported');
assert.strictEqual(d.statusFor(ambr,'maxPressure'),'App assumption');
assert(ambr.evidence.maxRpm.note.includes('2000 rpm'));
if(!publicRelease)for(const doc of Object.values(ambr.technicalSpecifications.documents))assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'originals',doc.file))).digest('hex'),doc.sha256);
const g=records.find(r=>r.id==='thermo-glass-1');
assert.strictEqual(g.minVolume,.3);assert.strictEqual(g.maxVolume,.97);assert.strictEqual(g.totalVolume,1.42);
assert(d.explain(g,'minVolume').calculation.includes('manufacturer prints an approximate'));
assert(!d.explain(g,'minVolume').rule.includes('estimate'));
assert.strictEqual(d.statusFor(records.find(r=>r.id==='merck-iflex-50'),'minVolume'),'Source-supported');
assert.strictEqual(records.find(r=>r.id==='merck-iflex-50').minVolume,15);
for(const [i,size] of [50,1000].entries()){
  const r=records.find(r=>r.id===`merck-iflex-${size}`);
  assert.strictEqual(r.audit.developmentDesign,true);
  assert.strictEqual(r.impellerDiameter,i?.311:.117);
  assert.strictEqual(r.defaults.powerNumber,3.6);
  assert.strictEqual(r.defaults.impellerType,'pitched');
  assert.strictEqual(d.statusFor(r,'liquidHeight'),'Derived / estimated');
  assert.strictEqual(d.statusFor(r,'impellerCount'),'App assumption');
}
assert.strictEqual(records.find(r=>r.id==='merck-mobius-3').defaults.powerNumber,.3);
assert.strictEqual(records.find(r=>r.id==='merck-mobius-3').vesselDiameter,.135);
const sheets=JSON.parse(read('sources/audited-sheets.json'));
for(const size of [30,300]){
 const r=records.find(r=>r.id==='thermo-suf-'+size);
 assert.strictEqual(r.defaults.maxPressure,.03);assert.strictEqual(r.defaults.operatingPressure,0);
}
for(const size of [50,500]){
 const r=records.find(r=>r.id==='thermo-dynadrive-'+size);
 assert.strictEqual(r.defaults.maxPressure,.03);assert.strictEqual(d.statusFor(r,'maxPressure'),'App assumption');
 assert.strictEqual(r.defaults.operatingPressure,0);
}
for(const [i,size] of [50,100,250,500,1000,2000].entries()){
 const r=records.find(r=>r.id==='thermo-sub-'+size);
 assert.strictEqual(r.impellerDiameter,[.1111,.146,.2,.251,.321,.397][i]);
 assert.strictEqual(r.defaults.powerNumber,2.1);assert.strictEqual(r.defaults.baffled,false);
 assert.strictEqual(r.defaults.maxPressure,.03);assert.strictEqual(r.defaults.operatingPressure,0);
 assert.strictEqual(r.defaults.maxRpm,[107,85,69,59,50,44][i]);
 assert.strictEqual(d.statusFor(r,'liquidHeight'),'Source-supported');
}
for(const [i,size] of [3000,5000].entries()){
 const r=records.find(r=>r.id==='thermo-dynadrive-'+size);
 assert.strictEqual(r.minVolume,250);assert.strictEqual(r.vesselDiameter,1.37);
 assert.strictEqual(r.liquidHeight,i?3.42:2.05);assert.strictEqual(r.impellerDiameter,.49);
 assert.strictEqual(r.defaults.maxPressure,.034);assert.strictEqual(r.defaults.operatingPressure,0);
 assert.strictEqual(d.statusFor(r,'heightDiameterRatio'),'Derived / estimated');
 assert.strictEqual(d.statusFor(r,'maxRpm'),'App assumption');
}
for(const [i,size] of [200,2000].entries()){
  const r=records.find(r=>r.id===`merck-iflex-${size}`);
  assert.strictEqual(r.defaults.maxPressure,(i?.4:.5)*0.06894757293168);
  assert.strictEqual(r.defaults.operatingPressure,0);
  assert.strictEqual(d.statusFor(r,'maxPressure'),'Source-supported');
  assert.strictEqual(d.statusFor(r,'operatingPressure'),'App assumption');
  assert.strictEqual(d.statusFor(r,'liquidHeight'),'Derived / estimated');
  assert(r.evidence.maxPressure.document.file.includes('iflex-ds12340en-v4-2025'));
  assert.strictEqual(r.evidence.maxPressure.page,9);
}
for(const [i,size] of [50,200,1000,2000].entries()){
  const r=records.find(r=>r.id===`merck-mobius-2021-${size}`);
  assert.strictEqual(r.minVolume,size/5);assert.strictEqual(r.maxVolume,size);
  assert.strictEqual(r.impellerDiameter,[.1085,.1828,.2794,.3302][i]);
  assert.strictEqual(r.defaults.maxPressure,.017);
  assert(r.evidence.impellerDiameter.document.file.includes('mobius-2021'));
  const existing=records.find(r=>r.id===`merck-iflex-${size}`);
  assert(!JSON.stringify(existing).includes('mobius-2021'),'2021 evidence must not apply to iFlex');
}
for(const r of records)assert.strictEqual(JSON.stringify(d.allParameters(r)),JSON.stringify(sheets.find(s=>s.id===r.id).parameters));
console.log(`PASS: ${records.length} presets; ${checked} runtime/sheet control comparisons; ${publicRelease?'original-byte checks excluded for public release':'evidence hashes'}; key regressions; serialized sheets.`);
