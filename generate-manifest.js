// Run: node generate-manifest.js
// Run with watch: node generate-manifest.js --watch
const fs = require('fs');
const path = require('path');

const SOLUTIONS_DIR = path.join(__dirname, 'public', 'solutions');
const MANIFEST_PATH = path.join(SOLUTIONS_DIR, 'manifest.json');
const EXCLUDED = new Set(['script.js']);

function update() {
  const files = fs.readdirSync(SOLUTIONS_DIR)
    .filter(f => f.endsWith('.js') && !EXCLUDED.has(f) && !f.startsWith('.'))
    .sort();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ files }, null, 2));
  console.log(`[${new Date().toLocaleTimeString()}] public/solutions/manifest.json → ${files.length} file(s):`, files.join(', '));
}

update();

if (process.argv.includes('--watch')) {
  console.log('Watching for new .js files...');
  fs.watch(SOLUTIONS_DIR, (_, filename) => {
    if (filename && filename.endsWith('.js') && !EXCLUDED.has(filename)) update();
  });
}
