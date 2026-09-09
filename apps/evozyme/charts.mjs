import{escapeHTML as e}from'./io.mjs';
export function linePlot(series,{xLabel='Time (s)',yLabel='Signal',title='Reaction progress',height=245}={}){
  const colors=['#1f5c2e','#295c7a','#8a4b08','#7a1111'];const all=series.flatMap(s=>s.points).filter(p=>p.every(Number.isFinite));if(!all.length)return'<p class="empty">No finite observations to plot.</p>';
  const w=620,h=height,left=68,right=18,top=28,bottom=46;
  let xmin=Math.min(...all.map(p=>p[0])),xmax=Math.max(...all.map(p=>p[0])),ymin=Math.min(...all.map(p=>p[1])),ymax=Math.max(...all.map(p=>p[1]));if(xmin===xmax)xmax=xmin+1;if(ymin===ymax){ymin-=.1;ymax+=.1;}const pad=(ymax-ymin)*.08;ymin-=pad;ymax+=pad;
  const x=v=>left+(v-xmin)/(xmax-xmin)*(w-left-right),y=v=>h-bottom-(v-ymin)/(ymax-ymin)*(h-top-bottom);
  let svg=`<svg class="plot" viewBox="0 0 ${w} ${h}" role="img" aria-label="${e(title)}. Data table follows."><title>${e(title)}</title>`;
  for(let i=0;i<=4;i++){const xx=xmin+(xmax-xmin)*i/4,yy=ymin+(ymax-ymin)*i/4;svg+=`<path d="M${left},${y(yy)}H${w-right}" stroke="#d7dfd8"/><text x="${left-8}" y="${y(yy)+4}" text-anchor="end" font-size="12">${e(Number(yy.toPrecision(3)))}</text><text x="${x(xx)}" y="${h-bottom+19}" text-anchor="middle" font-size="12">${e(Number(xx.toPrecision(4)))}</text>`;}
  svg+=`<path d="M${left},${top}V${h-bottom}H${w-right}" fill="none" stroke="#526057"/><text x="${w/2}" y="${h-6}" text-anchor="middle" font-size="14">${e(xLabel)}</text><text x="16" y="${h/2}" transform="rotate(-90 16 ${h/2})" text-anchor="middle" font-size="14">${e(yLabel)}</text>`;
  series.forEach((s,i)=>{const points=s.points.filter(p=>p.every(Number.isFinite));svg+=`<polyline points="${points.map(p=>`${x(p[0])},${y(p[1])}`).join(' ')}" fill="none" stroke="${colors[i%4]}" stroke-width="2" ${s.dashed?'stroke-dasharray="5 4"':''}/>`;for(const[t,v]of points)svg+=`<circle cx="${x(t)}" cy="${y(v)}" r="3" fill="${colors[i%4]}"><title>${e(s.name)}: ${e(t)}, ${e(v)}</title></circle>`;});
  return svg+'</svg><div class="legend">'+series.map((s,i)=>`<span style="--key:${colors[i%4]}">${e(s.name)}</span>`).join('')+'</div>';
}
export function bars(items,title='Cost breakdown',unit='NOK'){
  const w=620,rowHeight=32,h=items.length*rowHeight+28,max=Math.max(1,...items.map(i=>i[1])),left=235;
  return`<svg class="plot" viewBox="0 0 ${w} ${h}" role="img" aria-label="${e(title)}. Values are in the table."><title>${e(title)}</title>${items.map(([name,v],i)=>`<text x="8" y="${i*rowHeight+24}" font-size="14">${e(name)}</text><rect x="${left}" y="${i*rowHeight+9}" width="${v/max*(w-left-95)}" height="20" fill="#1f5c2e"/><text x="${left+v/max*(w-left-95)+7}" y="${i*rowHeight+24}" font-size="12">${e(v.toLocaleString('en-GB',{maximumFractionDigits:0}))}</text>`).join('')}<text x="${w-8}" y="${h-3}" font-size="12" text-anchor="end">${e(unit)}</text></svg>`;
}
