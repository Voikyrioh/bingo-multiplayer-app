import { Hono } from 'hono'
import type { DictionaryService } from '../../application/dictionary.service'
import type { NameRepository } from '../../application/ports'
import type { RoomService } from '../../application/room.service'
import { firstFreeName } from '../../domain/names'
import { createDictionarySchema, createRoomSchema, joinRoomSchema } from '../schemas'
import { rateLimit } from './rate-limit'
import { jsonBody } from './validate'

export interface ApiDeps {
	rooms: RoomService
	dictionaries: DictionaryService
	names: NameRepository
}

const noStore = { 'Cache-Control': 'no-store' }

export function apiRoutes({ rooms, dictionaries, names }: ApiDeps) {
	const writes = rateLimit({ windowMs: 60_000, max: 30 })
	const api = new Hono()

	api.get('/health', (c) => c.json({ status: 'ok' }, 200, noStore))

	api.get('/dictionaries', async (c) => c.json(await dictionaries.listListed(), 200, noStore))
	api.get('/dictionaries/:code', async (c) =>
		c.json(await dictionaries.get(c.req.param('code')), 200, noStore),
	)
	api.post('/dictionaries', writes, jsonBody(createDictionarySchema), async (c) =>
		c.json(await dictionaries.create(c.req.valid('json')), 201, noStore),
	)

	api.get('/rooms', async (c) => c.json(await rooms.listPublic(), 200, noStore))
	api.get('/rooms/:code', async (c) =>
		c.json(await rooms.preview(c.req.param('code')), 200, noStore),
	)
	api.post('/rooms', writes, jsonBody(createRoomSchema), async (c) =>
		c.json(await rooms.create(c.req.valid('json')), 201, noStore),
	)
	api.post('/rooms/:code/join', writes, jsonBody(joinRoomSchema), async (c) =>
		c.json(await rooms.join(c.req.param('code'), c.req.valid('json')), 201, noStore),
	)

	api.get('/names/random', async (c) => {
		const name = firstFreeName(await names.sample(1), [])
		return c.json({ name }, 200, noStore)
	})

	return api
}
