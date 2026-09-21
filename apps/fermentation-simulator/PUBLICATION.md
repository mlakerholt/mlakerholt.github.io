# Public release — 21 September 2026

The public app contains the current simulator, shared calculation engine, process controls,
organism/vessel databanks, calculation map, failure rules and documentation, eight redesigned
illustrations, authored vessel PDF derivation sheets, readable UI sources and regression tests.

Local-only exclusions: desktop shortcuts, scratch files, private audit/recovery folders,
superseded illustration backups, downloaded manufacturer originals/raw webpages, and the
benchmark source PDF. Public source pages link to the original publishers instead.

Run locally with `node local-server.cjs`. Run all `sources/test-*.cjs` tests with Node;
pass `--public` to `test-audit.cjs` to omit only third-party original-byte checks.
The full audit, including original-byte checks, was run against the local project before publication.
Rebuild shipped UI payloads with `node sources/build-app.cjs`.
The simulator-specific GitHub workflow validates the checked-in release without rewriting it.
