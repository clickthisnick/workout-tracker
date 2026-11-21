const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const refs = new Set();
const pattern = /\b(?:src|href)=["']([^"']+)["']/g;
let match = pattern.exec(html);
while (match) {
  refs.add(match[1]);
  match = pattern.exec(html);
}

const failures = [];
for (const ref of refs) {
  if (ref.startsWith('data:') || ref.startsWith('mailto:') || ref.startsWith('#')) continue;
  if (/^https?:\/\//.test(ref)) {
    console.log(`external link left unchecked: ${ref}`);
    continue;
  }
  const file = path.normalize(path.join(root, ref.split('?')[0].split('#')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file)) {
    failures.push(`${ref} does not exist`);
  }
}

if (!html.includes('src="src/app.js"')) {
  failures.push('index.html must load src/app.js');
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log(`OK: ${refs.size} HTML references resolve.`);
