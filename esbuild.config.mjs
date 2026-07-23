import * as esbuild from 'esbuild';

const isProd = process.argv.includes('--production');

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outdir: '.',
  sourcemap: !isProd,
  minify: isProd,
}).catch(() => process.exit(1));
