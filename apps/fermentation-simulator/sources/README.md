# Vessel source records

This directory contains the local source and provenance library used by the Fermentation Simulator vessel selector.

- `index.html` renders either the complete source index or one vessel record selected with `?id=<preset-id>`.
- `source-records.payload` is a gzip-compressed, Base64-encoded JSON catalogue containing one locally authored evidence record for every vessel preset.
- `source.css` provides the retro presentation layer.

The records preserve cited preset facts, clearly identify simulator-derived values, and link to original manufacturer documentation. They do not republish complete third-party manuals or webpages.

- `pdfs/` contains one local PDF source record per vessel preset plus a checksum manifest.
