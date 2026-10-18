/** Collapses whitespace and strips control characters from user text. */
export function cleanText(raw: string): string {
	return raw
		.replace(/\p{Cc}/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

/** Key used to compare names and entries without case or accents. */
export function comparisonKey(text: string): string {
	return cleanText(text)
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
}
