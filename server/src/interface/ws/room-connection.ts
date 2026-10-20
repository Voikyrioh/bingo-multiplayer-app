import { CLOSE_CODES, type ServerMessage } from '@bingo/shared'
import type { RoomService, Session } from '../../application/room.service'
import { DomainError } from '../../domain/errors'
import type { ConnectionHub, Socket } from '../../infrastructure/realtime/connection-hub'
import { logger } from '../../logger'
import { clientMessageSchema } from '../schemas'

export interface ConnectionDeps {
	rooms: RoomService
	hub: ConnectionHub
	/** The first message must authenticate within this delay. */
	authTimeoutMs?: number
	/** Without any message (the client pings every 25 s) the socket is considered dead. */
	idleTimeoutMs?: number
}

const MAX_MESSAGE_BYTES = 4096

/**
 * One WebSocket of a room, independent of the server library: it receives
 * text frames and talks to the use cases. Messages are handled one at a time,
 * in order. The token travels in the first message, never in the URL (URLs
 * end up in proxy logs).
 */
export class RoomConnection {
	private session: Session | null = null
	private queue: Promise<void> = Promise.resolve()
	private authTimer: ReturnType<typeof setTimeout> | null = null
	private idleTimer: ReturnType<typeof setTimeout> | null = null
	private closed = false

	constructor(
		private readonly code: string,
		private readonly socket: Socket,
		private readonly deps: ConnectionDeps,
	) {}

	open(): void {
		this.authTimer = setTimeout(
			() => this.socket.close(CLOSE_CODES.unauthorized, 'Authentification attendue'),
			this.deps.authTimeoutMs ?? 5000,
		)
		this.resetIdle()
	}

	receive(data: string): Promise<void> {
		this.resetIdle()
		this.queue = this.queue.then(() => this.handle(data)).catch((error) => this.fail(error))
		return this.queue
	}

	close(): void {
		this.closed = true
		this.clearTimers()
		const session = this.session
		this.session = null
		if (session && this.deps.hub.unregister(session.participantId, this.socket)) {
			this.deps.rooms.disconnected(session)
		}
	}

	private async handle(data: string): Promise<void> {
		if (this.closed) return
		if (data.length > MAX_MESSAGE_BYTES) {
			return this.send({ type: 'error', code: 'validation', key: 'messageTooLong' })
		}
		let json: unknown
		try {
			json = JSON.parse(data)
		} catch {
			return this.send({ type: 'error', code: 'validation', key: 'messageUnreadable' })
		}
		const parsed = clientMessageSchema.safeParse(json)
		if (!parsed.success) {
			return this.send({ type: 'error', code: 'validation', key: 'messageInvalid' })
		}
		const message = parsed.data
		const { rooms, hub } = this.deps

		if (!this.session) {
			if (message.type !== 'auth') {
				this.socket.close(CLOSE_CODES.unauthorized, 'Authentification attendue')
				return
			}
			const session = await rooms.authenticate(this.code, message.token)
			if (this.closed) return
			if (this.authTimer) clearTimeout(this.authTimer)
			this.session = session
			// Registered BEFORE reading the snapshot: an event happening meanwhile
			// is still delivered (the client replays early events after the snapshot).
			hub.register(session.roomId, session.participantId, this.socket)
			this.send(await rooms.snapshot(session))
			rooms.connected(session)
			return
		}

		const session = this.session
		switch (message.type) {
			case 'toggle':
				return rooms.toggle(session, message.cell)
			case 'chat':
				return rooms.chat(session, message.text)
			case 'kick':
				return rooms.kick(session, message.participantId)
			case 'leave':
				return rooms.leave(session)
			case 'sync':
				return this.send(await rooms.snapshot(session))
			case 'ping':
				return this.send({ type: 'pong' })
			case 'auth':
				return
		}
	}

	private fail(error: unknown): void {
		if (error instanceof DomainError) {
			this.send({ type: 'error', code: error.code, key: error.key, params: error.params })
			if (error.code === 'unauthorized') this.socket.close(CLOSE_CODES.unauthorized)
			if (error.code === 'room-closed') this.socket.close(CLOSE_CODES.roomClosed)
			return
		}
		logger.error('WebSocket message failed', { error: (error as Error)?.message })
		this.send({ type: 'error', code: 'internal', key: 'internal' })
	}

	private send(message: ServerMessage): void {
		if (this.closed) return
		try {
			this.socket.send(JSON.stringify(message))
		} catch {
			// Closing socket: nothing to do.
		}
	}

	private resetIdle(): void {
		if (this.idleTimer) clearTimeout(this.idleTimer)
		this.idleTimer = setTimeout(
			() => this.socket.close(1001, 'Inactif'),
			this.deps.idleTimeoutMs ?? 75_000,
		)
	}

	private clearTimers(): void {
		if (this.authTimer) clearTimeout(this.authTimer)
		if (this.idleTimer) clearTimeout(this.idleTimer)
	}
}
