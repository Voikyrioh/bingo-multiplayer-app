import type { ApiError } from '@bingo/shared'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { DomainError, type DomainErrorCode } from '../../domain/errors'
import { logger } from '../../logger'

const STATUS: Record<DomainErrorCode, ContentfulStatusCode> = {
	validation: 400,
	unauthorized: 401,
	'wrong-password': 403,
	forbidden: 403,
	'solo-room': 403,
	'not-found': 404,
	'room-full': 409,
	'room-closed': 410,
	'rate-limited': 429,
}

export function errorBody(code: string, message: string): ApiError {
	return { code, message }
}

export function onError(error: Error, c: Context) {
	if (error instanceof DomainError) {
		return c.json(errorBody(error.code, error.message), STATUS[error.code])
	}
	logger.error('Unhandled error', { path: c.req.path, error: error.message, stack: error.stack })
	return c.json(
		errorBody('internal', 'Oups, une erreur inattendue. Réessayez dans un instant.'),
		500,
	)
}

export function onNotFound(c: Context) {
	return c.json(errorBody('not-found', 'Route inconnue.'), 404)
}
