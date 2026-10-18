import { LIMITS } from '@bingo/shared'
import { validation } from './errors'
import { cleanText, comparisonKey } from './text'

export interface Dictionary {
	id: string
	/** Public share code, used in links (/d/<code>). */
	code: string
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
	title: string
	description?: string | null
	entries: string[]
	freeSpace?: string | null
	isPublic: boolean
}

export type ValidDictionaryDraft = Required<Omit<DictionaryDraft, 'description' | 'freeSpace'>> & {
	description: string
	freeSpace: string | null
}

/**
 * Cleans a user dictionary: trims entries, drops empty ones and duplicates
 * (case and accent insensitive), then checks every limit.
 */
export function validateDictionary(draft: DictionaryDraft): ValidDictionaryDraft {
	const title = cleanText(draft.title)
	if (title.length < LIMITS.dictionaryTitleMin || title.length > LIMITS.dictionaryTitleMax) {
		throw validation(
			`Le titre doit faire entre ${LIMITS.dictionaryTitleMin} et ${LIMITS.dictionaryTitleMax} caractères.`,
		)
	}
	const description = cleanText(draft.description ?? '')
	if (description.length > LIMITS.dictionaryDescriptionMax) {
		throw validation(
			`La description ne doit pas dépasser ${LIMITS.dictionaryDescriptionMax} caractères.`,
		)
	}
	const seen = new Set<string>()
	const entries: string[] = []
	for (const raw of draft.entries) {
		const entry = cleanText(raw)
		if (!entry) continue
		if (entry.length > LIMITS.entryMax) {
			throw validation(`« ${entry.slice(0, 20)}… » dépasse ${LIMITS.entryMax} caractères.`)
		}
		const key = comparisonKey(entry)
		if (seen.has(key)) continue
		seen.add(key)
		entries.push(entry)
	}
	if (entries.length < LIMITS.dictionaryEntriesMin) {
		throw validation(
			`Il faut au moins ${LIMITS.dictionaryEntriesMin} expressions différentes (${entries.length} pour l'instant).`,
		)
	}
	if (entries.length > LIMITS.dictionaryEntriesMax) {
		throw validation(`Un dictionnaire contient au plus ${LIMITS.dictionaryEntriesMax} expressions.`)
	}
	const freeSpace = cleanText(draft.freeSpace ?? '') || null
	if (freeSpace && freeSpace.length > LIMITS.freeSpaceMax) {
		throw validation(`La case gratuite ne doit pas dépasser ${LIMITS.freeSpaceMax} caractères.`)
	}
	return { title, description, entries, freeSpace, isPublic: draft.isPublic }
}
