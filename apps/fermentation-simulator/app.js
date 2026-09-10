(() => {
  "use strict";

  const retroStylesheet = document.createElement("link");
  retroStylesheet.rel = "stylesheet";
  retroStylesheet.href = "retro.css";
  document.head.appendChild(retroStylesheet);

  const modelStatus = document.querySelector(".hero-note");
  if (modelStatus) {
    modelStatus.remove();
  }

  const hero = document.querySelector(".hero");
  if (hero) {
    hero.style.gridTemplateColumns = "minmax(0, 1fr)";
  }

  const showLoadError = (error) => {
    console.error(error);
    const status = document.getElementById("saveStatus");
    if (status) {
      status.textContent = `Application failed to load: ${error.message}`;
      status.style.color = "#8b1f1f";
    }
  };

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}.`));
    document.head.appendChild(script);
  });

  const loadCompressedSource = async (filename) => {
    const response = await fetch(filename, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load ${filename}.`);

    const binary = atob((await response.text()).trim());
    const compressedBytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decompressedStream = new Blob([compressedBytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    return new Response(decompressedStream).text();
  };

  const executeSource = async (source) => {
    const sourceUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    try {
      await loadScript(sourceUrl);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  };

  const loadSimulator = async () => {
    if (!("DecompressionStream" in window)) {
      throw new Error("This browser does not support the compressed simulator bundle. Please use a current browser.");
    }

    const files = Array.from({ length: 7 }, (_, index) =>
      `app.payload.${String(index).padStart(2, "0")}`
    );

    const parts = await Promise.all(files.map(async (file) => {
      const response = await fetch(file, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Could not load ${file}.`);
      return (await response.text()).trim();
    }));

    const binary = atob(parts.join(""));
    const compressedBytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decompressedStream = new Blob([compressedBytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    const source = await new Response(decompressedStream).text();
    const startupHook = 'document.addEventListener("DOMContentLoaded", init);';
    const immediateStartup = 'if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init, { once: true }); } else { init(); }';

    if (!source.includes(startupHook)) {
      throw new Error("The simulator bundle is incompatible with this loader.");
    }

    await executeSource(source.replace(startupHook, immediateStartup));
    await executeSource(await loadCompressedSource("vessel-catalog.payload"));
  };

  loadSimulator().catch(showLoadError);
})();
