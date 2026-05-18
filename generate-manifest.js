// Run: node generate-manifest.js
// Run with watch: node generate-manifest.js --watch
const fs = require('fs');

const EXCLUDED = new Set([
  'server.js', 'index.html', 'script.js',
  'generate-manifest.js', 'manifest.json',
]);

function update() {
  const files = fs.readdirSync('.')
    .filter(f => f.endsWith('.js') && !EXCLUDED.has(f) && !f.startsWith('.'))
    .sort();
  fs.writeFileSync('manifest.json', JSON.stringify({ files }, null, 2));
  console.log(`[${new Date().toLocaleTimeString()}] manifest.json → ${files.length} file(s):`, files.join(', '));
}

update();

if (process.argv.includes('--watch')) {
  console.log('Watching for new .js files...');
  fs.watch('.', (_, filename) => {
    if (filename && filename.endsWith('.js') && !EXCLUDED.has(filename)) update();
  });
}
