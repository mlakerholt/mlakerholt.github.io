(() => {
  "use strict";

  const BUILD_ID = "2026-09-11.1";
  const sourceStylesheet = document.createElement("link");
  sourceStylesheet.rel = "stylesheet";
  sourceStylesheet.href = `source-panel.css?v=${BUILD_ID}`;
  document.head.appendChild(sourceStylesheet);

  const RECORDS_URL = `sources/source-records.payload?v=${BUILD_ID}`;
  const CAPTURE_DATE = "10 September 2026";
  const derivations = window.FermentationSourceDerivations;

  const appendLabelValue = (list, label, value, code = false) => {
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    if (code) {
      const element = document.createElement("code");
      element.textContent = value;
      description.appendChild(element);
    } else {
      description.textContent = value;
    }
    list.append(term, description);
  };

  const createExplanation = (explanation) => {
    const card = document.createElement("div");
    card.className = "source-derivation-card";

    const title = document.createElement("h4");
    title.textContent = explanation.title;
    card.appendChild(title);

    const summary = document.createElement("dl");
    summary.className = "source-derivation-summary";
    appendLabelValue(summary, "Classification", explanation.status);
    appendLabelValue(summary, "Origin", explanation.origin);
    appendLabelValue(summary, "Rule used by the app", explanation.rule, true);
    card.appendChild(summary);

    if (explanation.inputs?.length) {
      const heading = document.createElement("p");
      heading.className = "source-derivation-subheading";
      heading.textContent = "Inputs";
      const inputs = document.createElement("dl");
      inputs.className = "source-derivation-inputs";
      explanation.inputs.forEach(([label, value]) => appendLabelValue(inputs, label, value));
      card.append(heading, inputs);
    }

    const calculationHeading = document.createElement("p");
    calculationHeading.className = "source-derivation-subheading";
    calculationHeading.textContent = "Calculation / selection step";
    const calculation = document.createElement("pre");
    calculation.textContent = explanation.calculation;

    const result = document.createElement("p");
    const resultLabel = document.createElement("strong");
    resultLabel.textContent = "Result loaded into the preset: ";
    result.append(resultLabel, document.createTextNode(explanation.result));

    const rationale = document.createElement("p");
    const rationaleLabel = document.createElement("strong");
    rationaleLabel.textContent = "Rationale and limitations: ";
    rationale.append(rationaleLabel, document.createTextNode(explanation.rationale));

    const verification = document.createElement("p");
    verification.className = "source-verification-note";
    const verificationLabel = document.createElement("strong");
    verificationLabel.textContent = "Verification status: ";
    verification.append(verificationLabel, document.createTextNode(explanation.verification));

    card.append(calculationHeading, calculation, result, rationale, verification);
    return card;
  };

  const addCoreRow = (body, parameter) => {
    const row = document.createElement("tr");
    const fieldCell = document.createElement("th");
    const valueCell = document.createElement("td");
    const basisCell = document.createElement("td");
    const statusCell = document.createElement("td");

    fieldCell.scope = "row";
    fieldCell.textContent = parameter.label;
    valueCell.textContent = parameter.value;
    basisCell.textContent = parameter.basis;

    const expandable = parameter.status !== "Source-supported";
    if (expandable) {
      const button = document.createElement("button");
      const detailRow = document.createElement("tr");
      const detailCell = document.createElement("td");
      const detailId = `source-detail-${parameter.key}`;

      button.type = "button";
      button.className = `source-status source-status-button ${derivations.statusClass(parameter.status)}`;
      button.textContent = `${parameter.status} — show how`;
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", detailId);

      detailRow.className = "source-derivation-row";
      detailRow.hidden = true;
      detailCell.id = detailId;
      detailCell.colSpan = 4;
      detailCell.appendChild(createExplanation(parameter.explanation));
      detailRow.appendChild(detailCell);

      button.addEventListener("click", () => {
        const willOpen = detailRow.hidden;
        detailRow.hidden = !willOpen;
        button.setAttribute("aria-expanded", String(willOpen));
        button.textContent = willOpen
          ? `${parameter.status} — hide explanation`
          : `${parameter.status} — show how`;
      });

      statusCell.appendChild(button);
      row.append(fieldCell, valueCell, basisCell, statusCell);
      body.append(row, detailRow);
      return;
    }

    const badge = document.createElement("span");
    badge.className = `source-status ${derivations.statusClass(parameter.status)}`;
    badge.textContent = parameter.status;
    statusCell.appendChild(badge);
    row.append(fieldCell, valueCell, basisCell, statusCell);
    body.appendChild(row);
  };

  const createPanel = () => {
    const panel = document.createElement("details");
    panel.id = "vesselSourcePanel";
    panel.className = "vessel-source-panel";
    panel.open = false;
    panel.innerHTML = `
      <summary class="vessel-source-panel__summary">
        <span class="vessel-source-panel__summary-copy">
          <span class="eyebrow">SOURCE USED FOR THIS PRESET</span>
          <strong id="vesselSourceTitle" class="vessel-source-panel__title" aria-live="polite">Loading source record…</strong>
        </span>
        <span class="vessel-source-panel__summary-right">
          <span id="vesselSourceOverallStatus" class="source-status source-assumption">Loading</span>
          <span class="vessel-source-panel__toggle-label" aria-hidden="true">
            <span class="vessel-source-panel__closed-label">Open</span>
            <span class="vessel-source-panel__open-label">Close</span>
          </span>
          <span class="vessel-source-panel__toggle-symbol" aria-hidden="true"></span>
        </span>
      </summary>
      <div class="vessel-source-panel__content">
        <p id="vesselSourceMeta" class="vessel-source-meta"></p>
        <p id="vesselSourceCoverage"></p>
        <div class="vessel-source-actions">
          <a id="vesselSourceSheet" href="sources/" target="_blank" rel="noopener noreferrer">Open full source and derivation sheet</a>
          <a id="vesselOriginalSource" href="#" target="_blank" rel="noopener noreferrer" hidden>Open original manufacturer source</a>
        </div>
        <div class="vessel-source-table-wrap">
          <table class="vessel-source-table">
            <thead>
              <tr><th>Parameter</th><th>Value used</th><th>Recorded basis</th><th>Status</th></tr>
            </thead>
            <tbody id="vesselSourceRows"></tbody>
          </table>
        </div>
        <p class="vessel-source-toggle-row"><button id="vesselSourceToggleAll" class="vessel-source-toggle" type="button" aria-expanded="false">Show all preset parameters and calculations</button></p>
        <p class="vessel-source-footnote">Amber and grey status labels are buttons. Open them to see the precise rule, inputs, calculation and limitation. The full source sheet preserves the same information on a separate permanent page.</p>
      </div>
    `;
    return panel;
  };

  const init = async () => {
    if (!derivations) {
      throw new Error("The parameter-derivation library did not load.");
    }

    const manufacturerSelect = document.getElementById("reactorManufacturer");
    const vesselSelect = document.getElementById("reactorModel");
    const catalogGrid = document.querySelector(".vessel-catalog-grid");
    if (!manufacturerSelect || !vesselSelect || !catalogGrid) {
      throw new Error("The vessel selector is not available.");
    }

    if (!("DecompressionStream" in window)) {
      throw new Error("This browser cannot open the local source catalogue.");
    }
    const response = await fetch(RECORDS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load local source records (HTTP ${response.status}).`);
    const binary = atob((await response.text()).trim());
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const records = JSON.parse(await new Response(stream).text());
    const recordsById = new Map(records.map((record) => [record.id, record]));

    const panel = createPanel();
    catalogGrid.insertAdjacentElement("afterend", panel);

    const title = document.getElementById("vesselSourceTitle");
    const overallStatus = document.getElementById("vesselSourceOverallStatus");
    const meta = document.getElementById("vesselSourceMeta");
    const coverage = document.getElementById("vesselSourceCoverage");
    const sourceSheet = document.getElementById("vesselSourceSheet");
    const originalSource = document.getElementById("vesselOriginalSource");
    const rows = document.getElementById("vesselSourceRows");
    const toggleAll = document.getElementById("vesselSourceToggleAll");
    let showAllParameters = false;
    let selectedRecord = null;

    const renderRows = () => {
      rows.replaceChildren();
      if (!selectedRecord) return;
      const parameters = showAllParameters
        ? derivations.allParameters(selectedRecord)
        : derivations.coreParameters(selectedRecord);
      parameters.forEach((parameter) => addCoreRow(rows, parameter));
      toggleAll.setAttribute("aria-expanded", String(showAllParameters));
      toggleAll.textContent = showAllParameters
        ? "Show only the three core source fields"
        : "Show all preset parameters and calculations";
    };

    toggleAll.addEventListener("click", () => {
      showAllParameters = !showAllParameters;
      renderRows();
    });

    const render = () => {
      const record = recordsById.get(vesselSelect.value);
      selectedRecord = record || null;
      rows.replaceChildren();

      if (!record) {
        title.textContent = "No local source record found";
        overallStatus.className = "source-status source-assumption";
        overallStatus.textContent = "Missing record";
        meta.textContent = `Selected preset: ${vesselSelect.value || "—"}`;
        coverage.textContent = "This preset needs a source record before its vessel data can be reviewed.";
        sourceSheet.href = "sources/";
        originalSource.hidden = true;
        return;
      }

      const primarySource = record.links?.[0] || null;
      const coreParameters = derivations.coreParameters(record);
      const overall = derivations.isCustom(record)
        ? "Custom template"
        : coreParameters.some((parameter) => parameter.status === "Derived / estimated")
          ? "Partly derived"
          : "Source-supported core data";

      title.textContent = primarySource?.title || `${record.manufacturer} — custom vessel template`;
      overallStatus.className = `source-status ${
        overall === "Source-supported core data"
          ? "source-supported"
          : overall === "Partly derived"
            ? "source-derived"
            : "source-custom"
      }`;
      overallStatus.textContent = overall;
      meta.textContent = `Local record saved ${CAPTURE_DATE} · Preset ${record.id}`;
      coverage.textContent = primarySource?.supports || "No manufacturer source applies to this custom template.";
      sourceSheet.href = `sources/?id=${encodeURIComponent(record.id)}`;

      if (primarySource?.url) {
        originalSource.hidden = false;
        originalSource.href = primarySource.url;
        originalSource.textContent = "Open original manufacturer source";
      } else {
        originalSource.hidden = true;
        originalSource.removeAttribute("href");
      }

      renderRows();
    };

    manufacturerSelect.addEventListener("change", () => queueMicrotask(render));
    vesselSelect.addEventListener("change", render);
    render();
  };

  init().catch((error) => {
    console.error(error);
    const grid = document.querySelector(".vessel-catalog-grid");
    if (!grid || document.getElementById("vesselSourcePanel")) return;
    const panel = createPanel();
    grid.insertAdjacentElement("afterend", panel);
    const title = panel.querySelector("#vesselSourceTitle");
    const meta = panel.querySelector("#vesselSourceMeta");
    title.textContent = "Source record could not be loaded";
    meta.textContent = error.message;
  });
})();
