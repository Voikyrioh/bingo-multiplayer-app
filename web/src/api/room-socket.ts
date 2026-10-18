import { CLOSE_CODES, type ClientMessage, type ServerMessage } from '@bingo/shared'

export type SocketStatus = 'connecting' | 'live' | 'reconnecting' | 'ended'

export interface RoomSocketHandlers {
	onMessage(message: ServerMessage): void
	onStatus(status: SocketStatus): void
	/** The server ended the session for good (kicked, closed room, bad token...). */
	onEnded(closeCode: number): void
}

/** Close codes after which reconnecting is pointless. */
const FINAL_CODES = new Set<number>(Object.values(CLOSE_CODES))
const PING_EVERY_MS = 25_000
const MAX_BACKOFF_MS = 15_000

type SocketFactory = (url: string) => WebSocket

/**
 * WebSocket of one room: authenticates with the token in the first message,
 * pings every 25 s (Cloudflare drops idle sockets after ~100 s) and
 * reconnects with backoff after a network drop or a server restart.
 */
export class RoomSocket {
	private ws: WebSocket | null = null
	private pingTimer: ReturnType<typeof setInterval> | null = null
	private retryTimer: ReturnType<typeof setTimeout> | null = null
	private attempts = 0
	private disposed = false

	constructor(
		private readonly code: string,
		private readonly token: string,
		private readonly handlers: RoomSocketHandlers,
		private readonly factory: SocketFactory = (url) => new WebSocket(url),
	) {}

	connect(): void {
		if (this.disposed) return
		this.handlers.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting')
		const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
		const ws = this.factory(
			`${scheme}://${location.host}/api/rooms/${encodeURIComponent(this.code)}/ws`,
		)
		this.ws = ws

		ws.addEventListener('open', () => {
			ws.send(JSON.stringify({ type: 'auth', token: this.token } satisfies ClientMessage))
			this.pingTimer = setInterval(() => this.send({ type: 'ping' }), PING_EVERY_MS)
		})
		ws.addEventListener('message', (event) => {
			let message: ServerMessage
			try {
				message = JSON.parse(String(event.data)) as ServerMessage
			} catch {
				return
			}
			if (message.type === 'snapshot') {
				this.attempts = 0
				this.handlers.onStatus('live')
			}
			this.handlers.onMessage(message)
		})
		ws.addEventListener('close', (event) => {
			this.stopPing()
			if (this.ws !== ws || this.disposed) return
			this.ws = null
			if (FINAL_CODES.has(event.code)) {
				this.handlers.onStatus('ended')
				this.handlers.onEnded(event.code)
				return
			}
			this.scheduleRetry()
		})
	}

	send(message: ClientMessage): boolean {
		if (this.ws?.readyState !== WebSocket.OPEN) return false
		this.ws.send(JSON.stringify(message))
		return true
	}

	/** Reconnects now (back online, tab visible again) instead of waiting. */
	nudge(): void {
		if (this.disposed || this.ws) return
		if (this.retryTimer) clearTimeout(this.retryTimer)
		this.retryTimer = null
		this.connect()
	}

	dispose(): void {
		this.disposed = true
		this.stopPing()
		if (this.retryTimer) clearTimeout(this.retryTimer)
		const ws = this.ws
		this.ws = null
		ws?.close(1000)
	}

	private scheduleRetry(): void {
		this.attempts++
		this.handlers.onStatus('reconnecting')
		const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.attempts) * (0.8 + Math.random() * 0.4)
		this.retryTimer = setTimeout(() => {
			this.retryTimer = null
			this.connect()
		}, delay)
	}

	private stopPing(): void {
		if (this.pingTimer) clearInterval(this.pingTimer)
		this.pingTimer = null
	}
}
