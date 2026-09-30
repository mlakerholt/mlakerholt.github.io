const fs=require('fs'),path=require('path'),crypto=require('crypto');
const archive=path.join(__dirname,'originals'),mf=path.join(archive,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(mf));
(async()=>{
 const snapshot=path.join(__dirname,'audit-baseline','pre-thermo-gap-records.json');
 if(!fs.existsSync(snapshot))fs.copyFileSync(path.join(__dirname,'vessel-records.json'),snapshot,fs.constants.COPYFILE_EXCL);
 const jobs=[
  {prefix:'thermo-sub-5to1-user-guide',title:'Thermo HyPerforma 5:1 Single-Use Bioreactor User Guide',url:'https://documents.thermofisher.com/TFS-Assets%2FBPD%2Fmanuals%2F5to1-single-use-bioreactor-users-guide.pdf',presetIds:[50,100,250,500,1000,2000].map(n=>'thermo-sub-'+n)},
  {prefix:'thermo-dynadrive-3000-5000-setup-es',title:'Thermo DynaDrive 3000 and 5000 L unpacking and setup guide (Spanish)',url:'https://documents.thermofisher.com/TFS-Assets/BPD/Reference-Materials/unpacking-and-setup-guide-3000l-5000l-dynadrive-single-use-bioreactors-spanish.pdf',presetIds:[3000,5000].map(n=>'thermo-dynadrive-'+n)}
 ];
 for(const job of jobs){
  if(manifest.documents.some(d=>d.prefix===job.prefix&&d.status==='archived'))continue;
  const r=await fetch(job.url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(r.status+' '+job.url);
  const b=Buffer.from(await r.arrayBuffer());if(b.subarray(0,5).toString()!=='%PDF-')throw Error('Not PDF');
  const sha256=crypto.createHash('sha256').update(b).digest('hex'),file=job.prefix+'-'+sha256.slice(0,12)+'.pdf';
  const dest=path.join(archive,file);if(!fs.existsSync(dest))fs.writeFileSync(dest,b,{flag:'wx'});else if(!fs.readFileSync(dest).equals(b))throw Error('Collision');
  manifest.documents.push({...job,finalUrl:r.url,importMethod:'publisher-download',preserveArchive:true,kind:'manufacturer-publication',format:'pdf',status:'archived',file,sha256,bytes:b.length,retrievedAt:new Date().toISOString(),verification:'Byte-preserved manufacturer download. Model and page-specific evidence is recorded separately; a relevant document does not verify every parameter.'});
  fs.writeFileSync(mf,JSON.stringify(manifest,null,2)+'\n');console.log(file);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
