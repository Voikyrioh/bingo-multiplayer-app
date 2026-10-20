import { useTranslate } from '@Voikyrioh/vue-translate'
import {
	DEFAULT_LANGUAGE,
	type Language,
	type Locale,
	languageByCode,
	languageByLocale,
	type TextParams,
} from '@bingo/shared'
import { computed } from 'vue'
import { ApiRequestError } from '../api/http'
import { FALLBACK_LOCALE, saveLocale } from './setup'

const pluralRules = new Map<string, Intl.PluralRules>()
const displayNames = new Map<string, Intl.DisplayNames>()

function pluralCategory(locale: string, count: number): Intl.LDMLPluralRule {
	let rules = pluralRules.get(locale)
	if (!rules) {
		rules = new Intl.PluralRules(locale)
		pluralRules.set(locale, rules)
	}
	return rules.select(count)
}

/**
 * Translation helpers on top of vue-translate's `t`:
 * - `tc(key, count)` picks `key.one`, `key.few`, `key.many`... with the plural
 *   rules of the active language (Polish, Czech, Lithuanian... need more than
 *   two forms), falling back to `key.other`;
 * - `errorText(error)` translates an API or WebSocket error (`error.<key>`);
 * - `locale` / `language` follow the active language, `setLocale` switches it.
 */
export function useI18n() {
	const { t, i18n } = useTranslate()

	const locale = computed<Locale>(
		() => languageByLocale(i18n.languageRef.value ?? '')?.locale ?? FALLBACK_LOCALE,
	)
	const language = computed<Language>(
		() => languageByLocale(locale.value) ?? (languageByCode(DEFAULT_LANGUAGE) as Language),
	)
	/** The file of the active language is loaded (texts are no longer raw keys). */
	const ready = computed(() => i18n.currentFile.value !== undefined)

	function tc(key: string, count: number, params: TextParams = {}): string {
		const values = { count, ...params }
		const exact = `${key}.${pluralCategory(locale.value, count)}`
		const text = t(exact, values)
		return text === exact ? t(`${key}.other`, values) : text
	}

	function errorText(error: unknown): string {
		if (error instanceof ApiRequestError) return t(`error.${error.key}`, error.params)
		return t('error.internal')
	}

	/** Name of a language in the interface language, for sentences ("allemand", "German"...). */
	function languageName(code: string): string {
		let names = displayNames.get(locale.value)
		if (!names) {
			names = new Intl.DisplayNames(locale.value, { type: 'language' })
			displayNames.set(locale.value, names)
		}
		return names.of(code) ?? code
	}

	function setLocale(next: Locale): void {
		if (next === locale.value) return
		i18n.activeLanguage = next
		saveLocale(next)
	}

	return { t, tc, errorText, languageName, locale, language, ready, setLocale }
}
