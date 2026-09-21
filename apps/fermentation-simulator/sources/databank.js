/* Shared pure filtering logic also exercised by the local regression test. */
(function () {
  'use strict';
  function selectRows(rows, f) {
    const low=f.min===''? -Infinity:Number(f.min), high=f.max===''?Infinity:Number(f.max);
    if(Number.isNaN(low)||Number.isNaN(high)||low>high||low<0&&low!==-Infinity||high<0)throw Error('Enter a valid volume range: non-negative litres, with From no greater than To.');
    const matches=rows.filter(r=>{
      if(!f.custom&&r.manufacturer==='Custom')return false;
      if(f.manufacturer&&r.manufacturer!==f.manufacturer)return false;
      if(f.search&&!`${r.label} ${r.manufacturer}`.toLowerCase().includes(f.search.toLowerCase().trim()))return false;
      if(f.volumeBasis==='overlap') {if(!(r.minVolume<=high&&r.maxVolume>=low))return false;}
      else {const v=r[f.volumeBasis];if((low!==-Infinity||high!==Infinity)&&!(typeof v==='number'&&v>=low&&v<=high))return false;}
      return !f.parameter||!f.evidence||r.parameters.find(p=>p.key===f.parameter)?.status===f.evidence;
    });
    return matches.sort((a,b)=>{
      if(f.order==='volume')return a.maxVolume-b.maxVolume||a.label.localeCompare(b.label);
      if(f.order==='value'&&f.parameter){const x=a.numeric[f.parameter],y=b.numeric[f.parameter];if(typeof x==='number'&&typeof y==='number')return x-y||a.label.localeCompare(b.label);return String(x??'').localeCompare(String(y??''),undefined,{numeric:true});}
      return a.label.localeCompare(b.label);
    });
  }
  if(typeof module!=='undefined') {module.exports={selectRows};return;}
  const $=id=>document.getElementById(id), fields=['search','manufacturer','volumeBasis','min','max','parameter','evidence','order'];
  let rows=[], definitions=[];
  function cell(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
  function render(){
    const f=Object.fromEntries(fields.map(id=>[id,$(id).value]));f.custom=$('custom').checked;
    $('evidence').disabled=!f.parameter;
    const head=$('comparison').querySelector('thead'),body=$('comparison').querySelector('tbody');head.replaceChildren();body.replaceChildren();
    let filtered;try{filtered=selectRows(rows,f);}catch(e){$('result').textContent=e.message;return;}
    const keys=f.parameter?[...new Set(['minVolume','maxVolume',f.parameter])]:definitions.map(p=>p.key);
    const hr=document.createElement('tr');hr.append(cell('th','Reactor / configuration'));
    keys.forEach(k=>{const th=cell('th',definitions.find(p=>p.key===k).label);th.scope='col';hr.append(th);});head.append(hr);
    for(const r of filtered){
      const tr=document.createElement('tr'),name=cell('th',''),link=cell('a',r.label);name.scope='row';link.href=`./?id=${encodeURIComponent(r.id)}`;link.target='_blank';link.rel='noopener';name.append(link,cell('small',r.manufacturer));tr.append(name);
      for(const key of keys){const p=r.parameters.find(p=>p.key===key),td=cell('td',''),a=cell('a',p?.value??'Not recorded');a.href=link.href;a.target='_blank';a.rel='noopener';a.title=p?.explanation?.origin||'Open derivation sheet';const status=cell('span',p?.status??'Not recorded');status.className='status '+(p?.status==='Source-supported'?'supported':'assumption');a.append(status);td.append(a);tr.append(td);}body.append(tr);
    }
    $('result').textContent=`${filtered.length} of ${rows.length} presets · ${keys.length} parameters${filtered.length?'':' — no reactors match these filters'}`;
  }
  async function init(){
    const response=await fetch('audited-sheets.json',{cache:'no-store'});if(!response.ok)throw Error(`Could not load reactor data (${response.status}).`);
    rows=await response.json();definitions=rows[0].parameters;
    // Raw numeric model values, not rounded strings with mixed mL/L units.
    rows.forEach(r=>{r.numeric=Object.fromEntries(definitions.map(p=>[p.key,window.FermentationSourceDerivations.valueFor(r,p.key)]));});
    [...new Set(rows.map(r=>r.manufacturer))].sort().forEach(m=>{const o=cell('option',m);o.value=m;$('manufacturer').append(o);});
    definitions.forEach(p=>{const o=cell('option',p.label);o.value=p.key;$('parameter').append(o);});
    $('filters').addEventListener('input',render);$('filters').addEventListener('change',render);$('filters').addEventListener('submit',e=>e.preventDefault());
    $('filters').addEventListener('reset',()=>setTimeout(render,0));
    $('example').addEventListener('click',()=>{$('filters').reset();$('min').value='0';$('max').value='2';$('parameter').value='powerNumber';$('order').value='volume';render();});render();
  }
  init().catch(e=>{$('result').textContent=e.message+' Try refreshing the page.';});
})();
