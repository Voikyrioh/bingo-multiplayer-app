import type { AddressInfo } from 'node:net'
import { CLOSE_CODES, type Membership, type ServerMessage } from '@bingo/shared'
import { serve } from '@hono/node-server'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../interface/http/app'
import { baseRoom, createTestServices } from './support/fixtures'

/** Real server + real WebSocket clients (Node 22 global WebSocket). */
async function startServer() {
	const services = createTestServices()
	const { app, injectWebSocket } = createApp({ ...services, publicOrigin: null, staticDir: null })
	const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 })
	injectWebSocket(server)
	await new Promise((resolve) => server.once('listening', resolve))
	const { port } = server.address() as AddressInfo
	const base = `http://127.0.0.1:${port}`
	const post = async (path: string, body: unknown) =>
		(await (
			await fetch(base + path, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			})
		).json()) as Membership
	return { services, server, base, port, post }
}

class Client {
	readonly messages: ServerMessage[] = []
	closeCode: number | null = null
	private readonly ws: WebSocket
	private waiters: Array<() => void> = []

	constructor(url: string) {
		this.ws = new WebSocket(url)
		this.ws.addEventListener('message', (event) => {
			this.messages.push(JSON.parse(String(event.data)))
			for (const wake of this.waiters) wake()
		})
		this.ws.addEventListener('close', (event) => {
			this.closeCode = event.code
			for (const wake of this.waiters) wake()
		})
	}

	opened() {
		return new Promise<void>((resolve) => this.ws.addEventListener('open', () => resolve()))
	}

	send(message: unknown) {
		this.ws.send(JSON.stringify(message))
	}

	async waitFor<T extends ServerMessage['type']>(type: T, count = 1) {
		const deadline = Date.now() + 2000
		for (;;) {
			const found = this.messages.filter((m) => m.type === type)
			if (found.length >= count) return found[count - 1] as Extract<ServerMessage, { type: T }>
			if (Date.now() > deadline) throw new Error(`Timeout waiting for ${type}`)
			await new Promise<void>((resolve) => {
				this.waiters.push(resolve)
				setTimeout(resolve, 50)
			})
		}
	}

	async waitClosed() {
		const deadline = Date.now() + 2000
		while (this.closeCode === null && Date.now() < deadline)
			await new Promise((r) => setTimeout(r, 20))
		return this.closeCode
	}

	close() {
		this.ws.close()
	}
}

let cleanup: Array<() => void> = []
afterEach(() => {
	for (const fn of cleanup) fn()
	cleanup = []
})

async function connect(port: number, member: Membership) {
	const client = new Client(`ws://127.0.0.1:${port}/api/rooms/${member.roomCode}/ws`)
	cleanup.push(() => client.close())
	await client.opened()
	client.send({ type: 'auth', token: member.token })
	await client.waitFor('snapshot')
	return client
}

describe('room WebSocket', () => {
	it('synchronizes grids, announcements and chat between players', async () => {
		const { server, port, post } = await startServer()
		cleanup.push(() => server.close())
		const alice = await post('/api/rooms', baseRoom)
		const bob = await post(`/api/rooms/${alice.roomCode}/join`, { name: 'Bob', role: 'player' })

		const a = await connect(port, alice)
		const b = await connect(port, bob)
		const snapshot = await b.waitFor('snapshot')
		expect(snapshot.me).toBe(bob.participantId)
		expect(snapshot.participants).toHaveLength(2)
		expect(snapshot.participants.find((p) => p.id === alice.participantId)?.online).toBe(true)

		for (const cell of [0, 1, 2, 3, 4]) a.send({ type: 'toggle', cell })
		const announce = await b.waitFor('announce')
		expect(announce.announcement).toMatchObject({ name: 'Alice', kind: 'line' })
		const progress = await b.waitFor('participant:progress', 5)
		expect(progress.checked).toEqual([0, 1, 2, 3, 4, 12])

		b.send({ type: 'chat', text: 'Bien joué !' })
		await a.waitFor('message', 1)
		const deadline = Date.now() + 2000
		while (!a.messages.some((m) => m.type === 'message' && m.message.text === 'Bien joué !')) {
			if (Date.now() > deadline) throw new Error('chat not received')
			await new Promise((r) => setTimeout(r, 20))
		}
	})

	it('refuses a bad token and answers pings', async () => {
		const { server, port, post } = await startServer()
		cleanup.push(() => server.close())
		const alice = await post('/api/rooms', baseRoom)

		const intruder = new Client(`ws://127.0.0.1:${port}/api/rooms/${alice.roomCode}/ws`)
		await intruder.opened()
		intruder.send({ type: 'auth', token: 'forged' })
		expect(await intruder.waitClosed()).toBe(CLOSE_CODES.unauthorized)

		const a = await connect(port, alice)
		a.send({ type: 'ping' })
		await a.waitFor('pong')
	})

	it('disconnects a kicked player', async () => {
		const { server, port, post } = await startServer()
		cleanup.push(() => server.close())
		const alice = await post('/api/rooms', baseRoom)
		const bob = await post(`/api/rooms/${alice.roomCode}/join`, { role: 'player' })
		const a = await connect(port, alice)
		const b = await connect(port, bob)
		a.send({ type: 'kick', participantId: bob.participantId })
		await b.waitFor('kicked')
		expect(await b.waitClosed()).toBe(CLOSE_CODES.kicked)
		const left = await a.waitFor('participant:left')
		expect(left).toMatchObject({ participantId: bob.participantId, reason: 'kicked' })
	})
})
