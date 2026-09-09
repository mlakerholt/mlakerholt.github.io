// Preserve bookmarks to planner stages from before the overview became the home page.
(() => {
  const stages = new Set(['campaign', 'assay', 'equipment', 'library', 'budget', 'screen', 'review']);
  const openStage = () => {
    if (stages.has(location.hash.slice(1))) {
      location.replace('planner.html' + location.search + location.hash);
    }
  };
  window.addEventListener('hashchange', openStage);
  openStage();
})();
