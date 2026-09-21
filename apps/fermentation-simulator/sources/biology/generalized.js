(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const data = window.FermentationGeneralizedBiology;

  const renderSources = (profile, indices, target) => {
    indices.forEach((index) => {
      const source = profile.sources[index];
      if (!source) return;
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.title;
      item.appendChild(link);
      target.appendChild(item);
    });
  };

  const renderIndex = () => {
    $("recordCount").textContent = `${data.profiles.length} generalized profiles`;
    ["Animal cell culture", "Microbial fermentation"].forEach((category) => {
      const heading = document.createElement("h2");
      const list = document.createElement("ol");
      heading.textContent = category;
      list.className = "index-list";
      data.profiles.filter((profile) => profile.category === category).forEach((profile) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        const meta = document.createElement("small");
        link.href = `generalized.html?id=${encodeURIComponent(profile.id)}`;
        link.textContent = profile.name;
        meta.textContent = `${profile.sources.length} publications · ${profile.parameters.length} generalized parameters`;
        item.append(link, meta);
        list.appendChild(item);
      });
      $("profileIndex").append(heading, list);
    });
    $("indexView").hidden = false;
  };

  const renderProfile = (profile) => {
    document.title = `Generalized biology — ${profile.name}`;
    $("profileTitle").textContent = profile.name;
    $("profileCategory").textContent = profile.category;
    $("sourceCount").textContent = `${profile.sources.length} publications synthesized`;
    $("profileScope").textContent = profile.scope;
    $("recommendation").textContent = profile.recommendation;

    profile.parameters.forEach((parameter) => {
      const row = document.createElement("tr");
      [parameter.name, parameter.representative, parameter.range, parameter.confidence].forEach((text, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) cell.scope = "row";
        cell.textContent = text;
        row.appendChild(cell);
      });
      const basis = document.createElement("td");
      const paragraph = document.createElement("p");
      const links = document.createElement("ol");
      paragraph.textContent = parameter.basis;
      links.className = "parameter-references";
      renderSources(profile, parameter.references, links);
      basis.append(paragraph, links);
      row.appendChild(basis);
      $("parameterRows").appendChild(row);
    });

    renderSources(profile, profile.sources.map((_, index) => index), $("sourceList"));
    $("profileView").hidden = false;
  };

  try {
    if (!data) throw new Error("Generalized biology profiles did not load.");
    const id = new URLSearchParams(location.search).get("id");
    if (!id) renderIndex();
    else {
      const profile = data.profiles.find((item) => item.id === id);
      if (!profile) throw new Error(`Unknown generalized profile: ${id}`);
      renderProfile(profile);
    }
  } catch (error) {
    $("error").hidden = false;
    $("error").textContent = error.message;
  }
})();
