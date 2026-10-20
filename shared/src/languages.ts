/**
 * Languages of the interface and of the dictionaries. `code` (ISO 639-1) tags
 * the content (dictionaries, rooms), `locale` names the translation file of
 * the interface (format expected by @Voikyrioh/vue-translate), `name` is the
 * endonym shown in the pickers.
 */
export const LANGUAGES = [
	{ code: 'fr', locale: 'fr-FR', name: 'Français' },
	{ code: 'en', locale: 'en-GB', name: 'English' },
	{ code: 'de', locale: 'de-DE', name: 'Deutsch' },
	{ code: 'es', locale: 'es-ES', name: 'Español' },
	{ code: 'it', locale: 'it-IT', name: 'Italiano' },
	{ code: 'pt', locale: 'pt-PT', name: 'Português' },
	{ code: 'nl', locale: 'nl-NL', name: 'Nederlands' },
	{ code: 'pl', locale: 'pl-PL', name: 'Polski' },
	{ code: 'sv', locale: 'sv-SE', name: 'Svenska' },
	{ code: 'da', locale: 'da-DK', name: 'Dansk' },
	{ code: 'nb', locale: 'nb-NO', name: 'Norsk bokmål' },
	{ code: 'fi', locale: 'fi-FI', name: 'Suomi' },
	{ code: 'cs', locale: 'cs-CZ', name: 'Čeština' },
	{ code: 'sk', locale: 'sk-SK', name: 'Slovenčina' },
	{ code: 'ro', locale: 'ro-RO', name: 'Română' },
	{ code: 'hu', locale: 'hu-HU', name: 'Magyar' },
	{ code: 'el', locale: 'el-GR', name: 'Ελληνικά' },
	{ code: 'bg', locale: 'bg-BG', name: 'Български' },
	{ code: 'hr', locale: 'hr-HR', name: 'Hrvatski' },
	{ code: 'sl', locale: 'sl-SI', name: 'Slovenščina' },
	{ code: 'et', locale: 'et-EE', name: 'Eesti' },
	{ code: 'lv', locale: 'lv-LV', name: 'Latviešu' },
	{ code: 'lt', locale: 'lt-LT', name: 'Lietuvių' },
	{ code: 'uk', locale: 'uk-UA', name: 'Українська' },
] as const

export type Language = (typeof LANGUAGES)[number]
export type LanguageCode = Language['code']
export type Locale = Language['locale']

export const DEFAULT_LANGUAGE: LanguageCode = 'fr'

const BY_CODE = new Map<string, Language>(LANGUAGES.map((l) => [l.code, l]))
const BY_LOCALE = new Map<string, Language>(LANGUAGES.map((l) => [l.locale, l]))

export function isLanguageCode(value: unknown): value is LanguageCode {
	return typeof value === 'string' && BY_CODE.has(value)
}

export function languageByCode(code: string): Language | undefined {
	return BY_CODE.get(code)
}

export function languageByLocale(locale: string): Language | undefined {
	return BY_LOCALE.get(locale)
}

/**
 * Best supported language for a list of browser preferences (navigator.languages):
 * exact locale first (pt-BR → none, pt → pt-PT), then the language part.
 * Norwegian "no"/"nn" fall back to bokmål.
 */
export function matchLanguage(preferences: readonly string[]): Language | undefined {
	for (const raw of preferences) {
		const exact = BY_LOCALE.get(raw)
		if (exact) return exact
		let code = raw.toLowerCase().split(/[-_]/)[0] ?? ''
		if (code === 'no' || code === 'nn') code = 'nb'
		const byCode = BY_CODE.get(code)
		if (byCode) return byCode
	}
	return undefined
}
