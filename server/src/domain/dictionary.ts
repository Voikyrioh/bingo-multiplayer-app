import { isLanguageCode, type LanguageCode, LIMITS } from '@bingo/shared'
import { validation } from './errors'
import { cleanText, comparisonKey } from './text'

export interface Dictionary {
	id: string
	/** Public share code, used in links (/d/<code>). */
	code: string
	/** Language the expressions are written in. Dictionaries are never translated. */
	language: LanguageCode
	title: string
	description: string
	entries: string[]
	/** Label of the free center cell, null = no default label. */
	freeSpace: string | null
	/** Listed in the community dictionaries. */
	isPublic: boolean
	/** Curated dictionary shipped with the app. */
	featured: boolean
	createdAt: Date
}

export interface DictionaryDraft {
	language: string
	title: string
	description?: string | null
	entries: string[]
	freeSpace?: string | null
	isPublic: boolean
}

export type ValidDictionaryDraft = Required<
	Omit<DictionaryDraft, 'description' | 'freeSpace' | 'language'>
> & {
	language: LanguageCode
	description: string
	freeSpace: string | null
}

/**
 * Cleans a user dictionary: trims entries, drops empty ones and duplicates
 * (case and accent insensitive), then checks every limit.
 */
export function validateDictionary(draft: DictionaryDraft): ValidDictionaryDraft {
	if (!isLanguageCode(draft.language)) throw validation('dictionaryLanguageInvalid')
	const title = cleanText(draft.title)
	if (title.length < LIMITS.dictionaryTitleMin || title.length > LIMITS.dictionaryTitleMax) {
		throw validation('dictionaryTitleLength', {
			min: LIMITS.dictionaryTitleMin,
			max: LIMITS.dictionaryTitleMax,
		})
	}
	const description = cleanText(draft.description ?? '')
	if (description.length > LIMITS.dictionaryDescriptionMax) {
		throw validation('dictionaryDescriptionTooLong', { max: LIMITS.dictionaryDescriptionMax })
	}
	const seen = new Set<string>()
	const entries: string[] = []
	for (const raw of draft.entries) {
		const entry = cleanText(raw)
		if (!entry) continue
		if (entry.length > LIMITS.entryMax) {
			throw validation('entryTooLong', { entry: `${entry.slice(0, 20)}…`, max: LIMITS.entryMax })
		}
		const key = comparisonKey(entry)
		if (seen.has(key)) continue
		seen.add(key)
		entries.push(entry)
	}
	if (entries.length < LIMITS.dictionaryEntriesMin) {
		throw validation('dictionaryTooFewEntries', {
			min: LIMITS.dictionaryEntriesMin,
			count: entries.length,
		})
	}
	if (entries.length > LIMITS.dictionaryEntriesMax) {
		throw validation('dictionaryTooManyEntries', { max: LIMITS.dictionaryEntriesMax })
	}
	const freeSpace = cleanText(draft.freeSpace ?? '') || null
	if (freeSpace && freeSpace.length > LIMITS.freeSpaceMax) {
		throw validation('freeSpaceTooLong', { max: LIMITS.freeSpaceMax })
	}
	return {
		language: draft.language,
		title,
		description,
		entries,
		freeSpace,
		isPublic: draft.isPublic,
	}
}
