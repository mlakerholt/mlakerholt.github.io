"""Back up cited manufacturer responses and explicitly selected original PDFs.
Run from any directory. Existing successful downloads are retained on reruns.
"""
import base64, concurrent.futures, datetime, gzip, hashlib, json, re, urllib.request, sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT / 'originals'
ARCHIVE.mkdir(exist_ok=True)
records = json.loads(gzip.decompress(base64.b64decode((ROOT / 'source-records.payload').read_bytes())))
jobs = {}
for record in records:
    for link in record['links']:
        job = jobs.setdefault(link['url'], dict(url=link['url'], title=link['title'], kind='cited-webpage', presetIds=[], claimedSupport=link['supports']))
        job['presetIds'].append(record['id'])
selection = ROOT / 'archive-selection.json'
if selection.exists():
    for item in json.loads(selection.read_text(encoding='utf-8')):
        prefixes = item.pop('prefixes')
        item['presetIds'] = [r['id'] for r in records if any(r['id'].startswith(p) if p.endswith('-') else r['id'] == p for p in prefixes)]
        jobs[item['url']] = item
manifest_file = ARCHIVE / 'manifest.json'
old = {x['url']: x for x in json.loads(manifest_file.read_text(encoding='utf-8'))['documents']} if manifest_file.exists() else {}
for entry in old.values():
    if entry.get('importMethod') == 'user-supplied-local-file' or entry.get('preserveArchive'):
        jobs[entry['url']] = entry

def archive(job):
    existing = old.get(job['url'])
    if job.get('importMethod') == 'user-supplied-local-file' or job.get('preserveArchive'):
        saved = ARCHIVE / job['file']
        if not saved.exists() or hashlib.sha256(saved.read_bytes()).hexdigest() != job['sha256']:
            raise ValueError('Local imported archive missing or changed: ' + job['file'])
        return job
    if existing and existing.get('status') == 'unavailable' and '--retry' not in sys.argv:
        return existing
    if existing and existing.get('status') == 'archived' and (ARCHIVE / existing['file']).exists():
        if hashlib.sha256((ARCHIVE / existing['file']).read_bytes()).hexdigest() == existing['sha256']:
            return existing
    result = dict(job, retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), verification='Document archived; individual preset values not yet verified against pages/tables.')
    try:
        request = urllib.request.Request(job['url'], headers={'User-Agent': 'Mozilla/5.0 (compatible; LocalSourceBackup/1.0)'})
        with urllib.request.urlopen(request, timeout=25) as response:
            data = response.read(40 * 1024 * 1024 + 1)
            result.update(finalUrl=response.url, httpStatus=response.status, contentType=response.headers.get('Content-Type'), lastModified=response.headers.get('Last-Modified'), etag=response.headers.get('ETag'))
        if len(data) > 40 * 1024 * 1024: raise ValueError('Document exceeds 40 MB limit')
        is_pdf = data.startswith(b'%PDF-')
        if job['kind'] != 'cited-webpage' and not is_pdf: raise ValueError('Expected original PDF, received non-PDF response')
        if not is_pdf:
            html = data.decode('utf-8', errors='replace')
            title = re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.S)
            result['responseTitle'] = re.sub(r'\s+', ' ', title.group(1)).strip() if title else ''
            if re.search(r'access denied|just a moment|robot|captcha|page not found|404|error', result['responseTitle'], re.I):
                raise ValueError('Error/challenge page: ' + result['responseTitle'])
            result['discoveredPdfLinks'] = sorted(set(urljoin(result['finalUrl'], u.replace('&amp;', '&')) for u in re.findall(r'(?:href|src)=[\"\x27]([^\"\x27]+\.pdf(?:\?[^\"\x27]*)?)[\"\x27]', html, re.I)))
            result['verification'] = 'Raw HTML response only; may depend on online assets. Not a verified offline rendering or field-level citation.'
        digest = hashlib.sha256(data).hexdigest()
        slug = re.sub('[^a-z0-9]+', '-', job['title'].lower()).strip('-')[:100]
        filename = slug + '-' + digest[:12] + ('.pdf' if is_pdf else '.html.txt')
        (ARCHIVE / filename).write_bytes(data)
        result.update(status='archived', file=filename, sha256=digest, bytes=len(data), format='pdf' if is_pdf else 'raw-html')
    except Exception as error:
        result.update(status='unavailable', error=str(error))
    print(result['status'], job['title'], flush=True)
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    documents = list(pool.map(archive, jobs.values()))
manifest = dict(updatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), description='Manufacturer-source backup. Preset associations indicate relevance, not verification of all values. Existing sources/pdfs are locally generated summaries.', documents=documents)
manifest_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print('Archived:', sum(d['status']=='archived' for d in documents), 'Unavailable:', sum(d['status']!='archived' for d in documents))
