const fs=require('fs'),path=require('path'),crypto=require('crypto');
const bytes=fs.readFileSync('C:/Users/wizar/Desktop/12-8-SSBsup-DeWildeSecured.pdf');
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
const file=`sartorius-dewilde-scalability-2014-${sha256.slice(0,12)}.pdf`;
fs.writeFileSync(path.join(__dirname,'originals',file),bytes);
const mf=path.join(__dirname,'originals/manifest.json'),m=JSON.parse(fs.readFileSync(mf,'utf8'));
if(!m.documents.some(d=>d.file===file))m.documents.push({title:'Superior Scalability of Single-Use Bioreactors - De Wilde et al., September 2014',file,sha256,bytes:bytes.length,format:'pdf',status:'archived',kind:'manufacturer-authored-technical-article',presetIds:['sartorius-ambr-250','sartorius-univessel-su-2',...[50,200,500,1000,2000].map(s=>'sartorius-str-gen3-'+s)],url:'https://www.scribd.com/document/878210215/12-8-SSBsup-DeWildeSecured',importMethod:'user-supplied-local-file',preserveArchive:true,verification:'Six-page BPI 12(8)s supplement, printed pages 14-19. Authors affiliated with Sartorius Stedim Biotech. Historical 2014 configurations; association is not verification of current presets.',archivedAt:new Date().toISOString()});
fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');
console.log(file);
