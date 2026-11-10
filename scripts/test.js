const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const testsDir = path.join(__dirname);
for (const file of fs.readdirSync(testsDir)) {
  if (!file.endsWith('.test.js')) continue;
  const code = fs.readFileSync(path.join(testsDir, file), 'utf8');
  const wrapped = code.replace(
    "const root = '/home/mypi/Documents/workout-tracker';",
    `const root = ${JSON.stringify(root)};`
  );
  const sandbox = {
    console, URL, URLSearchParams, Date, Math, JSON, Object, Array, String,
    Number, parseInt, parseFloat, isNaN, require, process
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  new vm.Script(wrapped, { filename: file }).runInContext(sandbox);
}
console.log('All tests passed.');
