/**
 * localStorage that never throws (private mode, blocked storage): the app
 * keeps working, it just forgets between visits.
 */
export function readJson<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key)
		return raw === null ? fallback : (JSON.parse(raw) as T)
	} catch {
		return fallback
	}
}

export function writeJson(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value))
	} catch {
		// Storage unavailable: nothing to do.
	}
}

export function removeKey(key: string): void {
	try {
		localStorage.removeItem(key)
	} catch {
		// Storage unavailable: nothing to do.
	}
}
