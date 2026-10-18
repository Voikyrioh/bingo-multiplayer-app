/**
 * Serializes async work per key (a room id): two players filling the last
 * seat, or two full grids at the same time, never race. One process only,
 * which is the deployment model (one container).
 */
export class KeyedMutex {
	private readonly tails = new Map<string, Promise<unknown>>()

	run<T>(key: string, task: () => Promise<T>): Promise<T> {
		const previous = this.tails.get(key) ?? Promise.resolve()
		const result = previous.then(task, task)
		const tail = result.catch(() => undefined)
		this.tails.set(key, tail)
		tail.then(() => {
			if (this.tails.get(key) === tail) this.tails.delete(key)
		})
		return result
	}
}
