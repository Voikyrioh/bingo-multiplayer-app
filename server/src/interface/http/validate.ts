import { validator } from 'hono/validator'
import type { z } from 'zod'
import { errorBody } from './errors'

/** JSON body validated by a Zod schema (no extra adapter package needed). */
export function jsonBody<T extends z.ZodType>(schema: T) {
	return validator('json', (value, c) => {
		const parsed = schema.safeParse(value)
		if (!parsed.success) {
			const first = parsed.error.issues[0]
			const where = first?.path.join('.') || 'body'
			return c.json(errorBody('validation', 'invalidField', { field: where }), 400)
		}
		return parsed.data as z.output<T>
	})
}
