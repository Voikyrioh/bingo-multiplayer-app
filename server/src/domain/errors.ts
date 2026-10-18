/**
 * Business failures. The interface layer maps each code to an HTTP status or a
 * WebSocket error message; the domain never knows about transports.
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
		message: string,
	) {
		super(message)
		this.name = 'DomainError'
	}
}

export const validation = (message: string) => new DomainError('validation', message)
export const notFound = (message: string) => new DomainError('not-found', message)
export const forbidden = (message: string) => new DomainError('forbidden', message)
