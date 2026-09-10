from __future__ import annotations

import base64
import gzip
import hashlib
import json
import textwrap
import unicodedata
import zlib
from pathlib import Path
from typing import Any

SOURCES_DIR = Path(__file__).resolve().parent
APP_DIR = SOURCES_DIR.parent
PAYLOAD = SOURCES_DIR / "source-records.payload"
VESSEL_PAYLOAD = APP_DIR / "vessel-catalog.payload"
SOURCE_INDEX = SOURCES_DIR / "index.html"
SOURCE_CSS = SOURCES_DIR / "source.css"
SOURCE_README = SOURCES_DIR / "README.md"
PDF_DIR = SOURCES_DIR / "pdfs"
DATE = "10 September 2026"


def asc(value: Any) -> str:
    if value is None:
        return "-"
    text = (
        str(value)
        .replace("\u00b5", "u")
        .replace("\u03bc", "mu")
        .replace("\u2082", "2")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2212", "-")
        .replace("\u00ae", "(R)")
        .replace("\u00a9", "(c)")
    )
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")


def esc_pdf(text: str) -> str:
    return asc(text).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def fmt_vol(value: float) -> str:
    if value < 0.001:
        return f"{value * 1_000_000:g} uL"
    if value < 1:
        return f"{value * 1000:g} mL"
    return f"{value:g} L"


def decode_records() -> list[dict[str, Any]]:
    return json.loads(gzip.decompress(base64.b64decode(PAYLOAD.read_text().strip())).decode())


def decode_bundle(path: Path) -> str:
    return gzip.decompress(base64.b64decode(path.read_text().strip())).decode()


def encode_bundle(path: Path, source: str) -> None:
    path.write_text(base64.b64encode(gzip.compress(source.encode(), mtime=0)).decode() + "\n")


