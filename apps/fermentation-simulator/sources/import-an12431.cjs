const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=__dirname,archive=path.join(root,'originals');
const source='C:/Users/wizar/Desktop/Millipore_AN12431EN_Mobius-3L-to-iFlex-Bioreactor-scalability-app-note_MSIG.pdf';
const mf=path.join(archive,'manifest.json'),m=JSON.parse(fs.readFileSync(mf));
const ids=['merck-mobius-3',...[50,200,1000,2000].map(n=>'merck-iflex-'+n)];
function save(bytes,meta){
  if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Not a PDF: '+meta.url);
  const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  const file=meta.prefix+'-'+sha256.slice(0,12)+'.pdf',dest=path.join(archive,file);
  if(fs.existsSync(dest)&&!fs.readFileSync(dest).equals(bytes))throw Error('Archive collision');
  if(!fs.existsSync(dest))fs.writeFileSync(dest,bytes,{flag:'wx'});
  if(!m.documents.some(d=>d.sha256===sha256))m.documents.push({...meta,file,sha256,bytes:bytes.length,format:'pdf',status:'archived',retrievedAt:new Date().toISOString(),preserveArchive:true});
  fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');console.log(file);
}
(async()=>{
  const snapshot=path.join(root,'audit-baseline','pre-an12431-records.json');
  if(!fs.existsSync(snapshot))fs.copyFileSync(path.join(root,'vessel-records.json'),snapshot,fs.constants.COPYFILE_EXCL);
  save(fs.readFileSync(source),{prefix:'merck-an12431-v1-2023',title:'Merck Mobius 3 L to iFlex scalability - AN12431EN Ver. 1.0 (July 2023)',url:'file:///'+source,importMethod:'user-supplied-local-file',originalFilename:path.basename(source),edition:'MS_AN12431EN Ver. 1.0, July 2023',kind:'manufacturer-application-note',presetIds:ids,verification:'User-supplied original preserved unchanged. Pages 2 and 4 mark 50, 500, 1000 and 2000 L as in development. Characterization conditions are not general equipment limits. Original download URL not independently established.'});
  for(const job of [
    {prefix:'merck-mobius3-ds26770000-v3-2023',title:'Merck Mobius 3 L - DS26770000 Ver. 3.0 (May 2023)',url:'https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/marketing/global/documents/434/195/ds26770000-mobius-3-l-bioreactor-mk.pdf',edition:'MK_DS26770000 Ver. 3.0, May 2023',presetIds:['merck-mobius-3'],verification:'Dedicated manufacturer datasheet downloaded directly. Page 2 gives 135 mm inner diameter; this remains selected over the conflicting older 137 mm specification.'},
    {prefix:'merck-iflex-pg12163-rev2-2024',title:'Merck Mobius iFlex Scalability and Performance Guide - PG12163EN Rev. 2 (March 2024)',url:'https://b2b.sigmaaldrich.com/deepweb/assets/sigmaaldrich/marketing/global/documents/323/381/mobius-iflex-bioreactors-pg12163en-ms.pdf',edition:'MK_PG12163EN Rev. 2, March 2024',presetIds:ids.slice(1),verification:'Downloaded directly from manufacturer. Page 4 supplies absolute impeller dimensions; 50, 500 and 1000 L marked in development. Height-ratio ambiguity persists.'},
    {prefix:'merck-cellready-sp2345000-revb-2010',title:'Millipore Mobius CellReady 3 L - SP2345000 Rev. B (August 2010)',url:'https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/product/documents/459/220/sp2345000.pdf',edition:'SP2345000 Rev. B, August 2010',presetIds:['merck-mobius-3'],verification:'Historical manufacturer specification: 137 mm inner diameter, compared with 135 mm in the newer 2023 datasheet. Retained as conflicting evidence, not silently substituted.'}
  ]){if(m.documents.some(d=>d.prefix===job.prefix&&d.status==='archived'))continue;const response=await fetch(job.url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(response.status+' '+job.url);save(Buffer.from(await response.arrayBuffer()),{...job,importMethod:'publisher-download',kind:'manufacturer-publication',finalUrl:response.url});}
})().catch(e=>{console.error(e);process.exitCode=1;});
