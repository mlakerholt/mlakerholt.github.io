# Evozyme — Directed Evolution Planner

A static browser application for campaign planning, equipment and software access, library coverage, operating costs, primary-screen review, independent confirmation records, and linked rounds. Matches the website's green-and-white retro style.

Open `index.html` through an HTTP server at `/apps/evozyme/`. ES modules and workers require HTTP(S); opening the file directly is not supported. Production uses the existing GitHub Pages site. There are no runtime third-party dependencies, accounts, analysis API charges, or server data uploads.

## Develop and verify

Use Node.js 24 or a compatible supported Node release. Run `npm install`, `npm test`, and `npm run build` from this directory. The only development dependency is the pinned Markdown renderer. Serve the website repository root with a static HTTP server and visit `/apps/evozyme/`.

The build checks module syntax, generates the searchable handbook, copies its downloads, and checks generated local links. In the Evozyme workspace it reads the original handbook, templates, toolkit, workbook, and presentation from the workspace root. In a standalone checkout it uses the retained `content/` sources and existing downloads. Edit the original Markdown in the workspace, or `content/` when working from the standalone site checkout; generated guide HTML should not be edited by hand.

## Structure

- `core.mjs`: pure coverage, budget, fitting, screening, and confirmation calculations.
- `io.mjs`: CSV handling, browser storage, backup validation, downloads, and file fingerprints.
- `data.mjs`: campaign/round records, equipment configurations, and defaults.
- `app.mjs`: interface actions, persistence, imports, and analysis snapshots.
- `planner.mjs`, `screen.mjs`, `review.mjs`, `ui.mjs`, `charts.mjs`: interface views and accessible tables/plots.
- `analysis-worker.mjs`: parsing and analysis away from the main interface thread.
- `content/`, `guide/`, `downloads/`, `example/`: editorial sources, generated guide, reusable resources, and synthetic fixtures.
- `tests/`: Node regression and numerical-parity tests.

## Data and backup

Campaigns are stored in the device's `evozyme-campaigns` IndexedDB database. Browser clearing, eviction, or disabled storage can remove/prevent this convenience copy. Export complete campaign JSON backups and keep external sequence/evidence files with them. Imported raw CSV text, SHA-256 fingerprints, assay settings, engine versions, analysis snapshots and round IDs are preserved. Fingerprints detect accidental raw-file changes; they do not authenticate laboratory results.

Screen imports use the toolkit's three CSV filenames and optional `assay.json`, with a combined 10 MB limit. Confirmation imports also have a 10 MB limit. Portable backup restoration accepts up to 100 MB. Browser quotas can be lower than campaign history growth; save failure is shown and export remains available. A blank quote or measurement is not converted into a zero.

Same-origin applications share the browser security boundary; namespacing avoids accidental storage collisions, not access isolation. Imported strings are escaped as text and text-formula prefixes are neutralized in derived CSV exports. Original raw-file downloads remain unchanged.

## Analysis scope

Supports 96-well, configured-timepoint linear-rate screens with one preparation per candidate per plate. Multiple plates are evaluated independently. Technical wells are averaged within preparations; parent variation uses independent-preparation means. Failed plates cannot nominate candidates. Lower and upper detector limits can be configured. Thresholds are assay-specific; defaults are teaching assumptions.

Confirmation summaries are descriptive means, sample standard deviations, and ratios within each assay ID. Different assay IDs are not pooled. A confirmed decision requires at least two independent candidate and parent observations plus explicit sequence, product, stock, property, reference, and rationale records. This records an analyst decision; it does not infer statistical significance or validate experimental claims.

Coverage assumes independent draws with replacement. Complete-coverage bounds are not exact probabilities. The NNK preset already accounts for TAG. Costs are planning assumptions, acquisition is separate, and changing a currency label does not convert prices.

## Release

Commit the validated app directory together with `apps/index.html` to the site's publishing branch. Preserve the existing Pages configuration. Check the live app, worker, guide, downloads, and listing after deployment. Roll back by reverting the release commit if needed.

See `RELEASE_NOTES.md` and `VERIFICATION.md` for release details and practical limits. The optional WebMCP interface is feature-detected; browsers without it use the normal interface.
