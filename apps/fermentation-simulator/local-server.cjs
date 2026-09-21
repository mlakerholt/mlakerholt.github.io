// Dependency-free local development server. Changes appear after a browser refresh.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.payload': 'text/plain; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); res.end(); return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/__fermentation_health') {
      res.setHeader('Content-Type', 'text/plain');
      res.end('fermentation-simulator:' + root); return;
    }
    let filename = path.resolve(root, '.' + pathname);
    const relative = path.relative(root, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if ((await fs.stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    const data = await fs.readFile(filename);
    const extraTypes = { '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
    res.setHeader('Content-Type', types[path.extname(filename)] || extraTypes[path.extname(filename)] || 'application/octet-stream');
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 400);
    res.end('File unavailable');
  }
});
server.on('error', (error) => { console.error(error.message); process.exit(1); });
server.listen(8765, '127.0.0.1', () => console.log('Fermentation Simulator: http://127.0.0.1:8765'));
