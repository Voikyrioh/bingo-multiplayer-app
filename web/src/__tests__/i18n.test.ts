import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { ApiRequestError } from '../api/http'
import { feedText } from '../i18n/feed'
import { splitMarked } from '../i18n/marked'
import { initialLocale } from '../i18n/setup'
import { useI18n } from '../i18n/useI18n'
import { testI18n } from './test-i18n'

/** Runs `use` inside a component with the given catalogs, returns its result. */
function withI18n<T>(
	use: () => T,
	locale = 'fr-FR',
	inline?: Record<string, Record<string, string>>,
) {
	let result: T | undefined
	mount(
		defineComponent({
			setup() {
				result = use()
				return () => h('div')
			},
		}),
		{ global: { plugins: [testI18n(locale, inline)] } },
	)
	return result as T
}

describe('initialLocale', () => {
	it('prefers the saved choice, then the browser languages, then French', () => {
		expect(initialLocale('de-DE', ['en-US'])).toBe('de-DE')
		expect(initialLocale('xx-XX', ['es-MX', 'en-US'])).toBe('es-ES')
		expect(initialLocale(null, ['pt-BR'])).toBe('pt-PT')
		expect(initialLocale(null, ['nn-NO'])).toBe('nb-NO')
		expect(initialLocale(null, ['ja-JP', 'zh'])).toBe('fr-FR')
		expect(initialLocale(null, [])).toBe('fr-FR')
	})
})

describe('useI18n', () => {
	const polish = {
		'dict.entries.one': '{count} wyrażenie',
		'dict.entries.few': '{count} wyrażenia',
		'dict.entries.many': '{count} wyrażeń',
	}

	it('picks the plural form of the language (Polish has one / few / many)', () => {
		const { tc } = withI18n(() => useI18n(), 'pl-PL', { 'pl-PL': polish })
		expect(tc('dict.entries', 1)).toBe('1 wyrażenie')
		expect(tc('dict.entries', 3)).toBe('3 wyrażenia')
		expect(tc('dict.entries', 5)).toBe('5 wyrażeń')
		expect(tc('dict.entries', 22)).toBe('22 wyrażenia')
	})

	it('falls back to the "other" form', () => {
		const { tc } = withI18n(() => useI18n())
		expect(tc('dict.entries', 0)).toBe('0 expression')
		expect(tc('dict.entries', 24)).toBe('24 expressions')
	})

	it('translates API errors with their params, anything else as an internal error', () => {
		const { errorText } = withI18n(() => useI18n())
		expect(errorText(new ApiRequestError(400, 'validation', 'chatTooLong', { max: 300 }))).toBe(
			'Un message fait au plus 300 caractères.',
		)
		expect(errorText(new Error('boom'))).toBe(
			'Oups, une erreur inattendue. Réessayez dans un instant.',
		)
	})

	it('names languages in the interface language', () => {
		const { languageName } = withI18n(() => useI18n())
		expect(languageName('de')).toBe('allemand')
	})
})

describe('feedText', () => {
	const { t, tc } = withI18n(() => useI18n())
	const message = (key: string | undefined, params = {}, text = '') => ({
		id: '1',
		kind: 'system' as const,
		authorId: null,
		authorName: null,
		text,
		createdAt: '2026-10-20T20:00:00.000Z',
		...(key ? { key, params } : {}),
	})

	it('translates system messages and announcements in the reader language', () => {
		expect(feedText(message('playerJoined', { name: 'Bob' }), t, tc)).toBe(
			'👋 Bob rejoint la partie.',
		)
		expect(feedText(message('announce.line', { name: 'Bob', lineCount: 1 }), t, tc)).toBe(
			'🎯 Bob a complété une ligne !',
		)
		expect(feedText(message('announce.diagonal', { name: 'Bob', lineCount: 3 }), t, tc)).toBe(
			'↘️ Bob a complété une diagonale ! (3 lignes au total)',
		)
		expect(feedText(message('announce.full', { name: 'Bob', lineCount: 12, rank: 2 }), t, tc)).toBe(
			'🏆 Bob a rempli toute sa grille : carton plein n° 2.',
		)
	})

	it('shows old messages (before translation) and chat as written', () => {
		expect(feedText(message(undefined, {}, 'Ancien texte'), t, tc)).toBe('Ancien texte')
	})
})

describe('splitMarked', () => {
	it('splits the highlighted part of a sentence', () => {
		expect(splitMarked('Le bingo [en direct], à plusieurs.')).toEqual({
			before: 'Le bingo ',
			mark: 'en direct',
			after: ', à plusieurs.',
		})
		expect(splitMarked('[Live] bingo')).toEqual({ before: '', mark: 'Live', after: ' bingo' })
		expect(splitMarked('No mark')).toEqual({ before: 'No mark', mark: '', after: '' })
	})
})
