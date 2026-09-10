(() => {
  "use strict";

  const BUILD_ID = "2026-09-10.6";
  const RECORDS_URL = `sources/source-records.payload?v=${BUILD_ID}`;
  const CAPTURE_DATE = "10 September 2026";

  const formatVolume = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    if (numeric < 0.001) return `${Number((numeric * 1_000_000).toPrecision(8))} µL`;
    if (numeric < 1) return `${Number((numeric * 1000).toPrecision(8))} mL`;
    return `${Number(numeric.toPrecision(8))} L`;
  };

  const isCustom = (record) => record?.manufacturer === "Custom";

  const coreStatus = (record, field) => {
    if (!record || isCustom(record)) return "Custom template";
    const status = String(record.status || "").toLowerCase();

    if (field === "material" || field === "maxVolume") return "Source-supported";
    if (field === "nominalVolume") return "Source-supported";
    if (field === "minVolume") {
      if (/derived|estimated|approximate|inherited/.test(status)) return "Derived / estimated";
      return "Source-supported";
    }
    return "App assumption";
  };

  const statusClass = (status) => {
    if (status === "Source-supported") return "source-supported";
    if (status === "Derived / estimated") return "source-derived";
    if (status === "Custom template") return "source-custom";
    return "source-assumption";
  };

  const addCoreRow = (body, label, value, basis, status) => {
    const row = document.createElement("tr");
    const fieldCell = document.createElement("th");
    const valueCell = document.createElement("td");
    const basisCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const badge = document.createElement("span");

    fieldCell.scope = "row";
    fieldCell.textContent = label;
    valueCell.textContent = value;
    basisCell.textContent = basis;
    badge.className = `source-status ${statusClass(status)}`;
    badge.textContent = status;
    statusCell.appendChild(badge);
    row.append(fieldCell, valueCell, basisCell, statusCell);
    body.appendChild(row);
  };

  const createPanel = () => {
    const section = document.createElement("section");
    section.id = "vesselSourcePanel";
    section.className = "vessel-source-panel";
    section.setAttribute("aria-live", "polite");
    section.innerHTML = `
      <div class="vessel-source-panel__heading">
        <div>
          <p class="eyebrow">SOURCE USED FOR THIS PRESET</p>
          <h3 id="vesselSourceTitle">Loading source record…</h3>
        </div>
        <span id="vesselSourceOverallStatus" class="source-status source-assumption">Loading</span>
      </div>
      <p id="vesselSourceMeta" class="vessel-source-meta"></p>
      <p id="vesselSourceCoverage"></p>
      <div class="vessel-source-actions">
        <a id="vesselSourceSheet" href="sources/" target="_blank" rel="noopener noreferrer">Open readable source sheet</a>
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
      <p class="vessel-source-footnote">The source sheet is stored with the website. It shows the source title, URL, capture date, the values copied into the preset, and which remaining fields are app assumptions.</p>
    `;
    return section;
  };

  const init = async () => {
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

    const render = () => {
      const record = recordsById.get(vesselSelect.value);
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
      const minStatus = coreStatus(record, "minVolume");
      const statuses = [
        minStatus,
        coreStatus(record, "maxVolume"),
        coreStatus(record, "nominalVolume"),
        coreStatus(record, "material")
      ];
      const overall = isCustom(record)
        ? "Custom template"
        : statuses.includes("Derived / estimated")
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

      addCoreRow(
        rows,
        "Working-volume range",
        `${formatVolume(record.minVolume)} to ${formatVolume(record.maxVolume)}`,
        record.volumeBasis,
        minStatus === "Derived / estimated" ? "Derived / estimated" : "Source-supported"
      );
      addCoreRow(
        rows,
        "Nominal vessel / bag size",
        formatVolume(record.nominalVolume),
        "The named vessel or bag scale recorded for this model.",
        coreStatus(record, "nominalVolume")
      );
      addCoreRow(
        rows,
        "Product-contact material",
        record.material,
        record.materialBasis,
        coreStatus(record, "material")
      );
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
