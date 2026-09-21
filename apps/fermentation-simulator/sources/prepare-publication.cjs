/* Prepare the existing GitHub Pages app directory without copying local archives. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const target = path.resolve(process.argv[2] || '.');
if (path.basename(target) !== 'fermentation-simulator' || path.basename(path.dirname(target)) !== 'apps' ||
    !fs.existsSync(path.join(target, '../../.git')) || target === root) {
  throw new Error('Pass the apps/fermentation-simulator directory inside a separate checked-out GitHub repository.');
}
const copied = [];
const copy = relative => {
  const destination = path.join(target, relative);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  if (/\.(?:html|css|js|cjs|md|ps1|py|json|txt|payload(?:\.\d+)?)$/i.test(relative)) {
    fs.writeFileSync(destination, fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n'));
  } else fs.copyFileSync(path.join(root, relative), destination);
  copied.push(relative.replaceAll('\\', '/'));
};
const walk = (relative, accept) => {
  for (const entry of fs.readdirSync(path.join(root, relative), {withFileTypes:true})) {
    const item = path.join(relative, entry.name);
    if (!accept(item.replaceAll('\\', '/'), entry)) continue;
    if (entry.isDirectory()) walk(item, accept);
    else if (entry.isFile()) copy(item);
  }
};
for (const entry of fs.readdirSync(root, {withFileTypes:true})) {
  if (entry.isFile() && /\.(?:html|css|js|cjs|md|ps1|payload(?:\.\d+)?)$/i.test(entry.name)) copy(entry.name);
}
walk('sources', item => !/^sources\/(?:originals|audit-baseline)(?:\/|$)/.test(item) &&
  !/^sources\/import-/.test(item));
walk('assets/failures', (item, entry) => !entry.isDirectory() && /\.(?:png|md)$/.test(item));
walk('benchmarks', item => !item.endsWith('/source.pdf'));
copy('tmp/app-source.js');
copy('tmp/vessel-catalog-source.js');
copy('tmp/review-fed-batch.cjs');
const write = (relative, text) => {
  fs.mkdirSync(path.dirname(path.join(target, relative)), {recursive:true});
  fs.writeFileSync(path.join(target, relative), text);
};
const read = relative => fs.readFileSync(path.join(target, relative), 'utf8');
const replace = (text, before, after) => {
  if (!text.includes(before)) throw new Error('Publication template changed: '+before.slice(0,90));
  return text.replace(before, after);
};
// Keep the interactive source sheets, but link to publisher copies on the public site.
let sheet = read('sources/index.html');
sheet = replace(sheet, 'Local manufacturer backups', 'Manufacturer source references');
sheet = replace(sheet, 'open it for the local original PDF page, the calculation, or the unresolved assumption.',
  'open it for the source citation and PDF page, the calculation, or the unresolved assumption.');
sheet = replace(sheet, "local.href = source.file ? `originals/${source.file}${source.page ? `#page=${source.page}` : ''}` : source.url;",
  "const hasOnlineSource = /^https?:\\/\\//i.test(source.url || '');\n      if (hasOnlineSource) local.href = source.url; else local.removeAttribute('href');");
sheet = replace(sheet, "(${source.file ? 'local original' : 'online only; local backup unavailable'})",
  "(${hasOnlineSource ? 'manufacturer publication' : 'original retained in local archive; public URL unavailable'})");
sheet = replace(sheet, 'if(source.url) p.append(document.createTextNode(" | "), online);',
  'if(hasOnlineSource) p.append(document.createTextNode(" | "), online);');
sheet = replace(sheet, 'if (primary?.url) {', "if (/^https?:\\/\\//i.test(primary?.url || '')) {");
write('sources/index.html', sheet);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const archive = JSON.parse(fs.readFileSync(path.join(root, 'sources/originals/manifest.json'), 'utf8'));
const references = archive.documents.map(document => {
  const url = [document.url, document.finalUrl].find(value => /^https?:\/\//i.test(value || ''));
  const title = escape(document.title);
  return `<li>${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title+' — public URL not established; original retained locally.'}</li>`;
});
write('sources/originals/index.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Manufacturer source references</title><link rel="stylesheet" href="../source.css"></head>
<body><main><nav><a href="../../">Simulator</a> <a href="../">Vessel derivation sheets</a></nav>
<h1>Manufacturer source references</h1><p>This public release links to publisher-hosted documents.
Downloaded manufacturer originals and raw webpage backups remain in the local project and are not redistributed here.
The <a href="../">vessel source sheets</a> also provide downloadable simulator-authored PDF summaries, not manufacturer originals.</p>
<ul>${references.join('\n')}</ul></main></body></html>\n`);
// Preserve generation provenance without publishing machine-specific paths or a dead archive link.
let prompts = read('assets/failures/PROMPTS.md');
prompts = prompts.replace(/C:\/Users\/[^\n`]+\/(exec-[\w-]+\.png)/g, '$1');
prompts = prompts.replace('[archive/original-2026-09-21](archive/original-2026-09-21/)', '`archive/original-2026-09-21/` in the local project (not published)');
write('assets/failures/PROMPTS.md', prompts.replace(/[\t ]+$/gm, ''));
write('MODEL-REVIEW.md', read('MODEL-REVIEW.md').replace(/C:\/Users\/[^/]+\/Desktop\/Fermentation simulator\//g, '')
  .replace(/(\.js):(\d+)(?=>)/g, '$1#L$2'));
write('.gitattributes', '* text=auto eol=lf\n*.png binary\n*.pdf binary\n');
write('sources/pdfs/README.md', `# Reviewed vessel PDF derivation sheets

There are 71 simulator-authored derivation/stat sheets, generated from the reviewed parameter records.
They are not manufacturer originals. Publisher links in the PDFs and the interactive source sheets
remain available online. Links marked "Local original" refer to the separate desktop archive and are
not included in this public release; use the adjacent publisher link or the manufacturer reference index.
Regenerate locally with \`python sources/build_audited_pdfs.py\` after reviewing source records.
`);
write('PUBLICATION.md', `# Public release — 21 September 2026

The public app contains the current simulator, shared calculation engine, process controls,
organism/vessel databanks, calculation map, failure rules and documentation, eight redesigned
illustrations, authored vessel PDF derivation sheets, readable UI sources and regression tests.

Local-only exclusions: desktop shortcuts, scratch files, private audit/recovery folders,
superseded illustration backups, downloaded manufacturer originals/raw webpages, and the
benchmark source PDF. Public source pages link to the original publishers instead.

Run locally with \`node local-server.cjs\`. Run all \`sources/test-*.cjs\` tests with Node;
pass \`--public\` to \`test-audit.cjs\` to omit only third-party original-byte checks.
The full audit, including original-byte checks, was run against the local project before publication.
Rebuild shipped UI payloads with \`node sources/build-app.cjs\`.
The simulator-specific GitHub workflow validates the checked-in release without rewriting it.
`);
const manifest = [...new Set([...copied, '.gitattributes', 'sources/originals/index.html', 'PUBLICATION.md'])].sort().map(relative => {
  const bytes = fs.readFileSync(path.join(target, relative));
  return {path:relative, bytes:bytes.length, sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
write('sources/publication-manifest.json', JSON.stringify({version:'2026-09-21', files:manifest},null,2)+'\n');
console.log(`Prepared ${manifest.length} files in ${target}. Local-only archives were not copied.`);
