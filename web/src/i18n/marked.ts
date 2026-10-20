/**
 * Splits a translation that highlights one part between brackets:
 * "Le bingo [en direct], à plusieurs." → before / mark / after. Translators
 * move the brackets where their grammar wants the highlight.
 */
export function splitMarked(text: string): { before: string; mark: string; after: string } {
	const match = text.match(/^(.*?)\[(.+?)\](.*)$/s)
	if (!match) return { before: text, mark: '', after: '' }
	return { before: match[1] ?? '', mark: match[2] ?? '', after: match[3] ?? '' }
}
