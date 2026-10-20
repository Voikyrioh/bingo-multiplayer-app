/**
 * Consistency of a translation file with the French reference: used by the
 * tests (every locale) and by translators. A key ending with a plural category
 * (`.one`, `.few`...) is a plural form: each language must provide the forms
 * its own plural rules use, whatever the French file has.
 */
const PLURAL = /\.(zero|one|two|few|many|other)$/
const PLACEHOLDER = /\{(\w+)\}/g

export type Catalog = Record<string, string>

function placeholders(text: string): Set<string> {
	return new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1] as string))
}

function pluralBases(catalog: Catalog): Map<string, Set<string>> {
	const bases = new Map<string, Set<string>>()
	for (const key of Object.keys(catalog)) {
		const match = key.match(PLURAL)
		if (!match) continue
		const base = key.slice(0, -match[0].length)
		const forms = bases.get(base) ?? new Set()
		forms.add(match[1] as string)
		bases.set(base, forms)
	}
	return bases
}

export function catalogProblems(reference: Catalog, candidate: Catalog, locale: string): string[] {
	const problems: string[] = []
	const rules = new Intl.PluralRules(locale)
	const categories = rules.resolvedOptions().pluralCategories
	// Forms the app can meet: counts are integers (players, lines, characters...).
	// French "many" (1 000 000) or Lithuanian "many" (fractions) are not required.
	const required = [...new Set(Array.from({ length: 1001 }, (_, n) => rules.select(n)))]
	const refBases = pluralBases(reference)
	const candBases = pluralBases(candidate)

	for (const [key, text] of Object.entries(reference)) {
		if (PLURAL.test(key)) continue
		const translated = candidate[key]
		if (translated === undefined) {
			problems.push(`missing key ${key}`)
			continue
		}
		if (!translated.trim()) problems.push(`empty ${key}`)
		const expected = placeholders(text)
		const got = placeholders(translated)
		for (const p of expected) if (!got.has(p)) problems.push(`${key}: missing {${p}}`)
		for (const p of got) if (!expected.has(p)) problems.push(`${key}: unknown {${p}}`)
	}

	for (const [base] of refBases) {
		const forms = candBases.get(base)
		if (!forms) {
			problems.push(`missing plural ${base}.*`)
			continue
		}
		const reference = placeholders(reference_other(base))
		for (const category of required) {
			const text = candidate[`${base}.${category}`]
			if (text === undefined) {
				problems.push(
					`${base}: missing plural form ${category} (${locale} needs ${required.join(', ')})`,
				)
			}
		}
		for (const form of forms) {
			if (!categories.includes(form as Intl.LDMLPluralRule)) {
				problems.push(`${base}.${form}: ${locale} has no "${form}" plural form`)
			}
			// A form may drop {count} ("une ligne"), never add an unknown placeholder.
			for (const p of placeholders(candidate[`${base}.${form}`] ?? '')) {
				if (!reference.has(p)) problems.push(`${base}.${form}: unknown {${p}}`)
			}
		}
	}

	for (const key of Object.keys(candidate)) {
		const match = key.match(PLURAL)
		const known = match ? refBases.has(key.slice(0, -match[0].length)) : key in reference
		if (!known) problems.push(`unknown key ${key}`)
	}

	const title = candidate['home.title']
	if (title !== undefined && !/^[^[\]]*\[[^[\]]+\][^[\]]*$/.test(title)) {
		problems.push('home.title: needs exactly one [highlighted part]')
	}
	return problems

	function reference_other(base: string): string {
		return reference[`${base}.other`] ?? ''
	}
}
