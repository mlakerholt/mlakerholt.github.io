(() => {
  "use strict";

  const BUILD_ID = "2026-09-12.3";
  const sourceStylesheet = document.createElement("link");
  sourceStylesheet.rel = "stylesheet";
  sourceStylesheet.href = `source-panel.css?v=${BUILD_ID}`;
  document.head.appendChild(sourceStylesheet);

  const createResourceLink = (text, href, id = "") => {
    const row = document.createElement("p");
    const link = document.createElement("a");

    row.className = "vessel-resource-link";
    link.id = id;
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = text;
    row.appendChild(link);

    return row;
  };

  const init = () => {
    const vesselSelect = document.getElementById("reactorModel");
    const catalogGrid = document.querySelector(".vessel-catalog-grid");
    if (!vesselSelect || !catalogGrid) return;

    const derivationRow = createResourceLink(
      "Preset derivation sheet ↗",
      "sources/",
      "vesselSourceSheet"
    );
    const databankRow = createResourceLink(
      "Reactor databank ↗",
      "sources/databank.html"
    );
    const derivationLink = derivationRow.querySelector("a");

    catalogGrid.insertAdjacentElement("afterend", derivationRow);
    catalogGrid.insertAdjacentElement("afterend", databankRow);

    const updateDerivationLink = () => {
      const presetId = vesselSelect.value;
      derivationLink.href = presetId && presetId !== "unlinked-configuration"
        ? `sources/?id=${encodeURIComponent(presetId)}`
        : "sources/";
    };

    vesselSelect.addEventListener("change", updateDerivationLink);
    document.addEventListener?.("fermentation:vessel-selected", updateDerivationLink);
    updateDerivationLink();
  };

  init();
})();
