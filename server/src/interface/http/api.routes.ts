import { isLanguageCode, type LanguageCode } from '@bingo/shared'
import { Hono } from 'hono'
import type { DictionaryService } from '../../application/dictionary.service'
import type { NameService } from '../../application/name.service'
import type { RoomService } from '../../application/room.service'
import { createDictionarySchema, createRoomSchema, joinRoomSchema } from '../schemas'
import { rateLimit } from './rate-limit'
import { jsonBody } from './validate'

export interface ApiDeps {
	rooms: RoomService
	dictionaries: DictionaryService
	names: NameService
}

const noStore = { 'Cache-Control': 'no-store' }

export function apiRoutes({ rooms, dictionaries, names }: ApiDeps) {
	const writes = rateLimit({ windowMs: 60_000, max: 30 })
	const api = new Hono()

	api.get('/health', (c) => c.json({ status: 'ok' }, 200, noStore))

	// ?language=xx: only content in that language (absent or unknown = every language).
	api.get('/dictionaries', async (c) =>
		c.json(await dictionaries.listListed(languageQuery(c.req.query('language'))), 200, noStore),
	)
	api.get('/dictionaries/:code', async (c) =>
		c.json(await dictionaries.get(c.req.param('code')), 200, noStore),
	)
	api.post('/dictionaries', writes, jsonBody(createDictionarySchema), async (c) =>
		c.json(await dictionaries.create(c.req.valid('json')), 201, noStore),
	)

	api.get('/rooms', async (c) =>
		c.json(await rooms.listPublic(languageQuery(c.req.query('language'))), 200, noStore),
	)
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
		// ?room=CODE or ?dictionary=code: names reserved for that dictionary first.
		const name = await names.random({
			roomCode: c.req.query('room')?.slice(0, 12),
			dictionaryCode: c.req.query('dictionary')?.slice(0, 40),
		})
		return c.json({ name }, 200, noStore)
	})

	return api
}

function languageQuery(value: string | undefined): LanguageCode | undefined {
	return isLanguageCode(value) ? value : undefined
}
