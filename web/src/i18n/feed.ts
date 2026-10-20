import type { MessageView, TextParams } from '@bingo/shared'

type Translate = (key: string, params?: TextParams) => string
type TranslateCount = (key: string, count: number, params?: TextParams) => string

/**
 * Text of a feed message in the reader's language. Chat messages are shown as
 * typed; system and announce messages carry a key (`feed.` namespace). Old
 * messages from before the translation keep their French text.
 */
export function feedText(message: MessageView, t: Translate, tc: TranslateCount): string {
	if (!message.key) return message.text
	const params = message.params ?? {}
	switch (message.key) {
		case 'announce.line':
		case 'announce.diagonal': {
			const lines = Number(params.lineCount) || 1
			return lines > 1
				? tc(`feed.${message.key}.total`, lines, params)
				: t(`feed.${message.key}.single`, params)
		}
		case 'announce.full':
			return Number(params.rank) > 1
				? t('feed.announce.full.nth', params)
				: t('feed.announce.full.first', params)
		default:
			return t(`feed.${message.key}`, params)
	}
}
