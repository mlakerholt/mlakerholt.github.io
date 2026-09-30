/* Entry-page navigation only. Does not reset, save or run the scenario. */
(() => {
  "use strict";
  const introduction = document.getElementById("introduction");
  const simulator = document.getElementById("simulator");
  const start = document.getElementById("getStartedBtn");
  const status = document.getElementById("introductionStatus");
  const introLink = document.getElementById("introductionNavLink");
  const simulatorLink = document.getElementById("simulatorNavLink");
  let ready = false;

  function showCurrentPage(moveFocus = false) {
    const entered = ready && window.location.hash === "#simulator";
    introduction.hidden = entered;
    simulator.hidden = !entered;
    for (const [link, active] of [[introLink, !entered], [simulatorLink, entered]]) {
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (moveFocus) {
      const heading = entered
        ? simulator.querySelector(".stage.is-active h2")
        : document.getElementById("introductionHeading");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      (entered ? simulator : introduction).scrollIntoView({ block: "start" });
      // A result may already exist when returning from the introduction.
      // Let the existing responsive renderer refresh any previously hidden charts.
      if (entered) window.dispatchEvent(new Event("resize"));
    }
  }

  start.addEventListener("click", () => {
    if (!ready) return;
    if (window.location.hash === "#simulator") showCurrentPage(true);
    else window.location.hash = "simulator";
  });
  window.addEventListener("hashchange", () => showCurrentPage(true));

  window.FermentationEntryScreen = {
    ready() {
      ready = true;
      start.disabled = false;
      status.hidden = true;
      showCurrentPage(window.location.hash === "#simulator");
    },
    fail(error) {
      ready = false;
      start.disabled = true;
      status.textContent = `The simulator could not load: ${error.message} Reload this page to try again. The reference links remain available.`;
      status.classList.add("load-error");
      status.hidden = false;
      showCurrentPage();
    }
  };
  showCurrentPage();
})();
