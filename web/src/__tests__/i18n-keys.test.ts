import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalog } from './test-i18n'

const reference = catalog('fr-FR')
const SRC = resolve(__dirname, '..')

function sources(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name)
		if (name === '__tests__') return []
		if (statSync(path).isDirectory()) return sources(path)
		return /\.(vue|ts)$/.test(name) ? [path] : []
	})
}

/** Literal keys passed to t('...') and tc('...') in the sources. */
function usedKeys(): { plain: Set<string>; counted: Set<string> } {
	const plain = new Set<string>()
	const counted = new Set<string>()
	for (const file of sources(SRC)) {
		const code = readFileSync(file, 'utf8')
		for (const m of code.matchAll(/\bt\(\s*'([\w.]+)'/g)) plain.add(m[1] as string)
		for (const m of code.matchAll(/\btc\(\s*'([\w.]+)'/g)) counted.add(m[1] as string)
	}
	return { plain, counted }
}

describe('translation keys used by the code', () => {
	const { plain, counted } = usedKeys()

	it('finds the keys in the sources', () => {
		expect(plain.size).toBeGreaterThan(100)
		expect(counted.size).toBeGreaterThan(5)
	})

	it('exist in the French reference', () => {
		expect([...plain].filter((key) => !(key in reference))).toEqual([])
		expect([...counted].filter((key) => !(`${key}.other` in reference))).toEqual([])
	})

	it('cover every error and feed key the server sends', () => {
		const server = sources(resolve(__dirname, '../../../server/src'))
			.map((file) => readFileSync(file, 'utf8'))
			.join('\n')
		const errors = new Set<string>()
		const patterns = [
			/\b(?:validation|notFound|forbidden)\(\s*'(\w+)'/g,
			/new DomainError\(\s*'[\w-]+',\s*'(\w+)'/g,
			/errorBody\(\s*'[\w-]+',\s*'(\w+)'/g,
			/type: 'error', code: '[\w-]+', key: '(\w+)'/g,
		]
		for (const pattern of patterns)
			for (const m of server.matchAll(pattern)) errors.add(m[1] as string)
		const feed = new Set(
			[...server.matchAll(/systemMessage\(room\.id,\s*'(\w+)'/g)].map((m) => m[1] as string),
		)
		for (const m of server.matchAll(/'(playerJoined|spectatorJoined)'/g)) feed.add(m[1] as string)

		expect(errors.size).toBeGreaterThan(30)
		expect(feed.size).toBeGreaterThan(5)
		expect([...errors].filter((key) => !(`error.${key}` in reference))).toEqual([])
		expect([...feed].filter((key) => !(`feed.${key}` in reference))).toEqual([])
		for (const kind of ['line', 'diagonal']) {
			expect(reference[`feed.announce.${kind}.single`]).toBeDefined()
			expect(reference[`feed.announce.${kind}.total.other`]).toBeDefined()
		}
		expect(reference['feed.announce.full.first']).toBeDefined()
		expect(reference['feed.announce.full.nth']).toBeDefined()
	})

	it('cover the keys built at runtime (server errors and feed, banners, home page)', () => {
		const families = ['error.', 'feed.', 'banner.', 'home.demo.', 'home.step']
		for (const family of families) {
			expect(Object.keys(reference).some((key) => key.startsWith(family))).toBe(true)
		}
	})
})
