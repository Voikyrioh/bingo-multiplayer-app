import { CLOSE_CODES } from '@bingo/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomSocket } from '../api/room-socket'

class FakeWebSocket extends EventTarget {
	static instances: FakeWebSocket[] = []
	readyState = 0
	sent: string[] = []
	constructor(readonly url: string) {
		super()
		FakeWebSocket.instances.push(this)
	}
	send(data: string) {
		this.sent.push(data)
	}
	close() {}
	open() {
		this.readyState = 1
		this.dispatchEvent(new Event('open'))
	}
	receive(data: unknown) {
		this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }))
	}
	drop(code: number) {
		this.readyState = 3
		this.dispatchEvent(new CloseEvent('close', { code }))
	}
}

function createSocket() {
	const handlers = { onMessage: vi.fn(), onStatus: vi.fn(), onEnded: vi.fn() }
	const socket = new RoomSocket(
		'ABC234',
		'secret',
		handlers,
		(url) => new FakeWebSocket(url) as unknown as WebSocket,
	)
	socket.connect()
	return { socket, handlers, ws: () => FakeWebSocket.instances.at(-1) as FakeWebSocket }
}

beforeEach(() => {
	FakeWebSocket.instances = []
	vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('RoomSocket', () => {
	it('authenticates in the first message, never in the URL', () => {
		const { ws } = createSocket()
		expect(ws().url).toMatch(/\/api\/rooms\/ABC234\/ws$/)
		expect(ws().url).not.toContain('secret')
		ws().open()
		expect(JSON.parse(ws().sent[0] as string)).toEqual({ type: 'auth', token: 'secret' })
	})

	it('goes live on the snapshot and pings regularly', () => {
		const { ws, handlers } = createSocket()
		ws().open()
		ws().receive({ type: 'snapshot' })
		expect(handlers.onStatus).toHaveBeenLastCalledWith('live')
		vi.advanceTimersByTime(25_000)
		expect(ws().sent.at(-1)).toBe(JSON.stringify({ type: 'ping' }))
	})

	it('reconnects after a network drop', () => {
		const { ws, handlers } = createSocket()
		ws().open()
		ws().drop(1006)
		expect(handlers.onStatus).toHaveBeenLastCalledWith('reconnecting')
		vi.advanceTimersByTime(20_000)
		expect(FakeWebSocket.instances).toHaveLength(2)
	})

	it('stops for good when kicked', () => {
		const { ws, handlers } = createSocket()
		ws().open()
		ws().drop(CLOSE_CODES.kicked)
		vi.advanceTimersByTime(60_000)
		expect(FakeWebSocket.instances).toHaveLength(1)
		expect(handlers.onEnded).toHaveBeenCalledWith(CLOSE_CODES.kicked)
	})
})
