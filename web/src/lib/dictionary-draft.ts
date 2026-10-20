import { type LanguageCode, LIMITS, type TextParams } from '@bingo/shared'

/** What the dictionary editor holds: entries as one text, one per line. */
export interface DictionaryDraft {
	/** Language the expressions are written in (never translated). */
	language: LanguageCode
	title: string
	description: string
	entriesText: string
	freeSpace: string
	isPublic: boolean
}

export function emptyDraft(language: LanguageCode): DictionaryDraft {
	return { language, title: '', description: '', entriesText: '', freeSpace: '', isPublic: false }
}

/** A problem to translate: `draft.<key>`, plural form chosen with `count` when given. */
export interface DraftProblem {
	key: string
	params: TextParams
	count?: number
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
export function draftProblem(draft: DictionaryDraft, needed: number): DraftProblem | null {
	const title = draft.title.trim()
	if (title.length < LIMITS.dictionaryTitleMin) return { key: 'titleMissing', params: {} }
	const entries = parseEntries(draft.entriesText)
	const tooLong = entries.find((e) => e.length > LIMITS.entryMax)
	if (tooLong) {
		return {
			key: 'entryTooLong',
			params: { entry: `${tooLong.slice(0, 24)}…`, max: LIMITS.entryMax },
		}
	}
	const min = Math.max(needed, LIMITS.dictionaryEntriesMin)
	if (entries.length < min) {
		return { key: 'missingEntries', params: {}, count: min - entries.length }
	}
	if (entries.length > LIMITS.dictionaryEntriesMax) {
		return { key: 'tooManyEntries', params: { max: LIMITS.dictionaryEntriesMax } }
	}
	return null
}
