(() => {
  "use strict";

  const BUILD_ID = "2026-09-10.7";

  const retroStylesheet = document.createElement("link");
  retroStylesheet.rel = "stylesheet";
  retroStylesheet.href = `retro.css?v=${BUILD_ID}`;
  document.head.appendChild(retroStylesheet);

  const hiddenElementStyle = document.createElement("style");
  hiddenElementStyle.textContent = "[hidden] { display: none !important; }";
  document.head.appendChild(hiddenElementStyle);

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
    const response = await fetch(`${filename}?v=${BUILD_ID}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${filename}.`);

    const binary = atob((await response.text()).trim());
    const compressedBytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decompressedStream = new Blob([compressedBytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    return new Response(decompressedStream).text();
  };

  const executeSource = async (source, { replayDomReady = false } = {}) => {
    const sourceUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    let originalAddEventListener = null;

    // Extension bundles may register DOMContentLoaded after that event has
    // already fired. Replay only newly registered DOM-ready callbacks while
    // the bundle is being evaluated, without dispatching the event globally.
    if (replayDomReady && document.readyState !== "loading") {
      originalAddEventListener = document.addEventListener;
      document.addEventListener = function addEventListenerWithDomReplay(type, listener, options) {
        if (type === "DOMContentLoaded") {
          queueMicrotask(() => {
            const event = new Event("DOMContentLoaded");
            if (typeof listener === "function") {
              listener.call(document, event);
            } else if (listener && typeof listener.handleEvent === "function") {
              listener.handleEvent(event);
            }
          });
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    }

    try {
      await loadScript(sourceUrl);
      await Promise.resolve();
    } finally {
      if (originalAddEventListener) {
        document.addEventListener = originalAddEventListener;
      }
      URL.revokeObjectURL(sourceUrl);
    }
  };

  const hasManufacturerSelector = () => Array.from(document.querySelectorAll("label"))
    .some((label) => label.textContent.trim() === "Manufacturer");

  const waitForManufacturerSelector = async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (hasManufacturerSelector()) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("The manufacturer vessel selector did not initialize.");
  };

  const loadSimulator = async () => {
    if (!("DecompressionStream" in window)) {
      throw new Error("This browser does not support the compressed simulator bundle. Please use a current browser.");
    }

    const files = Array.from({ length: 7 }, (_, index) =>
      `app.payload.${String(index).padStart(2, "0")}`
    );

    const parts = await Promise.all(files.map(async (file) => {
      const response = await fetch(`${file}?v=${BUILD_ID}`, { cache: "no-store" });
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
    await executeSource(await loadCompressedSource("vessel-catalog.payload"), { replayDomReady: true });
    await waitForManufacturerSelector();
    await loadScript(`source-derivations.js?v=${BUILD_ID}`);
    await loadScript(`source-panel.js?v=${BUILD_ID}`);

    document.documentElement.dataset.fermentationBuild = BUILD_ID;
  };

  loadSimulator().catch(showLoadError);
})();
