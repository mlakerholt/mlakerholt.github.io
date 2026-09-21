"use strict";
importScripts('../simulation-core.js?v=2026-09-21.1');
self.onmessage = event => {
  const { id, scenario, step, time } = event.data;
  try {
    const result = time === undefined ? self.FermentationModel.inspectStep(scenario, step) : self.FermentationModel.inspectTime(scenario, time);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message || 'Could not calculate this interval.' });
  }
};
