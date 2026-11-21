const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const py = path.join(root, '.cache', 'py');
const bin = path.join(py, 'bin', 'codespell');

if (!fs.existsSync(bin)) {
  fs.mkdirSync(path.dirname(py), { recursive: true });
  const pip = spawnSync(
    'python3',
    [
      '-m',
      'pip',
      'install',
      '--disable-pip-version-check',
      '--target',
      py,
      '-r',
      'requirements-dev.txt'
    ],
    { cwd: root, stdio: 'inherit' }
  );
  if (pip.status !== 0) process.exit(pip.status || 1);
}

const result = spawnSync(
  bin,
  [
    '-L',
    'bu,delt,savingable',
    '--skip',
    './.cache/*,./node_modules/*,./package-lock.json,./src/workouts/archived/*,./src/workouts/archived2/*,./.git/*'
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PYTHONPATH: py }
  }
);
process.exit(result.status || 0);
