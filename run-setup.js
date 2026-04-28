const { execSync } = require('child_process');

// Make node AND pnpm available in PATH for child processes
const nodePath = 'C:\\Program Files\\nodejs';
const pnpmPath = 'C:\\Users\\ammiz\\AppData\\Roaming\\npm';
const newPATH = nodePath + ';' + pnpmPath + ';' + process.env.PATH;

const env = { ...process.env, PATH: newPATH };

const pnpmBin = '"C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\ammiz\\AppData\\Roaming\\npm\\node_modules\\pnpm\\bin\\pnpm.cjs"';
const cwd = 'C:\\Users\\ammiz\\Downloads\\timtom';

try {
  console.log('Running db:setup...');
  execSync(pnpmBin + ' run db:setup', { cwd, env, stdio: 'inherit' });
  console.log('✅ ALL DONE! Database is set up.');
} catch(e) {
  console.error('Error:', e.message);
}
