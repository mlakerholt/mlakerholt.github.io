// Run separately from the numerical suite; requires Playwright + Chromium.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../..',import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'};
const server=createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),path=resolve(root,'.'+rel+(rel.endsWith('/')?'index.html':''));if(!path.startsWith(root))throw Error();res.setHeader('Content-Type',mime[extname(path)]||'text/plain');res.end(await readFile(path));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.EVOZYME_TEST_URL||`http://127.0.0.1:${server.address().port}/apps/evozyme/`;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.EVOZYME_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const goto=async route=>{await page.goto(base+'#'+route);await page.waitForSelector('h1');await page.waitForTimeout(30);};
 await goto('start');assert.match(await page.locator('h1').innerText(),/one decision/);
 await page.screenshot({path:'/tmp/evozyme-start.png',fullPage:true});
 const {lessons}=await import('../teaching/content.mjs'),{labs}=await import('../teaching/labs.mjs');
 for(const l of lessons){await goto('course/'+l.slug);assert.ok(await page.locator('.exercise').count());}
 await goto('course/define');await page.locator('[data-reveal]').click();assert.equal(await page.locator('.feedback').isVisible(),false);await page.locator('input[type=radio]').first().check();await page.locator('[data-reveal]').click();assert.equal(await page.locator('.feedback').isVisible(),true);
 await page.locator('#lesson-note').fill('Test persistence <not markup>');await page.reload();assert.equal(await page.locator('#lesson-note').inputValue(),'Test persistence <not markup>');
 for(const [id]of labs){await goto('lab/'+id);assert.ok((await page.locator('#lab-output').innerText()).length>50,id);const input=page.locator('#lab-controls input[type=range]').first();if(await input.count()){await input.fill(await input.getAttribute('max'));await input.dispatchEvent('input');}assert.equal((await page.locator('#lab-output').innerText()).includes('NaN'),false,id);}
 await goto('lab/plate');await page.locator('[data-well=A1]').click();assert.match(await page.locator('#well-detail').innerText(),/normalized/);
 await goto('lab/epistasis');await page.locator('input[type=radio]').first().check();await page.locator('[data-reveal]').click();assert.equal(await page.locator('#double-value').innerText(),'0.82');await page.selectOption('[name=scenario]','sign');await page.locator('input[type=radio]').first().check();await page.locator('[data-reveal]').click();assert.equal(await page.locator('#double-value').innerText(),'2.1');
 await goto('lab/landscape');await page.locator('[data-measure="1"]').click();await page.reload();assert.equal(await page.locator('[data-measure="1"]').isDisabled(),true);
 await goto('cases/esterase');await page.locator('#next-round').click();assert.match(await page.locator('#round-message').innerText(),/prediction/);for(let r=0;r<5;r++){await page.locator('input[type=radio]').first().check();await page.locator('[data-reveal]').click();if(r<4)await page.locator('#next-round').click();}assert.equal(await page.locator('table tr').count(),6);
 await goto('cases/proxy');await page.selectOption('#proxy-design','direct');assert.match(await page.locator('#proxy-result').innerText(),/chemistry/);
 await goto('cases/tradeoffs');await page.selectOption('#process-choice','balanced');assert.match(await page.locator('#tradeoff-result').innerText(),/B is/);
 for(let i=1;i<=8;i++){await goto('failures/'+i);await page.locator('input[type=radio]').first().check();await page.locator('[data-reveal]').click();assert.equal(await page.locator('.feedback').isVisible(),true);}
 for(const id of ['help','assays','libraries','screening','statistics','advanced','sources','glossary']){await goto('reference/'+id);assert.ok((await page.locator('main').innerText()).length>100);}
 await page.fill('#glossary-search','epistasis');assert.ok(await page.locator('#glossary [data-term]:visible').count()>=1);
 await goto('plan');await page.fill('[name=project]','Browser test <safe>');await page.fill('[name=sites]','0');assert.equal(await page.locator('#export-md').isDisabled(),true);await page.fill('[name=sites]','3');assert.equal(await page.locator('#export-md').isDisabled(),false);
 const dlPromise=page.waitForEvent('download');await page.click('#export-json');const dl=await dlPromise,path=await dl.path();const exported=JSON.parse(await readFile(path,'utf8'));assert.equal(exported.plan.project,'Browser test <safe>');await page.fill('[name=project]','Changed');await page.setInputFiles('#import-plan',path);await page.waitForFunction(()=>document.querySelector('[name=project]').value==='Browser test <safe>');
 const mdPromise=page.waitForEvent('download');await page.click('#export-md');const md=await mdPromise;assert.match(await readFile(await md.path(),'utf8'),/Test persistence <not markup>/);
 await page.setViewportSize({width:390,height:844});for(const id of ['start','course/measure','lab/assay','lab/plate','lab/candidates','plan']){await goto(id);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' overflows');}await goto('start');await page.screenshot({path:'/tmp/evozyme-mobile.png',fullPage:true});
 await page.setViewportSize({width:1100,height:900});await goto('lab/assay');await page.screenshot({path:'/tmp/evozyme-assay.png',fullPage:true});
 await page.goto(base+'#library');await page.waitForURL('**/planner.html#library');
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));const blockedPage=await blocked.newPage();await blockedPage.goto(base+'#plan');assert.match(await blockedPage.locator('#save-status').innerText(),/unavailable/);assert.equal(await blockedPage.locator('#export-md').isDisabled(),false);
 assert.deepEqual(errors,[]);console.log('PASS: all teaching routes, interactions, persistence, exports/imports, mobile overflow, legacy redirect and blocked storage.');
}finally{await browser?.close();server.close();}
