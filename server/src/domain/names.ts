import { LIMITS } from '@bingo/shared'
import { validation } from './errors'
import { cleanText, comparisonKey } from './text'

/** Returns a cleaned player name, or null when the player wants a funny one. */
export function cleanName(raw: string | null | undefined): string | null {
	const name = cleanText(raw ?? '')
	if (!name) return null
	if (name.length > LIMITS.nameMax) {
		throw validation('nameTooLong', { max: LIMITS.nameMax })
	}
	return name
}

export function isNameTaken(name: string, taken: Iterable<string>): boolean {
	const key = comparisonKey(name)
	for (const other of taken) if (comparisonKey(other) === key) return true
	return false
}

/**
 * First candidate not used in the room; if they all are, the first one with a
 * number appended ("Raclette Masquée 2").
 */
export function firstFreeName(candidates: readonly string[], taken: readonly string[]): string {
	for (const candidate of candidates) if (!isNameTaken(candidate, taken)) return candidate
	const base = (candidates[0] ?? 'Joueur mystère').slice(0, LIMITS.nameMax - 4)
	for (let n = 2; ; n++) {
		const candidate = `${base} ${n}`
		if (!isNameTaken(candidate, taken)) return candidate
	}
}
