import type { TextParams } from '@bingo/shared'

/**
 * Business failures. The interface layer maps each code to an HTTP status or a
 * WebSocket error message; the domain never knows about transports nor
 * languages: `key` (+ `params`) is translated by the client (`error.<key>`).
 */
export type DomainErrorCode =
	| 'validation'
	| 'not-found'
	| 'room-closed'
	| 'room-full'
	| 'wrong-password'
	| 'forbidden'
	| 'solo-room'
	| 'rate-limited'
	| 'unauthorized'

export class DomainError extends Error {
	constructor(
		readonly code: DomainErrorCode,
		readonly key: string,
		readonly params: TextParams = {},
	) {
		super(key)
		this.name = 'DomainError'
	}
}

export const validation = (key: string, params?: TextParams) =>
	new DomainError('validation', key, params)
export const notFound = (key: string, params?: TextParams) =>
	new DomainError('not-found', key, params)
export const forbidden = (key: string, params?: TextParams) =>
	new DomainError('forbidden', key, params)
