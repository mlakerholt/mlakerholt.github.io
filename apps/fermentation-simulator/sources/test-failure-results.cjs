const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const elements=new Map();
function element(id) {
  if(!elements.has(id))elements.set(id,{id,handlers:{},textContent:'',innerHTML:'',open:false,opens:0,hidden:false,focus(){focused=id;},
    addEventListener(type,fn){this.handlers[type]=fn;},showModal(){this.open=true;this.opens++;},
    close(){this.open=false;},replaceChildren(){this.innerHTML='';},getBoundingClientRect(){return {left:1,right:10,top:1,bottom:10};}});
  return elements.get(id);
}
let focused=null;
const ctx={window:{},document:{getElementById:element}};
vm.runInNewContext(fs.readFileSync(__dirname+'/../failure-results.js','utf8'),ctx);
const ui=ctx.window.FermentationFailureResults,dialog=element('failureDialog');
assert.equal(dialog.opens,0,'No modal at module load');
const event={id:'ph-stress',title:'pH excursion',image:'ph',parameter:'ph',unit:'pH units',comparison:'outside',
  limit:[5.5,8],hours:.5,penalty:'stress',time:.5,value:5.4,threshold:5.5,deviation:.1,deviationPercent:1.8,
  triggerExposureHours:.5,exposureHours:1,worstValue:5.2,worstDeviation:.3,active:false,resolvedAt:1.1};
const result={summary:{batchFailed:true,cultureFailed:true,invalidExtrapolation:false},failures:{enabled:true,profile:{name:'E. coli'},events:[event,
  {...event,id:'low-do',title:'Oxygen limitation',image:'oxygen'},
  {...event,id:'ph-failure',title:'Prolonged pH excursion',penalty:'culture-failure',hours:2,time:2,triggerExposureHours:2,exposureHours:3,active:true,resolvedAt:null}]},
  warnings:[{title:'Base limited',message:'Base-pump capacity exceeded.',severity:'medium'},
    {title:'DO cascade exhausted',message:'Transfer controls reached their limits.',severity:'medium'},
    {title:'Model scope',message:'Calibrate the model.',severity:'low'},
    {title:'Washout risk',message:'Growth below dilution rate.',severity:'medium'},
    {title:'Feed pump limited',message:'Feed-pump capacity exceeded.',severity:'medium'}]};
