const { execSync } = require('child_process');
const nodePath = 'C:\\Program Files\\nodejs';
const pnpmPath = 'C:\\Users\\ammiz\\AppData\\Roaming\\npm';
const newPATH = nodePath + ';' + pnpmPath + ';' + process.env.PATH;
const env = { ...process.env, PATH: newPATH };

try {
    console.log('Running typecheck for api-server...');
    const output = execSync('node "C:\\Users\\ammiz\\AppData\\Roaming\\npm\\node_modules\\pnpm\\bin\\pnpm.cjs" --filter @workspace/api-server run typecheck', {
        cwd: 'C:\\Users\\ammiz\\Downloads\\timtom',
        env,
        encoding: 'utf8'
    });
    console.log(output);
} catch (error) {
    console.error('Typecheck failed:');
    console.error(error.stdout);
    console.error(error.stderr);
}
