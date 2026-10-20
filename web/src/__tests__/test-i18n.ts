import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vue'
import { ref } from 'vue'

/** Translation file as served to the browser (web/public/locales/<locale>). */
export function catalog(locale = 'fr-FR'): Record<string, string> {
	return JSON.parse(readFileSync(resolve(__dirname, '../../public/locales', locale), 'utf8'))
}

/**
 * Stand-in for the I18nService of @Voikyrioh/vue-translate (same members as the
 * ones used by useTranslate and useI18n), fed with a real catalog and no fetch.
 */
export function testI18n(
	locale = 'fr-FR',
	inline: Record<string, Record<string, string>> = {},
): Plugin {
	return {
		install(app) {
			const files = new Map<string, Record<string, string>>(Object.entries(inline))
			const load = (l: string) => {
				if (!files.has(l)) files.set(l, catalog(l))
				return files.get(l) as Record<string, string>
			}
			const languageRef = ref(locale)
			const currentFile = ref<object | undefined>({})
			const service = {
				languageRef,
				currentFile,
				get activeLanguage() {
					return languageRef.value
				},
				set activeLanguage(value: string) {
					languageRef.value = value
					currentFile.value = {}
				},
				resolve(key: string, params?: Record<string, string | number>) {
					void currentFile.value
					const raw = load(languageRef.value)[key] ?? key
					return params
						? raw.replace(/\{(\w+)\}/g, (match, name: string) =>
								name in params ? String(params[name]) : match,
							)
						: raw
				},
			}
			app.provide('i18n', service)
		},
	}
}