const original=JSON.stringify(result);
const choose=id=>element('warningCategoryButtons').handlers.click({target:{closest:()=>({dataset:{warningCategory:id}})}});
const details=i=>element('warningList').handlers.click({target:{closest:()=>({dataset:{failureEvent:String(i)}})}});
ui.render(result);assert.equal(dialog.opens,0,'No automatic modal after a run');
assert.equal(ui.present,undefined,'The automatic presentation entry point is removed');
assert.equal(element('warningList').innerHTML,'','Warnings are not initially rendered');
assert(element('warningCategoryPanel').hidden);
const bar=element('warningCategoryButtons').innerHTML;
for(const label of ['pH: 3 warnings','Oxygen: 2 warnings','Model notes: 1 warning','Growth: 1 warning','Feed &amp; nutrients: 1 warning','Volume: 0 warnings'])assert(bar.includes(label),label);
assert(!bar.includes('Other'),'Fallback category is hidden when empty');
assert.match(bar,/id="warning-category-volume"[^>]+ disabled>/);
assert(!bar.includes('Base-pump capacity exceeded.'),'Category buttons contain only labels/counts');
choose('ph');assert(!element('warningCategoryPanel').hidden);assert.equal(dialog.opens,0);
assert.match(element('warningCategoryButtons').innerHTML,/id="warning-category-ph"[^>]+aria-expanded="true"/);
assert.equal(element('warningCategoryTitle').textContent,'pH · 3 warnings');
assert.equal(focused,'warning-category-ph');
assert.match(element('warningList').innerHTML,/Prolonged pH excursion/);
assert.match(element('warningList').innerHTML,/Base-pump capacity exceeded/);
assert(!element('warningList').innerHTML.includes('Transfer controls reached'));
details(2);assert(dialog.open);assert.equal(dialog.opens,1);
assert.match(element('failureDialogTitle').textContent,/Culture failed/);
assert.equal(element('failureDialogImage').src,'assets/failures/ph.png');
assert.match(element('failureDialogData').innerHTML,/120 min/);
assert.match(element('failureDialogData').innerHTML,/180 min/);
assert.match(element('failureDialogData').innerHTML,/0.1 pH units below boundary/);
assert.match(element('failureDialogPosition').textContent,/Event 1 of 2 in pH/);
assert(element('failureDialogPrevious').disabled);
element('failureDialogNext').handlers.click();assert.match(element('failureDialogTitle').textContent,/Severe stress/);
assert.match(element('failureDialogPosition').textContent,/Event 2 of 2 in pH/,'Navigation stays in the selected category');
assert.match(element('failureDialogStatus').textContent,/recovered at 1.1 h/);
element('failureDialogClose').handlers.click();assert(!dialog.open);
ui.render(result);assert.equal(dialog.opens,1,'Re-render/revisit does not reopen a modal');
assert(!element('warningCategoryPanel').hidden,'Same-result rendering preserves chosen category');
choose('oxygen');assert.equal(element('warningCategoryTitle').textContent,'Oxygen · 2 warnings');
assert(!element('warningList').innerHTML.includes('pH excursion'));
details(1);assert(dialog.open);assert.equal(element('failureDialogImage').src,'assets/failures/oxygen.png');
assert(element('failureDialogNext').disabled&&element('failureDialogPrevious').disabled);
element('failureDialogClose').handlers.click();
element('warningCategoryClose').handlers.click();assert(element('warningCategoryPanel').hidden);
assert.equal(focused,'warning-category-oxygen');assert.equal(element('warningList').innerHTML,'');
choose('model');assert.match(element('warningList').innerHTML,/Calibrate the model/);choose('model');
assert(element('warningCategoryPanel').hidden,'Clicking the same category collapses it');
choose('volume');assert(element('warningCategoryPanel').hidden,'Zero-count categories cannot open');
ui.reset();assert(!dialog.open);assert.equal(element('warningCategoryButtons').innerHTML,'');
const clean={summary:{},failures:{enabled:true,profile:{name:'E. coli'},events:[]}};
ui.render(clean);assert(!dialog.open);assert(element('warningCategoryPanel').hidden);
assert.equal((element('warningCategoryButtons').innerHTML.match(/: 0 warnings/g)||[]).length,8);
const hostile=structuredClone(result);hostile.failures.events[0].title='<img src=x onerror=alert(1)>';
hostile.warnings.push({title:'<img src=x onerror=alert(1)>',message:'<script>bad</script>',severity:'" bad'});
hostile.warnings.push({title:'constructor',message:'Unknown category names must not inherit object properties.',severity:'low'});
ui.render(hostile);assert(element('warningCategoryPanel').hidden);assert(!dialog.open,'Every new result starts collapsed');
choose('ph');assert(!element('warningList').innerHTML.includes('<img'));assert(element('warningList').innerHTML.includes('&lt;img'));
choose('other');assert(!element('warningList').innerHTML.includes('<script>'));assert(element('warningList').innerHTML.includes('&lt;script&gt;'));
assert.equal(element('warningCategoryTitle').textContent,'Other · 2 warnings');
const allTypes={...clean,warnings:[{title:'Maximum working volume exceeded'},{title:'Total vessel volume exceeded'},
  {title:'pH control insufficient'},{title:'Acid limited'},{title:'Overflow-metabolite accumulation'}],
  failures:{...clean.failures,events:[{...event,image:'substrate'},{...event,image:'starvation'},{...event,image:'shear'},
    {...event,image:'acetate'},{...event,image:'volume'},{...event,image:'hyperoxia'}]}};
ui.render(allTypes);const counts=element('warningCategoryButtons').innerHTML;
for(const label of ['Volume: 3 warnings','pH: 2 warnings','Metabolites: 2 warnings','Agitation: 1 warning','Feed &amp; nutrients: 2 warnings','Oxygen: 1 warning'])assert(counts.includes(label),label);
assert.equal(JSON.stringify(result),original,'Grouping does not mutate exported engine results');
assert(!fs.readFileSync(__dirname+'/../tmp/app-source.js','utf8').includes('FermentationFailureResults?.present'));
// Every illustrated failure keeps its category, dialog mapping and descriptive alternative text.
const illustrations={oxygen:['oxygen',/scientists and oversized microbial cells gasp for air/],
  hyperoxia:['oxygen',/giant floating bubbles/],ph:['ph',/indicator paper/],
  substrate:['feed',/sugar cubes/],acetate:['metabolites',/pickles/],
  starvation:['feed',/last drop/],shear:['agitation',/vortex/],volume:['volume',/mountain of foam/]};
for(const [image,[category,description]] of Object.entries(illustrations)) {
  ui.render({...clean,failures:{...clean.failures,events:[{...event,image}]}});
  assert(!dialog.open,'Illustrations must not reintroduce automatic popups');
  choose(category);details(0);
  assert(dialog.open);
  assert.equal(element('failureDialogImage').src,`assets/failures/${image}.png`);
  assert.match(element('failureDialogImage').alt,description);
  const png=fs.readFileSync(`${__dirname}/../assets/failures/${image}.png`);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),1536);
  assert.equal(png.readUInt32BE(20),1024);
  element('failureDialogClose').handlers.click();
}
console.log('PASS: collapsed-by-default category icons/counts, all warning types, severity order, scoped event navigation, accessible controls, zero/unknown categories, rerender/reset, no automatic popup, escaping and unchanged result data.');
console.log('PASS: all eight replacement illustrations, category-to-dialog mappings, descriptive alt text and 1536 x 1024 PNG assets.');
