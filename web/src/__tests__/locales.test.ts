import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { LANGUAGES } from '@bingo/shared'
import { describe, expect, it } from 'vitest'
import { catalogProblems } from '../i18n/catalog-check'
import { catalog } from './test-i18n'

const reference = catalog('fr-FR')
// LOCALES=de-DE,nl-NL restricts the check (useful while translating).
const only = process.env.LOCALES?.split(',').filter(Boolean)
const locales = LANGUAGES.map((l) => l.locale).filter((l) => !only || only.includes(l))

describe('translation files', () => {
	it('exist for every language, and only for them', () => {
		const files = readdirSync(resolve(__dirname, '../../public/locales')).sort()
		expect(files).toEqual(LANGUAGES.map((l) => l.locale).sort())
	})

	it.each(locales)('%s matches the French reference', (locale) => {
		expect(catalogProblems(reference, catalog(locale), locale)).toEqual([])
	})
})
