import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
mkdirSync('dist', { recursive: true });

// Build configuration
const buildConfig = {
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
};

// Function to copy and process HTML file
function processHtml() {
  const html = readFileSync('index.html', 'utf-8');
  const processedHtml = html.replace('/src/main.tsx', '/main.js');
  writeFileSync('dist/index.html', processedHtml);
}

// Function to build CSS
async function buildCss() {
  try {
    await execAsync('npx tailwindcss -i ./src/index.css -o ./dist/index.css --minify');
    console.log('✅ CSS built');
  } catch (error) {
    console.error('❌ CSS build failed:', error);
  }
}

if (isWatch) {
  // Watch mode
  console.log('🔄 Starting frontend watcher...');
  
  const ctx = await context({
    ...buildConfig,
    plugins: [
      {
        name: 'rebuild-notify',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) {
              console.log('✅ Frontend rebuilt');
              processHtml();
              buildCss();
            } else {
              console.error('❌ Frontend build failed:', result.errors);
            }
          });
        },
      },
    ],
  });

  // Initial build
  processHtml();
  await buildCss();
  
  // Start watching
  await ctx.watch();
  console.log('👀 Watching for frontend changes...');
  
  // Keep the process alive
  process.on('SIGINT', async () => {
    console.log('🛑 Stopping frontend watcher...');
    await ctx.dispose();
    process.exit(0);
  });
  
} else {
  // Single build
  await build(buildConfig);
  processHtml();
  await buildCss();
  console.log('✅ Frontend build complete');
}