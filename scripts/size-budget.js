const fs = require('fs');
const path = require('path');

// Files the browser downloads to open the logger. Routine JSON is user data
// and is not part of this cap.
const files = ['index.html', 'src/app.js'];
const root = path.join(__dirname, '..');
let total = 0;
for (const file of files) {
  const bytes = fs.statSync(path.join(root, file)).size;
  total += bytes;
  console.log(`${file} ${bytes}`);
}

// 127624 bytes today, plus 1KB for a comment or a small fix.
const BUDGET = 128648;
console.log(`shipped ${total} / budget ${BUDGET}`);
if (total > BUDGET) {
  console.error(`Shipped files grew past ${BUDGET} bytes.`);
  process.exit(1);
}
