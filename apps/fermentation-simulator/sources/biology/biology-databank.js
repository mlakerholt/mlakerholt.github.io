(function () {
  "use strict";

  function evidenceBucket(status) {
    if (status.startsWith("Published")) return "Published";
    if (status === "Derived conversion" || status === "Literature-informed assumption") return "Derived / literature-informed";
    return "App assumption";
  }

  function selectRows(rows, filters) {
    return rows.filter((record) => {
      if (filters.category && record.category !== filters.category) return false;
      if (filters.search && !`${record.name} ${record.id} ${record.category}`.toLowerCase().includes(filters.search.toLowerCase().trim())) return false;
      if (filters.parameter && filters.evidence) {
        const parameter = record.parameters.find((item) => item.key === filters.parameter);
        if (!parameter || evidenceBucket(parameter.status) !== filters.evidence) return false;
      }
      return true;
    }).sort((a, b) => {
      if (filters.order === "category") return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      if (filters.order === "value" && filters.parameter) {
        const x = a.parameters.find((item) => item.key === filters.parameter)?.rawValue;
        const y = b.parameters.find((item) => item.key === filters.parameter)?.rawValue;
        if (typeof x === "number" && typeof y === "number") return x - y || a.name.localeCompare(b.name);
        return String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true });
      }
      return a.name.localeCompare(b.name);
    });
  }

  if (typeof module !== "undefined") {
    module.exports = { evidenceBucket, selectRows };
    return;
  }

  const $ = (id) => document.getElementById(id);
  const data = window.FermentationBiologyRecords;
  const fields = ["search", "category", "parameter", "evidence", "order"];
  const cell = (tag, text) => {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  };

  data.definitions.forEach(([key, label]) => {
    const option = cell("option", label);
    option.value = key;
    $("parameter").appendChild(option);
  });

  function render() {
    const filters = Object.fromEntries(fields.map((id) => [id, $(id).value]));
    $("evidence").disabled = !filters.parameter;
    const filtered = selectRows(data.records, filters);
    const definitions = filters.parameter
      ? data.definitions.filter(([key]) => key === filters.parameter)
      : data.definitions;
    const head = $("comparison").querySelector("thead");
    const body = $("comparison").querySelector("tbody");
    head.replaceChildren();
    body.replaceChildren();

    const heading = document.createElement("tr");
    heading.appendChild(cell("th", "Organism / cell line"));
    definitions.forEach(([, label]) => heading.appendChild(cell("th", label)));
    head.appendChild(heading);

    filtered.forEach((record) => {
      const row = document.createElement("tr");
      const name = cell("th", "");
      const link = cell("a", record.name);
      const category = cell("small", record.category);
      link.href = `./?id=${encodeURIComponent(record.id)}`;
      link.target = "_blank";
      link.rel = "noopener";
      name.scope = "row";
      name.append(link, category);
      row.appendChild(name);

      definitions.forEach(([key]) => {
        const parameter = record.parameters.find((item) => item.key === key);
        const valueCell = cell("td", "");
        const valueLink = cell("a", parameter.value);
        const status = cell("span", parameter.status);
        valueLink.href = link.href;
        valueLink.target = "_blank";
        valueLink.rel = "noopener";
        status.className = `status ${evidenceBucket(parameter.status) === "Published" ? "supported" : "assumption"}`;
        valueLink.appendChild(status);
        valueCell.appendChild(valueLink);
        row.appendChild(valueCell);
      });
      body.appendChild(row);
    });

    $("result").textContent = `${filtered.length} of ${data.records.length} presets · ${definitions.length} parameter${definitions.length === 1 ? "" : "s"}`;
  }

  $("filters").addEventListener("input", render);
  $("filters").addEventListener("change", render);
  $("filters").addEventListener("submit", (event) => event.preventDefault());
  $("filters").addEventListener("reset", () => setTimeout(render, 0));
  render();
})();
