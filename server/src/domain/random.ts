/** Source of randomness, injected so that grids and codes are testable. */
export interface Random {
	/** Integer in [0, maxExclusive). */
	int(maxExclusive: number): number
}

/** Fisher-Yates shuffle, returns a new array. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
	const copy = [...items]
	for (let i = copy.length - 1; i > 0; i--) {
		const j = random.int(i + 1)
		const tmp = copy[i] as T
		copy[i] = copy[j] as T
		copy[j] = tmp
	}
	return copy
}

export function pick<T>(items: readonly T[], random: Random): T {
	if (items.length === 0) throw new Error('Cannot pick from an empty list')
	return items[random.int(items.length)] as T
}