def replace_once(text: str, old: str, new: str, *, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise RuntimeError(f"Could not update {label}: expected marker is missing")


def install_local_pdf_links() -> None:
    """Make every UI source link resolve to the locally generated PDF."""
    vessel_source = decode_bundle(VESSEL_PAYLOAD)
    vessel_source = replace_once(
        vessel_source,
        "sourcePage: options.sourcePage ?? `sources/?id=${encodeURIComponent(id)}`",
        "sourcePage: options.sourcePage ?? `sources/pdfs/${encodeURIComponent(id)}.pdf`",
        label="vessel PDF path",
    )
    vessel_source = vessel_source.replace(
        'sourceLink.textContent = "Review source documentation";',
        'sourceLink.textContent = "Open local PDF documentation";',
    )
    vessel_source = vessel_source.replace(
        '? "Review source documentation"',
        '? "Open local PDF documentation"',
    )
    vessel_source = vessel_source.replace(
        "? `Open the local evidence record for ${selectedVessel.label}`",
        "? `Open the local PDF source record for ${selectedVessel.label}`",
    )
    encode_bundle(VESSEL_PAYLOAD, vessel_source)

    html = SOURCE_INDEX.read_text()
    html = html.replace("source.css?v=2026-09-10.4", "source.css?v=2026-09-10.5")
    html = html.replace('const BUILD_ID = "2026-09-10.4";', 'const BUILD_ID = "2026-09-10.5";')
    html = replace_once(
        html,
        '<p class="notice">There is one local evidence record for every vessel option in the simulator. Each record preserves the preset values, distinguishes source-supported data from simulator-derived assumptions, and links to the original manufacturer documentation.</p>',
        '<p class="notice">There is one local evidence record and one local PDF for every vessel option in the simulator. Each record preserves the preset values, distinguishes source-supported data from simulator-derived assumptions, and identifies the original manufacturer documentation.</p>',
        label="source-index notice",
    )
    html = replace_once(
        html,
        '<p class="notice"><strong>Local evidence record.</strong> This page preserves the factual preset values, provenance notes and links used by the simulator. It is not a mirror of the vendor\'s copyrighted webpage or manual; the linked official document remains the authoritative source.</p>',
        '<p class="notice"><strong>Local evidence record.</strong> This page preserves the factual preset values and provenance notes used by the simulator. A local PDF source record is provided for offline review; the official manufacturer URLs listed below remain the authoritative original sources.</p>',
        label="record notice",
    )
    html = replace_once(
        html,
        "    <h2>Original manufacturer documentation</h2>\n    <div id=\"officialSources\"></div>",
        "    <h2>Local PDF documentation</h2>\n    <div id=\"localPdf\"></div>\n\n    <h2>Original manufacturer references</h2>\n    <div id=\"officialSources\"></div>",
        label="local-PDF section",
    )
    html = html.replace(
        '<footer>These are locally authored factual records, not copies of complete vendor manuals or webpages. Vendor names and marks belong to their respective owners.</footer>',
        '<footer>Each vessel has a locally stored PDF source record. Complete vendor manuals and webpages are not republished; vendor names and marks belong to their respective owners.</footer>',
    )
    html = replace_once(
        html,
        "          item.append(link, material);",
        "          const pdfLink = document.createElement(\"a\");\n"
        "          pdfLink.href = record.localPdf || `pdfs/${encodeURIComponent(record.id)}.pdf`;\n"
        "          pdfLink.textContent = \" [PDF]\";\n"
        "          pdfLink.title = `Open local PDF documentation for ${record.label}`;\n"
        "          item.append(link, material, pdfLink);",
        label="source-index PDF link",
    )
    html = replace_once(
        html,
        '    addSummary("Record compiled", "10 September 2026");\n\n    const sourceHost = $("officialSources");',
        '    addSummary("Record compiled", "10 September 2026");\n\n'
        '    const pdfHost = $("localPdf");\n'
        '    pdfHost.replaceChildren();\n'
        '    const pdfParagraph = document.createElement("p");\n'
        '    const pdfLink = document.createElement("a");\n'
        '    pdfLink.href = record.localPdf || `pdfs/${encodeURIComponent(record.id)}.pdf`;\n'
        '    pdfLink.target = "_blank";\n'
        '    pdfLink.rel = "noopener noreferrer";\n'
        '    pdfLink.textContent = "Open local PDF source documentation";\n'
        '    pdfParagraph.appendChild(pdfLink);\n'
        '    const pdfNote = document.createElement("small");\n'
        '    pdfNote.textContent = "The PDF is stored inside this GitHub Pages site and contains the evidence record plus clickable official manufacturer URLs.";\n'
        '    pdfParagraph.appendChild(pdfNote);\n'
        '    pdfHost.appendChild(pdfParagraph);\n\n'
        '    const sourceHost = $("officialSources");',
        label="record PDF link",
    )
    SOURCE_INDEX.write_text(html)

    css = SOURCE_CSS.read_text()
    css_addition = (
        "\n#localPdf small { display: block; color: #4d574f; margin-top: 0.25rem; }\n"
        ".index-list a:last-child { white-space: nowrap; }\n"
    )
    if "#localPdf small" not in css:
        SOURCE_CSS.write_text(css.rstrip() + "\n" + css_addition)

    readme = SOURCE_README.read_text()
    pdf_line = "- `pdfs/` contains one local PDF source record per vessel preset plus a checksum manifest."
    if pdf_line not in readme:
        SOURCE_README.write_text(readme.rstrip() + "\n\n" + pdf_line + "\n")


class PDF:
    def __init__(self) -> None:
        self.objects: dict[int, bytes] = {}
        self.next = 1

    def reserve(self) -> int:
        object_id = self.next
        self.next += 1
        self.objects[object_id] = b""
        return object_id

    def add(self, data: str | bytes) -> int:
        object_id = self.reserve()
        self.objects[object_id] = data.encode("ascii") if isinstance(data, str) else data
        return object_id

    def set(self, object_id: int, data: str | bytes) -> None:
        self.objects[object_id] = data.encode("ascii") if isinstance(data, str) else data

    def write(self, path: Path, root: int) -> None:
        output = bytearray(b"%PDF-1.4\n%ASCII\n")
        offsets = [0] * self.next
        for object_id in range(1, self.next):
            offsets[object_id] = len(output)
            output += f"{object_id} 0 obj\n".encode() + self.objects[object_id] + b"\nendobj\n"
        xref = len(output)
        output += f"xref\n0 {self.next}\n".encode()
        output += b"0000000000 65535 f \n"
        for object_id in range(1, self.next):
            output += f"{offsets[object_id]:010d} 00000 n \n".encode()
        output += (
            f"trailer\n<< /Size {self.next} /Root {root} 0 R >>\n"
            f"startxref\n{xref}\n%%EOF\n"
        ).encode()
        path.write_bytes(output)


def build_record(record: dict[str, Any], path: Path) -> None:
    pdf = PDF()
    catalog = pdf.reserve()
    pages_object = pdf.reserve()
    font_regular = pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold = pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    pages: list[tuple[list[str], list[tuple[float, float, float, float, str]]]] = []
    current: list[str] = []
    current_links: list[tuple[float, float, float, float, str]] = []
    y = 790.0

    def new_page() -> None:
        nonlocal current, current_links, y
        if current or not pages:
            pages.append((current, current_links))
        current = []
        current_links = []
        y = 790.0

    def draw_text(
        text: str,
        size: float = 9,
        bold: bool = False,
        color: str = "0 0 0",
        x: float = 54,
        leading: float | None = None,
        wrap: int = 94,
        space_after: float = 3,
        link: str | None = None,
    ) -> None:
        nonlocal y
        leading = leading or size * 1.28
        lines: list[str] = []
        for paragraph in asc(text).split("\n"):
            lines += textwrap.wrap(
                paragraph,
                width=wrap,
                break_long_words=True,
                break_on_hyphens=False,
            ) or [""]
        needed = len(lines) * leading + space_after
        if y - needed < 55:
            new_page()
        first_y = y
        for line in lines:
            current.append(
                f"BT {color} rg /F{2 if bold else 1} {size:g} Tf "
                f"1 0 0 1 {x:g} {y:g} Tm ({esc_pdf(line)}) Tj ET"
            )
            y -= leading
        if link:
            current_links.append(
                (
                    x,
                    first_y - size * 0.25,
                    min(540, x + max(160, min(480, len(lines[0]) * size * 0.56))),
                    first_y + size,
                    asc(link),
                )
            )
        y -= space_after

    def heading(text: str) -> None:
        nonlocal y
        if y < 90:
            new_page()
        draw_text(text, 12, bold=True, color="0.122 0.361 0.18", wrap=75, space_after=6)

    def key_value(label: str, value: Any) -> None:
        draw_text(f"{label}: {value}", 8.4, wrap=105, space_after=1.5)

    draw_text(record["label"], 17, bold=True, color="0.122 0.361 0.18", wrap=65, space_after=6)
    draw_text(
        f'Local source PDF | preset {record["id"]} | compiled {DATE}',
        8,
        color=".35 .35 .35",
        wrap=100,
        space_after=8,
    )
    draw_text(
        "This PDF is stored inside the GitHub project and records the evidence used by the "
        "simulator. It is not a copied vendor brochure or manual. The official manufacturer "
        "references below remain the authoritative originals.",
        8.3,
        wrap=105,
        space_after=8,
    )
    key_value("Manufacturer", record["manufacturer"])
    key_value("Product-contact material", record["material"])
    key_value("Working volume", f'{fmt_vol(record["minVolume"])} to {fmt_vol(record["maxVolume"])}')
    key_value("Nominal vessel or bag size", fmt_vol(record["nominalVolume"]))
    key_value("Simulation profile", record["profile"])
    key_value("Evidence status", record["status"])

    heading("Original manufacturer references")
    if record.get("links"):
        for index, source in enumerate(record["links"], 1):
            draw_text(f'{index}. {source["title"]}', 9, bold=True, wrap=92, space_after=2)
            draw_text(
                "Open official manufacturer source online",
                8.5,
                color="0.122 0.361 0.18",
                wrap=95,
                space_after=1,
                link=source["url"],
            )
            draw_text(source["url"], 6.8, color=".35 .35 .35", wrap=120, space_after=2)
            draw_text(f'Supports: {source["supports"]}', 7.5, wrap=112, space_after=5)
    else:
        draw_text("No manufacturer document applies to this custom template.", 8.5)

    heading("Evidence basis")
    draw_text(f'Volume: {record["volumeBasis"]}', 8.2, wrap=108, space_after=4)
    draw_text(f'Material: {record["materialBasis"]}', 8.2, wrap=108, space_after=4)
    for note in record.get("notes") or ["No additional note."]:
        draw_text(f"- {note}", 7.8, wrap=112, space_after=2)

    heading("Record note")
    draw_text(
        "This source PDF is paired with the detailed HTML provenance record in the same "
        "repository. Simulator-specific defaults and derived assumptions are listed there.",
        7.8,
        wrap=112,
        space_after=4,
    )
    draw_text(
        "Copyright and trademarks in the linked manufacturer documentation remain with the "
        "respective vendor.",
        7,
        color=".35 .35 .35",
        wrap=115,
        space_after=2,
    )
    new_page()

    page_ids: list[int] = []
    for commands, links in pages:
        annotation_ids: list[int] = []
        for x1, y1, x2, y2, url in links:
            annotation_ids.append(
                pdf.add(
                    f"<< /Type /Annot /Subtype /Link /Rect [{x1:.1f} {y1:.1f} {x2:.1f} {y2:.1f}] "
                    f"/Border [0 0 0] /A << /S /URI /URI ({esc_pdf(url)}) >> >>"
                )
            )
        border = "q 0.122 0.361 0.18 RG 0.8 w 34 34 527 774 re S Q"
        raw_stream = (border + "\n" + "\n".join(commands)).encode("ascii")
        stream = base64.a85encode(zlib.compress(raw_stream, 9), adobe=False, wrapcol=0) + b"~>"
        contents = pdf.add(
            b"<< /Length "
            + str(len(stream)).encode()
            + b" /Filter [/ASCII85Decode /FlateDecode] >>\nstream\n"
            + stream
            + b"\nendstream"
        )
        annotations = (
            " /Annots [" + " ".join(f"{annotation_id} 0 R" for annotation_id in annotation_ids) + "]"
            if annotation_ids
            else ""
        )
        page = pdf.add(
            f"<< /Type /Page /Parent {pages_object} 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> "
            f"/Contents {contents} 0 R{annotations} >>"
        )
        page_ids.append(page)
    pdf.set(
        pages_object,
        f'<< /Type /Pages /Kids [{" ".join(f"{page_id} 0 R" for page_id in page_ids)}] '
        f"/Count {len(page_ids)} >>",
    )
    pdf.set(catalog, f"<< /Type /Catalog /Pages {pages_object} 0 R >>")
    pdf.write(path, catalog)


def main() -> None:
    records = decode_records()
    if len(records) != 67:
        raise RuntimeError(f"Expected 67 vessel records, found {len(records)}")

    install_local_pdf_links()
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    for old_pdf in PDF_DIR.glob("*.pdf"):
        old_pdf.unlink()

    manifest: list[dict[str, Any]] = []
    for record in records:
        path = PDF_DIR / f'{record["id"]}.pdf'
        build_record(record, path)
        manifest.append(
            {
                "id": record["id"],
                "label": record["label"],
                "manufacturer": record["manufacturer"],
                "file": path.name,
                "bytes": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "officialUrls": [source["url"] for source in record["links"]],
            }
        )

    (PDF_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (PDF_DIR / "README.md").write_text(
        "# Local vessel source PDFs\n\n"
        f"This directory contains {len(records)} generated local PDF source records, one per vessel preset.\n\n"
        "Each PDF contains the locally authored evidence summary and clickable official manufacturer "
        "references. Complete third-party manuals and brochures are not mirrored. Regenerate with "
        "`python ../build_pdfs.py`.\n",
        encoding="utf-8",
    )

    sizes = [(PDF_DIR / f'{record["id"]}.pdf').stat().st_size for record in records]
    print(f"Generated {len(records)} PDFs ({sum(sizes)} bytes total).")


if __name__ == "__main__":
    main()
