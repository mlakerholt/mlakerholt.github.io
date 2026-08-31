(() => {
  "use strict";

  const showLoadError = (error) => {
    console.error(error);
    const status = document.getElementById("saveStatus");
    if (status) {
      status.textContent = `Application failed to load: ${error.message}`;
      status.style.color = "#8b1f1f";
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

    const executableSource = source.replace(startupHook, immediateStartup);
    const sourceUrl = URL.createObjectURL(new Blob([executableSource], { type: "text/javascript" }));

    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = sourceUrl;
        script.onload = resolve;
        script.onerror = () => reject(new Error("The simulator source could not be started."));
        document.head.appendChild(script);
      });
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  };

  loadSimulator().catch(showLoadError);
})();
