const { spawn } = require('child_process');

const nodePath = 'C:\\Program Files\\nodejs';
const pnpmPath = 'C:\\Users\\ammiz\\AppData\\Roaming\\npm';
const newPATH = nodePath + ';' + pnpmPath + ';' + process.env.PATH;
const env = { ...process.env, PATH: newPATH };
const cwd = 'C:\\Users\\ammiz\\Downloads\\timtom';
const pnpmBin = 'C:\\Users\\ammiz\\AppData\\Roaming\\npm\\node_modules\\pnpm\\bin\\pnpm.cjs';
const nodeExe = 'C:\\Program Files\\nodejs\\node.exe';

console.log('🚀 Starting dev servers...');

const proc = spawn(nodeExe, [pnpmBin, 'run', 'dev'], {
  cwd,
  env,
  stdio: 'inherit',
  shell: false
});

proc.on('error', (e) => console.error('Error:', e.message));
proc.on('exit', (code) => console.log('Exited with code', code));
