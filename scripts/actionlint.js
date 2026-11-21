const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Official release binary. The npm wrappers unzip it with a vulnerable adm-zip.
const version = '1.7.12';
const root = path.join(__dirname, '..');
const cache = path.join(root, '.cache');
const bin = path.join(cache, 'actionlint');

const arch = process.arch === 'x64' ? 'amd64' : process.arch;
const os = process.platform === 'darwin' ? 'darwin' : 'linux';
const asset = `actionlint_${version}_${os}_${arch}.tar.gz`;

if (!fs.existsSync(bin)) {
  fs.mkdirSync(cache, { recursive: true });
  const url = `https://github.com/rhysd/actionlint/releases/download/v${version}/${asset}`;
  const tar = path.join(cache, asset);
  const download = spawnSync('curl', ['-fsSL', '-o', tar, url], { stdio: 'inherit' });
  if (download.status !== 0) process.exit(download.status || 1);
  const extracted = spawnSync('tar', ['-xzf', tar, '-C', cache, 'actionlint'], {
    stdio: 'inherit'
  });
  if (extracted.status !== 0) process.exit(extracted.status || 1);
  fs.chmodSync(bin, 0o755);
}

const result = spawnSync(bin, [], { cwd: root, stdio: 'inherit' });
process.exit(result.status || 0);
