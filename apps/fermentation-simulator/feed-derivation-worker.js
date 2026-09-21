'use strict';
importScripts('simulation-core.js?v=2026-09-21.1','feed-derivation.js?v=2026-09-21.1');
self.onmessage=event=>{
  const {id,scenario}=event.data;
  try {self.postMessage({id,batch:self.FermentationFeedDerivation.estimateBatch(scenario)});}
  catch(error) {self.postMessage({id,error:error.message||'Batch estimate unavailable.'});}
};
