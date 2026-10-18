import { LIMITS } from '@bingo/shared'

/** What the dictionary editor holds: entries as one text, one per line. */
export interface DictionaryDraft {
	title: string
	description: string
	entriesText: string
	freeSpace: string
	isPublic: boolean
}

export function emptyDraft(): DictionaryDraft {
	return { title: '', description: '', entriesText: '', freeSpace: '', isPublic: false }
}

const key = (s: string) =>
	s
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()

/** Same cleaning as the server: trimmed, no empty line, no duplicate. */
export function parseEntries(text: string): string[] {
	const seen = new Set<string>()
	const entries: string[] = []
	for (const line of text.split('\n')) {
		const entry = line.replace(/\s+/g, ' ').trim()
		if (!entry || seen.has(key(entry))) continue
		seen.add(key(entry))
		entries.push(entry)
	}
	return entries
}

/** First problem of the draft, or null when the server should accept it. */
export function draftProblem(draft: DictionaryDraft, needed: number): string | null {
	const title = draft.title.trim()
	if (title.length < LIMITS.dictionaryTitleMin) return 'Donnez un titre à votre dictionnaire.'
	const entries = parseEntries(draft.entriesText)
	const tooLong = entries.find((e) => e.length > LIMITS.entryMax)
	if (tooLong) return `« ${tooLong.slice(0, 24)}… » dépasse ${LIMITS.entryMax} caractères.`
	const min = Math.max(needed, LIMITS.dictionaryEntriesMin)
	if (entries.length < min)
		return `Encore ${min - entries.length} expression(s) pour remplir la grille.`
	if (entries.length > LIMITS.dictionaryEntriesMax) {
		return `${LIMITS.dictionaryEntriesMax} expressions au maximum.`
	}
	return null
}
