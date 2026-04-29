const { execSync } = require('child_process');
const nodePath = 'C:\\Program Files\\nodejs';
const pnpmPath = 'C:\\Users\\ammiz\\AppData\\Roaming\\npm';
const newPATH = nodePath + ';' + pnpmPath + ';' + process.env.PATH;
const env = { ...process.env, PATH: newPATH };

try {
    console.log('Running typecheck for admin-dashboard...');
    const output = execSync('node "C:\\Users\\ammiz\\AppData\\Roaming\\npm\\node_modules\\pnpm\\bin\\pnpm.cjs" --filter @workspace/admin-dashboard run typecheck', {
        cwd: 'C:\\Users\\ammiz\\Downloads\\timtom',
        env,
        encoding: 'utf8'
    });
    console.log(output);
} catch (error) {
    console.error('Typecheck failed:');
    const lines = error.stdout.split('\n');
    const realErrors = lines.filter(l => l.includes('error TS') && !l.includes('TS6305'));
    if (realErrors.length > 0) {
        console.error('Real Errors found:');
        console.error(realErrors.join('\n'));
    } else {
        console.error('Only reference errors (TS6305) or other issues found. Full output:');
        console.error(error.stdout);
    }
}
