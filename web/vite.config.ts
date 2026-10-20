import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [vue()],
	build: {
		target: 'es2022',
		// No data: URI for fonts (strict CSP): they stay files under /assets.
		assetsInlineLimit: 0,
	},
	optimizeDeps: {
		// Shipped as TypeScript + .vue sources: transformed by the Vite plugins,
		// not pre-bundled by esbuild (which cannot read .vue files).
		exclude: ['@Voikyrioh/vue-translate'],
		include: [
			'@Voikyrioh/vue-translate > country-flag-icons',
			'@Voikyrioh/vue-translate > country-flag-icons/unicode',
		],
	},
	server: {
		// The API (and its WebSockets) runs on :3000 during development.
		proxy: {
			'/api': { target: 'http://127.0.0.1:3000', ws: true },
		},
	},
	test: {
		environment: 'happy-dom',
		include: ['src/**/__tests__/**/*.test.ts'],
		setupFiles: ['src/__tests__/setup.ts'],
	},
})
