import type { Membership, RoomSummary } from '@bingo/shared'
import { describe, expect, it } from 'vitest'
import { FEATURED_DICTIONARIES, FUNNY_NAMES } from '../infrastructure/seed-data'
import { createApp } from '../interface/http/app'
import { baseRoom, createTestServices, MACRON } from './support/fixtures'

function testApp() {
	const services = createTestServices()
	const { app } = createApp({ ...services, publicOrigin: null, staticDir: null })
	const post = (path: string, body: unknown) =>
		app.request(path, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		})
	return { app, post, services }
}

describe('HTTP API', () => {
	it('answers the health check', async () => {
		const { app } = testApp()
		const res = await app.request('/api/health')
		expect(res.status).toBe(200)
		expect(res.headers.get('cache-control')).toBe('no-store')
	})

	it('lists the featured dictionaries and serves one', async () => {
		const { app } = testApp()
		const list = (await (await app.request('/api/dictionaries')).json()) as { code: string }[]
		expect(list.map((d) => d.code)).toContain(MACRON)
		const res = await app.request(`/api/dictionaries/${MACRON}`)
		const body = (await res.json()) as { entries: string[]; freeSpace: string }
		expect(body.entries).toContain('En même temps')
		expect(body.freeSpace).toBe('Regard grave à la caméra')
	})

	it('creates a dictionary, hidden from the list unless public', async () => {
		const { app, post } = testApp()
		const entries = Array.from({ length: 10 }, (_, i) => `Truc ${i}`)
		const res = await post('/api/dictionaries', { title: 'Privé', entries, isPublic: false })
		expect(res.status).toBe(201)
		const { code } = (await res.json()) as { code: string }
		const list = (await (await app.request('/api/dictionaries')).json()) as { code: string }[]
		expect(list.map((d) => d.code)).not.toContain(code)
		expect((await app.request(`/api/dictionaries/${code}`)).status).toBe(200)
	})

	it('creates a room, lists it, previews it and joins it', async () => {
		const { app, post } = testApp()
		const created = await post('/api/rooms', { ...baseRoom, password: 'chut' })
		expect(created.status).toBe(201)
		const owner = (await created.json()) as Membership
		expect(owner.token).toBeTruthy()

		const list = (await (await app.request('/api/rooms')).json()) as RoomSummary[]
		expect(list[0]).toMatchObject({ code: owner.roomCode, hasPassword: true, players: 1 })
		expect(JSON.stringify(list)).not.toContain('scrypt')

		const preview = await app.request(`/api/rooms/${owner.roomCode}`)
		expect(((await preview.json()) as { closed: boolean }).closed).toBe(false)

		const wrong = await post(`/api/rooms/${owner.roomCode}/join`, {
			role: 'player',
			password: 'non',
		})
		expect(wrong.status).toBe(403)
		expect(((await wrong.json()) as { code: string }).code).toBe('wrong-password')

		const joined = await post(`/api/rooms/${owner.roomCode}/join`, {
			role: 'player',
			password: 'chut',
		})
		expect(joined.status).toBe(201)
	})

	it('maps validation and unknown resources to 400 and 404', async () => {
		const { app, post } = testApp()
		expect((await post('/api/rooms', { name: 'x' })).status).toBe(400)
		expect((await post('/api/rooms', { ...baseRoom, name: 'x' })).status).toBe(400)
		expect((await app.request('/api/rooms/ZZZZZZ')).status).toBe(404)
		expect((await app.request('/api/nothing')).status).toBe(404)
	})

	it('gives a random funny name, themed by the dictionary or the room', async () => {
		const { app, post } = testApp()
		const random = async (query = '') =>
			((await (await app.request(`/api/names/random${query}`)).json()) as { name: string }).name
		const themed = FEATURED_DICTIONARIES[0]?.funnyNames ?? []
		expect(FUNNY_NAMES).toContain(await random())
		expect(themed).toContain(await random(`?dictionary=${MACRON}`))
		expect(FUNNY_NAMES).toContain(await random('?dictionary=reunion-d-equipe'))
		const owner = (await (await post('/api/rooms', baseRoom)).json()) as Membership
		expect(themed).toContain(await random(`?room=${owner.roomCode.toLowerCase()}`))
	})

	it('rate limits the writes', async () => {
		const { post } = testApp()
		const statuses = []
		for (let i = 0; i < 32; i++) statuses.push((await post('/api/rooms', {})).status)
		expect(statuses.at(-1)).toBe(429)
	})
})
