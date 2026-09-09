import {parseSequenceDataset} from './sequence-data.mjs';
self.onmessage=({data})=>{try{self.postMessage({result:parseSequenceDataset(data.text,data.name)});}catch(error){self.postMessage({error:error.message||String(error)});}};
