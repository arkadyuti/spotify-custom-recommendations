import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Ensure dist directory exists
mkdirSync('dist', { recursive: true });

// Build React app
await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: 'dist/main.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  jsxImportSource: 'react',
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  loader: {
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.svg': 'file',
  },
  external: [],
});

// Copy and process HTML file
const html = readFileSync('index.html', 'utf-8');
const processedHtml = html.replace('/src/main.tsx', '/main.js');
writeFileSync('dist/index.html', processedHtml);

// Build CSS with Tailwind
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

try {
  await execAsync('npx tailwindcss -i ./src/index.css -o ./dist/index.css --minify');
  console.log('✅ Frontend build complete');
} catch (error) {
  console.error('❌ CSS build failed:', error);
}