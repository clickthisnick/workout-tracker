const fs = require('fs');
const path = require('path');
const vm = require('vm');

const testsDir = path.join(__dirname, '..', 'tests');
for (const file of fs.readdirSync(testsDir)) {
  if (!file.endsWith('.test.js')) continue;
  const code = fs.readFileSync(path.join(testsDir, file), 'utf8');
  const sandbox = {
    console, URL, URLSearchParams, Date, Math, JSON, Object, Array, String,
    Number, parseInt, parseFloat, isNaN, require, process, Intl, Promise,
    setTimeout, clearTimeout, setInterval, clearInterval, Map, Set, RegExp,
    Error, decodeURIComponent, encodeURIComponent,
    __dirname: testsDir,
    __filename: path.join(testsDir, file)
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  new vm.Script(code, { filename: file }).runInContext(sandbox);
}
console.log('All tests passed.');
