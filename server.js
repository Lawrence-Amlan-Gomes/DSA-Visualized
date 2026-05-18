const http = require('http');
const fs = require('fs');
const path = require('path');

const WORKSPACE = __dirname;
const PORT = 4040;
const EXCLUDED = new Set(['server.js', 'index.html', 'script.js']);

function getJsFiles() {
  return fs.readdirSync(WORKSPACE)
    .filter(f => f.endsWith('.js') && !EXCLUDED.has(f) && !f.startsWith('.'))
    .sort();
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function validateFileName(name) {
  return name && name.endsWith('.js') && !name.includes('/') && !name.includes('..');
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(WORKSPACE, 'index.html')));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/files') {
    json(res, getJsFiles());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/file') {
    const name = url.searchParams.get('name');
    if (!validateFileName(name)) { res.writeHead(400); res.end('Invalid'); return; }
    try {
      json(res, { content: fs.readFileSync(path.join(WORKSPACE, name), 'utf8') });
    } catch {
      res.writeHead(404); res.end('Not found');
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/file') {
    const name = url.searchParams.get('name');
    if (!validateFileName(name)) { res.writeHead(400); res.end('Invalid'); return; }
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const { content } = JSON.parse(body);
        fs.writeFileSync(path.join(WORKSPACE, name), content, 'utf8');
        json(res, { ok: true });
      } catch (e) {
        res.writeHead(500); res.end(e.message);
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\nDSA Visualized running at http://localhost:${PORT}\n`);
  require('child_process').exec(`open http://localhost:${PORT}`);
});
