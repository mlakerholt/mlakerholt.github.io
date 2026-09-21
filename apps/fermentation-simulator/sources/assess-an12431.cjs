// Check published calculation points against the actual simulator function.
// Not an empirical validation of kLa, mixing time or biological predictions.
const fs=require('fs'),z=require('zlib'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ctx={calc:require('../simulation-core.js').powerAndKla};
const records=JSON.parse(fs.readFileSync(path.join(__dirname,'vessel-records.json')));
// AN12431EN Table 2, p. 4: [working litres, W/m3, rpm, tip speed m/s].
const fixtures={
 'merck-mobius-3':[[1,10,141,.56],[1,50,241,.96],[1,100,304,1.21],[2.4,10,189,.75],[2.4,50,323,1.29],[2.4,95,400,1.60]],
 'merck-iflex-50':[[15,10,74,.45],[15,50,126,.77],[15,100,158,.97],[50,10,110,.68],[50,50,188,1.16],[50,100,237,1.46]],
 'merck-iflex-200':[[40,10,39,.43],[40,50,67,.73],[40,100,84,.92],[200,10,67,.73],[200,50,114,1.25],[200,100,144,1.58]],
 'merck-iflex-1000':[[200,10,34,.56],[200,50,59,.96],[200,100,74,1.21],[1000,10,59,.96],[1000,50,101,1.64],[1000,100,127,2.07]],
 'merck-iflex-2000':[[400,10,28,.59],[400,50,47,1.01],[400,100,60,1.27],[2000,10,47,1.01],[2000,50,81,1.72],[2000,100,102,2.17]]
};
const rows=[];
for(const [id,points] of Object.entries(fixtures)){
 const r=records.find(r=>r.id===id),reactor={...r,...r.defaults,spargerType:'open-pipe'};
 for(const [volumeL,publishedWm3,rpm,publishedTip] of points){
  const result=ctx.calc(reactor,volumeL,rpm,.1);
  const simulatedWm3=result.powerDensity*1000; // Runtime P/V is W/L.
  rows.push({id,sourcePage:4,volumeL,rpm,publishedWm3,simulatedWm3,powerDifferencePercent:100*(simulatedWm3/publishedWm3-1),publishedTip,simulatedTip:result.tipSpeed,tipDifferencePercent:100*(result.tipSpeed/publishedTip-1),exceedsPresetRpm:rpm>r.defaults.maxRpm});
 }
}
const report={scope:'Arithmetic consistency only. Published Table 2 values are calculations, not independent experimental measurements. Density 1000 kg/m3; selected preset impeller dimensions and count. No runtime limits changed to fit test points.',rows,maxAbsolutePowerDifferencePercent:Math.max(...rows.map(r=>Math.abs(r.powerDifferencePercent))),maxAbsoluteTipDifferencePercent:Math.max(...rows.map(r=>Math.abs(r.tipDifferencePercent)))};
fs.writeFileSync(path.join(__dirname,'AN12431-ARITHMETIC-CHECK.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({points:rows.length,maxPowerDifferencePercent:report.maxAbsolutePowerDifferencePercent,maxTipDifferencePercent:report.maxAbsoluteTipDifferencePercent,pointsAbovePresetRpm:rows.filter(r=>r.exceedsPresetRpm).length}));
