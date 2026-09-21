/* Regenerate the eight shipped app payloads from the readable UI source. */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tmp/app-source.js'), 'utf8');
if (!source.includes('window.FermentationModel')) throw new Error('UI source must use the shared model.');
const payload = zlib.gzipSync(source, { level: 9 }).toString('base64');
const length = Math.ceil(payload.length / 8);
for (let i = 0; i < 8; i++) {
  fs.writeFileSync(path.join(root, `app.payload.${String(i).padStart(2, '0')}`), payload.slice(i * length, (i + 1) * length) + '\n');
}
console.log('Built eight app payloads; simulation-core.js remains a separate shared engine.');
const vesselSource = fs.readFileSync(path.join(root, 'tmp/vessel-catalog-source.js'), 'utf8');
fs.writeFileSync(path.join(root, 'vessel-catalog.payload'), zlib.gzipSync(vesselSource, {level:9}).toString('base64') + '\n');
