import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readRoute,routeSearch} from '../desk.mjs';
import {setupIssues} from '../guidance.mjs';
import {screenView} from '../screen.mjs';
import {conversionPreview} from '../import-ui.mjs';
import {newCampaign,activeRound} from '../data.mjs';
import {newRecipe} from '../importer.mjs';
import {parseCSV} from '../io.mjs';
import {analyze} from '../core.mjs';
const text=name=>readFileSync(new URL('../example/'+name,import.meta.url),'utf8');
test('record URLs round-trip identifiers and search text without injecting a destination',()=>{
 const c={id:'campaign #1'},r={id:'round &2'},ui={analysisId:'run/3',plate:'P 01',well:'A01',filter:'all',search:'C11 & stock/#',setupStep:2};const p=readRoute(routeSearch(c,r,ui));assert.equal(p.campaign,c.id);assert.equal(p.round,r.id);assert.equal(p.search,ui.search);assert.equal(p.analysis,ui.analysisId);assert.equal(p.brief,'2');assert.deepEqual(readRoute('?action=export&redirect=https://example.com'),{});
});
test('guided brief requires meaningful identity, goal, units and comparison while retaining answers',()=>{
 const c=newCampaign(),r=activeRound(c);assert.ok(setupIssues(c,r,1).some(x=>x.path==='brief.parent'));r.brief.parent='LipA';r.brief.objective='Useful product rate';assert.equal(setupIssues(c,r,1).length,0);assert.deepEqual(setupIssues(c,r,2),[]);assert.ok(setupIssues(c,r,3).some(x=>x.path==='brief.units'));Object.assign(r.brief,{metric:'Rate',units:'µM/min',conditions:'Matched reference conditions'});const before=JSON.stringify(c);assert.deepEqual(setupIssues(c,r,3),[]);assert.equal(JSON.stringify(c),before);
});
test('screen inspector keeps raw measurements and incomplete evidence separate from nominations',()=>{
 const c=newCampaign(),r=activeRound(c),config=JSON.parse(text('assay.json')),files=Object.fromEntries(['measurements.csv','plate_map.csv','clone_register.csv'].map(n=>[n,parseCSV(text(n),n)])),result=analyze(files,config);r.analyses.push({id:'run1',createdAt:'2026-09-09',label:'Test',result,inputFiles:{}});const well=result.wells.find(w=>w.clone_id==='C11'),html=screenView(c,r,{analysisId:'run1',plate:well.plate_id,well:well.well,filter:'retest_candidate'});assert.ok(html.includes('Raw reaction traces for C11'));assert.ok(html.includes('Raw observations and fitting times'));assert.ok(html.includes('Independent confirmation is incomplete'));assert.ok(html.includes('Controls, settings and file provenance'));assert.ok(html.indexOf('Candidate review')<html.indexOf('id="clone-inspector"'));assert.equal((html.match(/data-action="clone"/g)||[]).length,2);
});
test('conversion preview shows actual source time units and preserves the uploaded text',()=>{
 const config=JSON.parse(text('assay.json')),originals=[{name:'measurements.csv',text:'time_s,signal\n0,0.1\n0.5,0.2\n1,0.3'}],recipe=newRecipe(originals,config);recipe.timeUnit='minutes';const before=JSON.stringify(originals),html=conversionPreview({originals,recipe});assert.ok(html.includes('Source value (minutes)'));assert.ok(html.includes('<td>30</td>'));assert.ok(html.includes('<td>60</td>'));assert.equal(JSON.stringify(originals),before);recipe.timeUnit='';assert.ok(conversionPreview({originals,recipe}).includes('Choose the time unit'));
});
