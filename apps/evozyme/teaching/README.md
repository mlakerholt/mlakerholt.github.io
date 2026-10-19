# Evozyme teaching edition

`../index.html` is the canonical entry. Serve the repository over HTTP and open
`/apps/evozyme/`. No application runtime packages, build service or account are
required. Existing `planner.html`, handbook, imports and downloads remain available.
The old overview remains at `overview.html`.

## Structure

- `app.mjs`: hash navigation, course/case views, notebook persistence and campaign exports.
- `content.mjs`: nine lessons, seven principles, eight failure cases and glossary.
- `labs.mjs`: eight interactive laboratories with accessible controls and numerical tables.
- `model.mjs`: pure seeded numerical models and transparent assumptions.
- `teaching.css`: responsive green/grey scientific-software presentation.

The four learning layers are introduction, experimental design, failure diagnosis
and advanced reference. The EST1 case progresses through five rounds, including
failed confirmation and epistasis. Independent lab examples are explicitly separate
synthetic datasets. The shared status bar describes the EST1 case; the capstone
report describes the user's own campaign.

The assay model intentionally omits substrate depletion and detailed enzyme physics.
NNK/NNS coverage sums inclusion probabilities over amino-acid multiplicities and
includes stop losses once. Library quality factors are independent, sequence-agnostic
assumptions. Coverage is an expected fraction, never full-coverage probability.
The landscape displays measured categorical points only; it is not a known global
fitness surface. Advanced methods are conceptual reference material, not full
implementations of ML or laboratory protocols.

Browser local storage uses `evozyme-teaching-v2`, independent of legacy planner data.
A failed save is visible. Campaign JSON import checks version, field types, ranges
and size; text is escaped when rendered. Campaign JSON exports contain campaign
fields, while Markdown reports also include course/failure notes. Sliders reset on
navigation. No third-party runtime requests are made by the teaching app.

## Checks

From `apps/evozyme`, run `npm ci`, `npm test`, and `npm run build`.
The build preserves the hand-maintained teaching homepage. Scientific tests cover
kinetic limits, Z′, Poisson normalization, exact occupancy examples, codon bias,
quality gates, Pareto logic, plate allocations, assay clipping and campaign reports.

Browser integration smoke test: `node tests/teaching-browser.mjs` with Playwright
installed and a Chromium binary available. `EVOZYME_BROWSER_EXECUTABLE` can select
an existing binary; `EVOZYME_TEST_URL` can select an already-running local server.

## Verification for this revision

- 62 numerical/regression tests passed (51 existing + 11 teaching-model tests).
- Production build passed; existing handbook and downloads were retained.
- Chromium smoke test passed for all nine lessons, eight labs, three cases,
  eight failure puzzles and all reference sections.
- Confirmed prediction-before-reveal, five-round progression, note persistence,
  JSON export/import, Markdown export, invalid numeric input handling, blocked
  browser storage, and legacy hash redirects.
- Inspected desktop start/assay screenshots and a 390px mobile screenshot;
  tested representative routes for horizontal page overflow.

No claim is made that synthetic models predict real enzyme performance.
