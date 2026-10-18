import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [vue()],
	build: {
		target: 'es2022',
		// No data: URI for fonts (strict CSP): they stay files under /assets.
		assetsInlineLimit: 0,
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
	},
})
