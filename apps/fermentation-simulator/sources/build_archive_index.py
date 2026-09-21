"""Validate saved PDFs and build a self-contained, searchable archive catalogue."""
import base64, gzip, hashlib, html, json
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parent
archive = root / 'originals'
manifest = json.loads((archive / 'manifest.json').read_text(encoding='utf-8'))
records = json.loads(gzip.decompress(base64.b64decode((root / 'source-records.payload').read_bytes())))
for document in manifest['documents']:
    if document.get('file') == 'cytiva-xcellerex-xdr-10-data-file-17edcd3be39c.pdf':
        document['title'] = 'Cytiva Perfusion culture using TFF or ATF as cell retention method'
        document['kind'] = 'manufacturer-application-note'
        document['verification'] = 'Title corrected after inspecting content. This is a perfusion application note, not the XDR-10 datasheet. Experimental conditions must not be treated as equipment limits.'
    if document['status'] != 'archived': continue
    filename = archive / document['file']
    assert hashlib.sha256(filename.read_bytes()).hexdigest() == document['sha256'], filename
    if document['format'] == 'pdf':
        if document.get('pageCount') and document.get('textFile') and (archive / document['textFile']).exists():
            continue
        reader = PdfReader(filename)
        pages = [page.extract_text() or '' for page in reader.pages]
        document['pageCount'] = len(pages)
        document['pdfTitle'] = str((reader.metadata or {}).get('/Title', ''))
        document['textFile'] = filename.stem + '.txt'
        (archive / document['textFile']).write_text('\n\n'.join(f'=== PDF page {i+1} ===\n{text}' for i, text in enumerate(pages)), encoding='utf-8')
        document['pdfValidation'] = 'Parsed all pages and extracted text; layout and individual values still require review.'
manifest['coverage'] = [dict(id=r['id'], label=r['label'], manufacturer=r['manufacturer'], pdfCount=sum(d.get('format')=='pdf' and d['status']=='archived' and r['id'] in d['presetIds'] for d in manifest['documents'])) for r in records]
(archive / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
payload = json.dumps(manifest, ensure_ascii=False).replace('<', '\\u003c')
template = (root / 'archive-template.html').read_text(encoding='utf-8')
(archive / 'index.html').write_text(template.replace('/*ARCHIVE_DATA*/', payload), encoding='utf-8')
pdfs = [d for d in manifest['documents'] if d.get('format')=='pdf' and d['status']=='archived']
print(f'Validated {len(pdfs)} PDFs, {sum(d["pageCount"] for d in pdfs)} pages.')
print('Presets lacking original PDFs:', ', '.join(r['id'] for r in manifest['coverage'] if not r['pdfCount'] and r['manufacturer'] != 'Custom'))
