// Preserve the user-supplied manufacturer PDF byte-for-byte, with explicit provenance.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const source='C:/Users/wizar/Desktop/sp1237en-mk.pdf';
const archive=path.join(__dirname,'originals');
const bytes=fs.readFileSync(source);
if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Not a PDF');
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
const file=`merck-mobius-2021-sp1237en00-v4-${sha256.slice(0,12)}.pdf`;
const target=path.join(archive,file);
if(fs.existsSync(target)&&!fs.readFileSync(target).equals(bytes))throw Error('Archive collision');
if(!fs.existsSync(target))fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
const mf=path.join(archive,'manifest.json'),manifest=JSON.parse(fs.readFileSync(mf,'utf8'));
const url='file:///C:/Users/wizar/Desktop/sp1237en-mk.pdf';
if(!manifest.documents.some(d=>d.sha256===sha256))manifest.documents.push({
  title:'Merck Mobius Bioreactors - SP1237EN00 Ver. 4.0 (October 2021)',
  url,importMethod:'user-supplied-local-file',originalFilename:'sp1237en-mk.pdf',
  edition:'SP1237EN00 Ver. 4.0, October 2021',kind:'manufacturer-specification-sheet',
  presetIds:[50,200,1000,2000].map(n=>`merck-mobius-2021-${n}`),
  retrievedAt:new Date().toISOString(),status:'archived',file,sha256,bytes:bytes.length,format:'pdf',
  verification:'User-supplied local manufacturer publication; original download URL not supplied or independently established. Byte-preserved. Page 2 specifies the 2021 Mobius family, not iFlex; page 4 gives materials. No iFlex association.'
});
fs.writeFileSync(mf,JSON.stringify(manifest,null,2)+'\n');
const snapshot=path.join(__dirname,'audit-baseline','pre-mobius-2021-records.json');
if(!fs.existsSync(snapshot))fs.copyFileSync(path.join(__dirname,'vessel-records.json'),snapshot,fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify({file,sha256,bytes:bytes.length}));
