import VueTranslate from '@Voikyrioh/vue-translate'
import {
	DEFAULT_LANGUAGE,
	LANGUAGES,
	type Locale,
	languageByCode,
	languageByLocale,
	matchLanguage,
} from '@bingo/shared'
import type { App } from 'vue'
import { readJson, writeJson } from '../lib/storage'

const STORAGE_KEY = 'bingo:locale'

/** Translation files: web/public/locales/<locale>, fetched by vue-translate as `${url}/${locale}`. */
export const LOCALES_URL = '/locales'

export const FALLBACK_LOCALE: Locale = languageByCode(DEFAULT_LANGUAGE)?.locale ?? 'fr-FR'

/** Saved choice first, then the browser languages, then French. */
export function initialLocale(
	saved: unknown = readJson<string | null>(STORAGE_KEY, null),
	preferences: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): Locale {
	if (typeof saved === 'string') {
		const known = languageByLocale(saved)
		if (known) return known.locale
	}
	return matchLanguage(preferences)?.locale ?? FALLBACK_LOCALE
}

export function saveLocale(locale: Locale): void {
	writeJson(STORAGE_KEY, locale)
}

export function installI18n(app: App, locale: Locale = initialLocale()): void {
	app.use(VueTranslate, {
		availableLanguage: LANGUAGES.map((l) => l.locale),
		translationFilesUrl: LOCALES_URL,
		defaultLang: locale,
	})
}
