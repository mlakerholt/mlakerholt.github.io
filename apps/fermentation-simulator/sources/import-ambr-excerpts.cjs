// Preserve user-supplied screenshots byte-for-byte; these are NOT original PDFs.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=path.join(__dirname,'originals'),file=path.join(dir,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
const items=[['vessel','aef77ed6-db33-43aa-b79b-83b226cb756f'],['operating','71770a03-e327-4f3a-9947-53617e845cad'],['cover','adc2b1f4-10ba-4e10-a9e6-cae2b38ac59c']];
for(const [section,id] of items){
 const bytes=fs.readFileSync(`C:/Users/wizar/AppData/Local/Temp/codex-clipboard-${id}.png`),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 const name=`sartorius-ambr15-gen2-excerpt-${section}-${sha256.slice(0,12)}.png`;
 fs.writeFileSync(path.join(dir,name),bytes);
 const entry={title:`Sartorius Ambr 15 Cell Culture Generation 2 Technical Specification - ${section} screenshot excerpt`,file:name,sha256,bytes:bytes.length,format:'png',status:'archived',kind:'manufacturer-technical-specification-excerpt',presetIds:['sartorius-ambr-15'],url:'https://www.scribd.com/document/721675734/Ambr-15-Cell-Culture-Generation-2',importMethod:'user-supplied-screenshot',preserveArchive:true,verification:'User-supplied Scribd screenshot, not a complete original PDF. Cover identifies Sartorius and exact model; revision, publication date and page numbers unknown.',archivedAt:new Date().toISOString()};
 if(!manifest.documents.some(d=>d.file===name))manifest.documents.push(entry);
}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
console.log('Archived three screenshot excerpts with SHA-256 identities.');
