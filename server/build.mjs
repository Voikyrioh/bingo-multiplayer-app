import * as esbuild from 'esbuild'

await esbuild.build({
	entryPoints: ['src/index.ts'],
	bundle: true,
	platform: 'node',
	target: 'node22',
	format: 'esm',
	outfile: 'dist/index.js',
	// npm dependencies stay external (reinstalled with --omit=dev in the image);
	// the workspace package @bingo/shared (TypeScript sources) is bundled.
	external: ['@hono/node-server', '@hono/node-ws', 'hono', 'pg', 'zod'],
	sourcemap: true,
})

console.log('Build complete -> dist/index.js')
