import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newRecipe,transform,canonicalFiles,canonicalCSV,previewIssues,assignWells} from '../importer.mjs';
import {parseCSV,validateBackup} from '../io.mjs';
import {analyze} from '../core.mjs';
import {newCampaign,activeRound} from '../data.mjs';
import {criteriaResults} from '../guidance.mjs';
const text=name=>readFileSync(new URL('../example/'+name,import.meta.url),'utf8');
const config=JSON.parse(text('assay.json'));
const originals=['plate_map.csv','clone_register.csv','measurements.csv'].map(name=>({name,text:text(name)}));
const analysis=m=>analyze(Object.fromEntries(Object.entries(canonicalFiles(m)).map(([n,f])=>[n,parseCSV(f.text,n)])),config);
const sorted=m=>[...m].sort((a,b)=>(a.plate_id+a.well).localeCompare(b.plate_id+b.well)||a.time_s-b.time_s);
test('toolkit CSV and renamed long files preserve observations and numeric results',()=>{
  const recipe=newRecipe(originals,config),m=transform(originals,recipe,config);assert.deepEqual(previewIssues(m,config),[]);
  const renamed=originals.map((s,i)=>({...s,name:'export-'+i+'.csv'})),other=transform(renamed,newRecipe(renamed,config),config);
  assert.deepEqual(other,m);assert.deepEqual(analysis(m).candidates.filter(x=>x.decision==='retest_candidate').map(x=>x.clone_id),['C03','C11']);
});
function wide(){const long=transform(originals,newRecipe(originals,config),config),wells=[...new Set(long.measurements.map(x=>x.well))],times=[...new Set(long.measurements.map(x=>x.time_s))];const rows=times.map(t=>Object.fromEntries([['Minutes',t/60],...wells.map(w=>[w,long.measurements.find(x=>x.well===w&&x.time_s===t).signal])]));return{long,source:{name:'reader-export.csv',text:canonicalCSV(rows,['Minutes',...wells])}};}
test('wide minute export yields equivalent canonical observations and results; recipe replays',()=>{
  const {long,source}=wide(),files=[...originals.slice(0,2),source],recipe=newRecipe(files,config);Object.assign(recipe,{layout:'wide',wideTime:'Minutes',timeUnit:'minutes',plateId:'DEMO01'});recipe.sources[2].role='measurements';
  const result=transform(files,recipe,config);assert.deepEqual(sorted(result.measurements).map(({data_origin,...row})=>row),sorted(long.measurements).map(({data_origin,...row})=>row));assert.ok(result.measurements.every(row=>row.data_origin===config.data_origin));assert.deepEqual(analysis(result).candidates,analysis(long).candidates);assert.deepEqual(transform(files,JSON.parse(JSON.stringify(recipe)),config),result);
});
test('explicit decimal comma and separator work; mismatches are rejected',()=>{
  const files=[...originals.slice(0,2),{name:'locale.csv',text:'plate;well;minutes;reading\nDEMO01;A01;0,5;0,123\n'}],recipe=newRecipe(files,config);recipe.sources[2]={name:'locale.csv',role:'measurements',delimiter:';',columns:{plate_id:'plate',well:'well',time_s:'minutes',signal:'reading'}};Object.assign(recipe,{decimal:',',timeUnit:'minutes'});const m=transform(files,recipe,config);assert.equal(m.measurements[0].time_s,30);assert.equal(m.measurements[0].signal,.123);recipe.decimal='.';assert.throws(()=>transform(files,recipe,config),/invalid numeric/);recipe.signalUnit='RFU';assert.throws(()=>transform(files,recipe,config),/signal unit differs/);
});
test('preview locates wrong identities, duplicates and missing fit times',()=>{
  const m=transform(originals,newRecipe(originals,config),config),parent=m.map.find(x=>x.sample_type==='parent');parent.clone_id='OTHER';m.measurements.push(m.measurements[0]);m.measurements=m.measurements.filter(x=>x.well!=='A01'||x.time_s!==30);const errors=previewIssues(m,config).join(' ');assert.match(errors,/expected reference PARENT/);assert.match(errors,/Duplicate observation/);assert.match(errors,/A01: missing/);
});
test('bulk map editing requires identities and keeps a reproducible recipe without mutating input',()=>{
  const m=transform(originals,newRecipe(originals,config),config),before=structuredClone(m),values={plate:'DEMO01',wells:'H01, H02',sample_type:'candidate',clone_id:'X',prep_id:'XP1',stock_location:'box/X',parent_id:'PARENT',round:1,data_origin:'synthetic',assay_id:config.assay_id};assert.throws(()=>assignWells(m,{...values,prep_id:''}),/explicit/);const after=assignWells(m,values);assert.deepEqual(m,before);assert.deepEqual(after.map.filter(x=>['H01','H02'].includes(x.well)).sort((a,b)=>a.well.localeCompare(b.well)).map(x=>x.technical_rep),['1','2']);const recipe=newRecipe(originals,config);recipe.mapOverride=after.map;recipe.registerOverride=after.register;assert.deepEqual(transform(originals,recipe,config),after);
});
test('wide aliases do not silently duplicate wells',()=>{
  const files=[{name:'wide.csv',text:'time,A1,A01\n0,1,2\n'}],recipe=newRecipe(files,config);Object.assign(recipe,{layout:'wide',wideTime:'time',plateId:'P'});assert.throws(()=>transform(files,recipe,config),/duplicate well/);
});
test('a stale preset cannot silently substitute missing mapped columns',()=>{const recipe=newRecipe(originals,config);recipe.sources[2].columns.signal='old_signal_header';assert.throws(()=>transform(originals,recipe,config),/selected column old_signal_header/);});
test('backups validate original exports and mapping recipes',()=>{const c=newCampaign(),r=activeRound(c),recipe=newRecipe(originals,config);r.importProvenance={version:1,recipe,originals:originals.map(x=>({...x,sha256:'test'}))};c.mappingPresets=[{version:1,name:'Example',recipe}];assert.deepEqual(validateBackup(c).rounds[0].importProvenance,r.importProvenance);const bad=structuredClone(c);bad.rounds[0].importProvenance.originals[0].text=null;assert.throws(()=>validateBackup(bad),/invalid file/);const incompatible=structuredClone(c);incompatible.mappingPresets[0].recipe.version=99;assert.throws(()=>validateBackup(incompatible),/mapping recipe/);});
test('structured targets only compare compatible named confirmation observations',()=>{
  const r=activeRound(newCampaign());r.confirmation=parseCSV(text('confirmation.csv'));const assay=r.confirmation[0].assay_id;r.criteria={enabled:true,assayId:assay,normalization:'product',direction:'at_least',fold:1.2,notes:''};const results=criteriaResults(r);assert.match(results.find(x=>x.clone==='C03').status,/meets/);assert.match(results.find(x=>x.clone==='C11').status,/does not/);r.criteria.normalization='enzyme';assert.match(criteriaResults(r)[0].status,/Normalization differs/);r.criteria.normalization='product';r.criteria.assayId='missing';assert.match(criteriaResults(r)[0].status,/No observations/);assert.ok(r.evidence.every(e=>e.decision!=='confirmed'));
});
