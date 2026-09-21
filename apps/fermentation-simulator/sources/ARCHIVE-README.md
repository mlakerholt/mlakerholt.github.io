# Manufacturer original backups

Open `originals/index.html` to browse the archive even without a server. The simulator's source panel also links here, filtered to the selected preset.

Original PDF bytes are preserved under `originals/`. Each manifest entry records the requested URL, final URL, UTC retrieval time, response metadata, byte count, SHA-256 checksum, related preset IDs, and download outcome. Content hashes in filenames distinguish different document versions. `sources/pdfs/` remains a separate collection of locally authored summaries.

The HTML backups are raw server responses saved as `.html.txt` so opening them does not execute third-party scripts. They are not complete offline website captures. Their presence does not establish that all technical content was captured.

PDF text companions include one-based PDF page markers for finding a number. PDF page indices can differ from printed page numbers. Text extraction can lose table alignment; inspect the original PDF before citing a value. PDF parsing is a structural check, not scientific validation.

Preset associations indicate relevance only. Check the exact model, generation, bag configuration, application, document revision, units, and page/table before treating a number as sourced. No simulator values have been revised or newly marked verified by this archival work. Custom presets have no manufacturer original.

## Updating

`archive-selection.json` lists the explicitly selected manufacturer PDF URLs. The downloader also reads all existing cited webpage URLs from `source-records.payload`.

Run `python sources/archive_sources.py` to retrieve new selections. Existing successful files are checksum-checked and reused. Failed URLs are retained; add `--retry` to retry them. Run `python sources/build_archive_index.py` afterward to validate PDFs, extract page-marked text, and rebuild the catalogue. The index builder requires pypdf (available in the bundled Python runtime).

The current workflow preserves successful downloads rather than silently replacing them with a newer online version. Keep a separate copy of this folder on another drive or backup service for protection against disk loss. Original documents retain their publisher's copyright; this archive has not been published.
