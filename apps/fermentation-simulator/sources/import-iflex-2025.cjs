// Byte-preserving local source import. The publisher download URL is not inferred.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const source='C:/Users/wizar/Desktop/ds12340en-mobius-iflex-bioreactor-datasheet-mk.pdf';
const bytes=fs.readFileSync(source),archive=path.join(__dirname,'originals');
if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Not a PDF');
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
const file=`merck-iflex-ds12340en-v4-2025-${sha256.slice(0,12)}.pdf`,target=path.join(archive,file);
if(fs.existsSync(target)&&!fs.readFileSync(target).equals(bytes))throw Error('Archive collision');
if(!fs.existsSync(target))fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
const mf=path.join(archive,'manifest.json'),manifest=JSON.parse(fs.readFileSync(mf,'utf8'));
if(!manifest.documents.some(d=>d.sha256===sha256))manifest.documents.push({
  title:'Merck Mobius iFlex - MK_DS12340EN Ver. 4.0 (March 2025)',
  url:'file:///'+source,importMethod:'user-supplied-local-file',originalFilename:path.basename(source),
  edition:'MK_DS12340EN Ver. 4.0, March 2025',kind:'manufacturer-datasheet',
  presetIds:[200,2000].map(n=>`merck-iflex-${n}`),retrievedAt:new Date().toISOString(),
  status:'archived',file,sha256,bytes:bytes.length,format:'pdf',
  verification:'User-supplied manufacturer publication, preserved unchanged. Original download URL not independently established. Model-specific tables cover 200 L and 2000 L only (pages 7-14); family marketing does not verify 50 L or 1000 L specifications. Edition on page 16.'
});
fs.writeFileSync(mf,JSON.stringify(manifest,null,2)+'\n');
const snapshot=path.join(__dirname,'audit-baseline','pre-iflex-2025-records.json');
if(!fs.existsSync(snapshot))fs.copyFileSync(path.join(__dirname,'vessel-records.json'),snapshot,fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify({file,sha256,bytes:bytes.length}));
