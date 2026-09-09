import{analyze}from'./core.mjs';
import{parseCSV}from'./io.mjs';
self.onmessage=({data})=>{try{const parsed=Object.fromEntries(Object.entries(data.files).map(([name,file])=>[name,parseCSV(file.text,name)]));const result=analyze(parsed,data.config);self.postMessage({id:data.id,result});}catch(error){self.postMessage({id:data.id,error:error.message});}};
