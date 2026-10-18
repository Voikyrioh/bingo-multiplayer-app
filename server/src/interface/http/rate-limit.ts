import type { Context, MiddlewareHandler } from 'hono'
import { errorBody } from './errors'

/**
 * Fixed-window limiter in memory (one container). The address is only a map
 * key, it is never logged. Behind Cloudflare, cf-connecting-ip is the client.
 */
export function rateLimit(options: { windowMs: number; max: number; now?: () => number }) {
	const hits = new Map<string, { count: number; resetAt: number }>()
	const now = options.now ?? Date.now
	let lastCleanup = now()

	const middleware: MiddlewareHandler = async (c, next) => {
		const time = now()
		if (time - lastCleanup > options.windowMs) {
			for (const [key, hit] of hits) if (hit.resetAt <= time) hits.delete(key)
			lastCleanup = time
		}
		const key = clientKey(c)
		const hit = hits.get(key)
		if (!hit || hit.resetAt <= time) {
			hits.set(key, { count: 1, resetAt: time + options.windowMs })
		} else if (++hit.count > options.max) {
			c.header('Retry-After', String(Math.ceil((hit.resetAt - time) / 1000)))
			return c.json(errorBody('rate-limited', 'Trop de requêtes, réessayez dans un instant.'), 429)
		}
		await next()
	}
	return middleware
}

function clientKey(c: Context): string {
	return (
		c.req.header('cf-connecting-ip') ??
		c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
		'local'
	)
}
