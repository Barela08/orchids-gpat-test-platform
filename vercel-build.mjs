import { execSync } from 'child_process';
import { mkdirSync, cpSync, writeFileSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '.vercel', 'output');

rmSync(outputDir, { recursive: true, force: true });

console.log('Building frontend...');
execSync('pnpm --filter @workspace/gpat-portal run build:vercel', {
  stdio: 'inherit',
  cwd: __dirname,
});

console.log('Copying static files...');
const staticDir = join(outputDir, 'static');
mkdirSync(staticDir, { recursive: true });
cpSync(join(__dirname, 'artifacts', 'gpat-portal', 'dist'), staticDir, { recursive: true });

console.log('Bundling API function...');
const funcDir = join(outputDir, 'functions', 'api', 'index.func');
mkdirSync(funcDir, { recursive: true });

await build({
  entryPoints: [join(__dirname, 'api', 'index.ts')],
  platform: 'node',
  bundle: true,
  format: 'cjs',
  outfile: join(funcDir, 'index.js'),
  nodePaths: [
    join(__dirname, 'artifacts', 'api-server', 'node_modules'),
    join(__dirname, 'node_modules'),
  ],
  external: [
    '*.node', 'sharp', 'canvas', 'fsevents',
    'bufferutil', 'utf-8-validate',
  ],
  sourcemap: true,
});

writeFileSync(join(funcDir, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs20.x',
  handler: 'index.js',
  launcherType: 'Nodejs',
  maxDuration: 30,
}, null, 2));

console.log('Writing Vercel output config...');
writeFileSync(join(outputDir, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    { src: '/api/(.*)', dest: '/api/index' },
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html' },
  ],
}, null, 2));

console.log('Vercel build complete!');
