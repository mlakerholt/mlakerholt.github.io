(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const data = window.FermentationBiologyRecords;

  const statusClass = (status) => {
    if (status.startsWith("Published")) return "source-supported";
    if (status === "Derived conversion" || status === "Literature-informed assumption") return "source-derived";
    return "source-assumption";
  };

  const addSummary = (term, value) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    $("summary").append(dt, dd);
  };

  const addParameter = (parameter) => {
    const row = document.createElement("tr");
    const field = document.createElement("th");
    const value = document.createElement("td");
    const basis = document.createElement("td");
    const status = document.createElement("td");
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const explanation = document.createElement("p");
    const referenceList = document.createElement("ul");

    field.scope = "row";
    field.textContent = parameter.label;
    value.textContent = parameter.value;
    basis.textContent = parameter.basis;
    summary.className = `source-status ${statusClass(parameter.status)}`;
    summary.textContent = `${parameter.status} — show how`;
    explanation.textContent = parameter.explanation;
    details.append(summary, explanation);
    parameter.references.forEach((reference) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = reference.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = reference.title;
      item.appendChild(link);
      referenceList.appendChild(item);
    });
    if (parameter.references.length) {
      referenceList.className = "parameter-references";
      details.appendChild(referenceList);
    }
    status.appendChild(details);
    row.append(field, value, basis, status);
    $("parameterRows").appendChild(row);
  };

  const renderIndex = () => {
    $("recordCount").textContent = `${data.records.length} biology sheets`;
    ["Animal cell culture", "Microbial fermentation"].forEach((category) => {
      const heading = document.createElement("h2");
      const list = document.createElement("ol");
      heading.textContent = category;
      list.className = "index-list";
      data.records.filter((record) => record.category === category).forEach((record) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        const meta = document.createElement("small");
        link.href = `?id=${encodeURIComponent(record.id)}`;
        link.textContent = record.name;
        meta.textContent = record.overallStatus;
        item.append(link, meta);
        list.appendChild(item);
      });
      $("recordIndex").append(heading, list);
    });
    $("indexView").hidden = false;
  };

  const renderRecord = (record) => {
    document.title = `Biology source — ${record.name}`;
    $("recordTitle").textContent = record.name;
    $("recordId").textContent = record.id;
    $("recordStatus").textContent = record.overallStatus;
    $("sourceTitle").textContent = record.sources.length
      ? `${record.sources.length} publication${record.sources.length === 1 ? "" : "s"} compiled`
      : "No preset-specific publication recorded";
    $("sourceCoverage").textContent = record.sources.length
      ? "Each parameter links to the publication that supports or contextualizes it. A related source does not make a differing preset value a published measurement."
      : "This preset currently contains editable application assumptions. Its field-level literature audit remains pending.";
    record.sources.forEach((reference) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = reference.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = reference.title;
      item.appendChild(link);
      $("sourceList").appendChild(item);
    });

    record.parameters.forEach(addParameter);
    addSummary("Category", record.category);
    addSummary("Preset", record.name);
    addSummary("Evidence classification", record.overallStatus);
    addSummary("Record reviewed", "12 September 2026");

    (record.notes || ["No additional preset-specific note."]).forEach((note) => {
      const item = document.createElement("li");
      item.textContent = note;
      $("recordNotes").appendChild(item);
    });
    $("recordView").hidden = false;
  };

  $("copyLink")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      $("copyLink").textContent = "Link copied";
    } catch {
      $("copyLink").textContent = "Could not copy link";
    }
  });

  try {
    if (!data) throw new Error("Biology records did not load.");
    const id = new URLSearchParams(location.search).get("id");
    if (!id) renderIndex();
    else {
      const record = data.records.find((item) => item.id === id);
      if (!record) throw new Error(`Unknown biology preset: ${id}`);
      renderRecord(record);
    }
  } catch (error) {
    $("error").hidden = false;
    $("error").textContent = error.message;
  }
})();
