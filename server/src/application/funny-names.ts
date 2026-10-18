import { firstFreeName, isNameTaken } from '../domain/names'
import type { NameRepository } from './ports'

const SAMPLE = 20

/**
 * A funny name not used in the room: first from the names reserved for the
 * dictionary (if it has some and one is free), then from the general pool.
 */
export async function drawFunnyName(
	names: NameRepository,
	taken: readonly string[],
	dictionaryId: string | null,
): Promise<string> {
	if (dictionaryId) {
		const themed = await names.sample(SAMPLE, dictionaryId)
		const free = themed.find((name) => !isNameTaken(name, taken))
		if (free) return free
	}
	return firstFreeName(await names.sample(SAMPLE), taken)
}
