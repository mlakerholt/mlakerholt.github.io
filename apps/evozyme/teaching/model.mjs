// Deliberately transparent teaching models, not predictions of a real enzyme.
export const mean = xs => xs.reduce((a,b)=>a+b,0)/xs.length;
export const sd = xs => xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a,b)=>a+(b-mean(xs))**2,0)/(xs.length-1));
export function zPrime(pos,neg) { const gap=Math.abs(mean(pos)-mean(neg)); return gap ? 1-3*(sd(pos)+sd(neg))/gap : null; }
export function rng(seed=42) { let a=seed>>>0; return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}; }
export function normal(random) { return Math.sqrt(-2*Math.log(Math.max(random(),1e-12)))*Math.cos(2*Math.PI*random()); }
export function rate(s,kcat=21,km=3.8,enzyme=1) { return enzyme*kcat*s/(km+s); }
export function poisson(lambda) { const p=[Math.exp(-lambda)];for(let k=1;k<8;k++)p.push(p[k-1]*lambda/k);return [...p,Math.max(0,1-p.reduce((a,b)=>a+b,0))]; }
export function library({sites=3,alphabet=20,draws=1152,correct=.9,expressed=.7,functional=.8,scheme='balanced'}) {
  const space=alphabet**sites, usable=draws*correct*expressed*functional;
  // NNK/NNS: 12 amino acids at 1/32, 5 at 2/32, 3 at 3/32; one stop codon.
  let unique=0, stopFree=1;
  if(scheme==='NNK'||scheme==='NNS') {
    stopFree=(31/32)**sites;
    function visit(depth,p,multiplicity) { if(depth===sites){unique+=multiplicity*(-Math.expm1(usable*Math.log1p(-p)));return;}
      for(const [count,codons] of [[12,1],[5,2],[3,3]])visit(depth+1,p*codons/32,multiplicity*count);
    } visit(0,1,1);
  } else unique=space===1?(usable>0?1:0):space*(-Math.expm1(usable*Math.log1p(-1/space)));
  return {space,usable:usable*stopFree,unique,coverage:unique/space,stopFree};
}
export function assay(p) {
  const random=rng(35), residual=Math.exp(-Math.log(2)*p.duration/60*Math.exp((p.temperature-50)/10));
  const baseline=rate(p.substrate,21,3.8,p.enzyme)*p.time*residual;
  const sample=(factor,expression=1)=>Array.from({length:48},()=>{
    const prep=Math.max(0,1+normal(random)*p.pipette/100);
    const active=Math.max(0,expression+normal(random)*p.expression/100);
    const reagent=Math.max(0,1+normal(random)*p.reagent/100);
    const raw=p.background+baseline*factor*active*prep*reagent;
    return Math.max(0,Math.min(p.ceiling,raw)+normal(random)*p.noise);
  });
  return {negative:sample(0),parent:sample(1),hit:sample(p.proxy?1.05:1.2),residual,baseline};
}
export const candidates=[
  {id:'WT',sequence:'EST1-WT',activity:1,stability:31,expression:42,selectivity:96,signal:1,uncertainty:.06,valid:true},
  {id:'A',sequence:'A42V',activity:1.08,stability:52,expression:40,selectivity:96,signal:1.7,uncertainty:.08,valid:true},
  {id:'B',sequence:'L93F',activity:1.35,stability:21,expression:51,selectivity:93,signal:2.3,uncertainty:.12,valid:true},
  {id:'C',sequence:'V141I',activity:.92,stability:74,expression:31,selectivity:97,signal:1.6,uncertainty:.05,valid:true},
  {id:'D',sequence:'A42V',activity:1.06,stability:51,expression:40,selectivity:96,signal:1.8,uncertainty:.09,valid:true},
  {id:'E',sequence:'T87S',activity:1.8,stability:72,expression:12,selectivity:98,signal:.8,uncertainty:.09,valid:true},
  {id:'F',sequence:'G12D',activity:1.1,stability:80,expression:44,selectivity:97,signal:3.4,uncertainty:.5,valid:false}
];
export function gate(c,s) { return !c.valid?'Data quality':c.activity<s.activity||c.stability<s.stability||c.expression<s.expression||c.selectivity<s.selectivity?'Constraints':'Pass'; }
export function pareto(rows) { return rows.filter(a=>!rows.some(b=>b!==a&&b.activity>=a.activity&&b.stability>=a.stability&&(b.activity>a.activity||b.stability>a.stability))); }
export function plate({edge=25,drift=10,shift=100,failed=false,distributed=true,replicates=1,seed=12}={}) {
 const random=rng(seed),wells=[];
 const roles=['Parent','Blank','Negative','Positive'];
 for(let row=0;row<8;row++)for(let col=0;col<12;col++) {
  const i=row*12+col,control=distributed?(col===0||col===11):(i<16);
  const role=control?roles[distributed?(row+(col===11?2:0))%4:i%4]:'Variant';
  const intrinsic=role==='Positive'?1.5:role==='Blank'?0:role==='Negative'?.03:role==='Parent'?1:.8+random()*.5;
  const edgeWell=row===0||row===7||col===0||col===11;
  const value=Math.max(0,5+intrinsic*shift*(1+(edgeWell?edge/100:0)+drift/100*col/11)+normal(random)*4/Math.sqrt(replicates));
  wells.push({well:String.fromCharCode(65+row)+(col+1),role,value:failed&&role==='Parent'&&row===0?value*3:value,intrinsic});
 }
 const blank=mean(wells.filter(x=>x.role==='Blank').map(x=>x.value));
 const parent=mean(wells.filter(x=>x.role==='Parent').map(x=>x.value));
 return {wells,blank,parent,capacity:80/replicates,cv:sd(wells.filter(x=>x.role==='Parent').map(x=>x.value))/parent};
}
export const defaultPlan={project:'EST1 operational stability',parent:'EST1-WT',objective:'≥70% residual activity after 60 min at 50 °C',baseline:'31% residual activity at 45 °C / 60 min; remeasure at 50 °C',constraints:'Activity ≥0.8× WT; expression ≥20 mg/L; selectivity ≥95%',assay:'Heat challenge followed by activity measurement on actual substrate',controls:'Parent, blank, inactive enzyme and validated positive control distributed across plates',strategy:'Restricted alphabet at positions supported by first-round data',sites:3,alphabet:8,draws:1152,correct:90,expressed:70,functional:80,capacity:384,criteria:'Valid controls and ≥1.5× parent residual activity; retain sequence-distinct candidates',confirmation:'Independent expression, sequence verification, clean-background reconstruction, actual-substrate time course',next:'Test single mutations and selected combinations; stop when target and constraints are confirmed',notes:''};
export function planReport(p) {
 const l=library({sites:+p.sites,alphabet:+p.alphabet,draws:+p.draws,correct:p.correct/100,expressed:p.expressed/100,functional:p.functional/100});
 return `EVOZYME CAMPAIGN REPORT\nEducational planning aid — assumptions require experimental validation.\n\n${['project','parent','objective','baseline','constraints','assay','controls','strategy'].map(k=>k.toUpperCase()+'\n'+p[k]).join('\n\n')}\n\nLIBRARY & CAPACITY\nTheoretical: ${l.space}; screened draws: ${p.draws}; estimated usable draws: ${l.usable.toFixed(0)}; expected unique functional variants: ${l.unique.toFixed(0)} (${(100*l.coverage).toFixed(1)}% expected coverage).\nAssumes independent uniform sampling and independent quality losses. This is not probability of complete coverage.\nCapacity: ${p.capacity} variant measurements/day; ${Math.ceil(p.draws/p.capacity)} screening days (excludes confirmation).\n\n${['criteria','confirmation','next','notes'].map(k=>k.toUpperCase()+'\n'+p[k]).join('\n\n')}`;
}
