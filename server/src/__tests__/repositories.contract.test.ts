import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DictionaryRepository, NameRepository, RoomRepository } from '../application/ports'
import type { Participant, Room } from '../domain/room'
import {
	MemoryDictionaryRepository,
	MemoryNameRepository,
	MemoryRoomRepository,
} from '../infrastructure/memory/memory.repositories'
import { migrate } from '../infrastructure/postgres/migrate'
import {
	PgDictionaryRepository,
	PgNameRepository,
	PgRoomRepository,
} from '../infrastructure/postgres/pg.repositories'
import { seed } from '../infrastructure/postgres/seed'
import { FEATURED_DICTIONARIES } from '../infrastructure/seed-data'
import { seededRandom } from './support/fixtures'

/**
 * Same expectations for every adapter of the repository ports. The Postgres
 * run needs TEST_DATABASE_URL (CI starts a postgres service); it is skipped
 * otherwise.
 */
interface Repos {
	rooms: RoomRepository
	dictionaries: DictionaryRepository
	names: NameRepository
}

const macron = FEATURED_DICTIONARIES[0] as (typeof FEATURED_DICTIONARIES)[number]
let n = 0
const uuid = () => `00000000-0000-4000-a000-${String(++n).padStart(12, '0')}`

function makeRoom(overrides: Partial<Room> = {}): Room {
	const now = new Date('2026-10-18T20:00:00Z')
	return {
		id: uuid(),
		code: `R${String(n).padStart(5, '0')}`,
		name: 'Salon test',
		mode: 'multi',
		visibility: 'public',
		passwordHash: null,
		dictionary: { id: macron.id, code: macron.code, title: macron.title },
		gridSize: 3,
		freeCenter: true,
		ownerId: null,
		createdAt: now,
		lastActivityAt: now,
		closedAt: null,
		...overrides,
	}
}

function makeParticipant(roomId: string, overrides: Partial<Participant> = {}): Participant {
	return {
		id: uuid(),
		roomId,
		name: `Joueur ${n}`,
		role: 'player',
		tokenHash: `hash-${n}`,
		cells: [{ text: 'A', free: false }],
		checked: [],
		announcedLines: [],
		fullAt: null,
		joinedAt: new Date(Date.UTC(2026, 9, 18, 20, 0, n)),
		...overrides,
	}
}

function contract(name: string, factory: () => Promise<Repos>, options: { skip?: boolean } = {}) {
	describe.skipIf(options.skip)(`${name} repositories`, () => {
		let repos: Repos
		beforeEach(async () => {
			repos = await factory()
		})

		it('serves the featured dictionaries', async () => {
			const found = await repos.dictionaries.findByCode('discours-macron')
			expect(found?.entries).toContain('En même temps')
			expect(found?.featured).toBe(true)
			const listed = await repos.dictionaries.listListed(100)
			expect(listed[0]?.featured).toBe(true)
		})

		it('stores a dictionary', async () => {
			const id = uuid()
			await repos.dictionaries.create({
				id,
				code: `dict-${n}`,
				title: 'Test',
				description: '',
				entries: ['a', 'b'],
				freeSpace: null,
				isPublic: false,
				featured: false,
				createdAt: new Date(),
			})
			expect((await repos.dictionaries.findById(id))?.entries).toEqual(['a', 'b'])
			expect((await repos.dictionaries.listListed(100)).some((d) => d.id === id)).toBe(false)
		})

		it('samples funny names', async () => {
			const names = await repos.names.sample(5)
			expect(names).toHaveLength(5)
			expect(new Set(names).size).toBe(5)
		})

		it('stores rooms, participants and progress', async () => {
			const room = makeRoom()
			const owner = makeParticipant(room.id)
			room.ownerId = owner.id
			await repos.rooms.create(room, owner)
			const spectator = makeParticipant(room.id, { role: 'spectator', cells: null })
			await repos.rooms.addParticipant(spectator)

			expect(await repos.rooms.findByCode(room.code)).toMatchObject({
				id: room.id,
				ownerId: owner.id,
				dictionary: { code: 'discours-macron' },
			})
			expect(await repos.rooms.countParticipants(room.id)).toEqual({ players: 1, spectators: 1 })
			expect((await repos.rooms.findParticipantByTokenHash(owner.tokenHash))?.id).toBe(owner.id)

			const fullAt = new Date('2026-10-18T20:30:00Z')
			await repos.rooms.saveProgress({ ...owner, checked: [0, 4], announcedLines: ['r0'], fullAt })
			expect(await repos.rooms.findParticipant(owner.id)).toMatchObject({
				checked: [0, 4],
				announcedLines: ['r0'],
				fullAt,
			})

			const listed = await repos.rooms.listOpenPublic(10)
			expect(listed.find((r) => r.room.id === room.id)).toMatchObject({ players: 1, spectators: 1 })

			await repos.rooms.removeParticipant(spectator.id)
			expect((await repos.rooms.listParticipants(room.id)).map((p) => p.id)).toEqual([owner.id])
		})

		it('keeps the last messages in order', async () => {
			const room = makeRoom()
			await repos.rooms.create(room, makeParticipant(room.id))
			for (let i = 0; i < 5; i++) {
				await repos.rooms.addMessage({
					roomId: room.id,
					kind: 'chat',
					authorId: null,
					authorName: 'X',
					text: `m${i}`,
					announcement: null,
					createdAt: new Date(),
				})
			}
			expect((await repos.rooms.listMessages(room.id, 3)).map((m) => m.text)).toEqual([
				'm2',
				'm3',
				'm4',
			])
		})

		it('closes, hides and purges rooms', async () => {
			const room = makeRoom()
			await repos.rooms.create(room, makeParticipant(room.id))
			const closedAt = new Date('2026-10-01T00:00:00Z')
			await repos.rooms.update({ ...room, closedAt })
			expect((await repos.rooms.listOpen()).some((r) => r.id === room.id)).toBe(false)
			expect((await repos.rooms.listOpenPublic(100)).some((r) => r.room.id === room.id)).toBe(false)
			expect(await repos.rooms.purgeClosedBefore(new Date('2026-10-02T00:00:00Z'))).toBeGreaterThan(
				0,
			)
			expect(await repos.rooms.findById(room.id)).toBeNull()
		})
	})
}

contract('memory', async () => ({
	rooms: new MemoryRoomRepository(),
	dictionaries: new MemoryDictionaryRepository(),
	names: new MemoryNameRepository(seededRandom()),
}))

const url = process.env.TEST_DATABASE_URL
let pool: pg.Pool | null = null

beforeAll(async () => {
	if (!url) return
	pool = new pg.Pool({ connectionString: url })
	await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
	await migrate(pool, 'migrations')
	await migrate(pool, 'migrations') // idempotent
	await seed(pool)
	await seed(pool) // idempotent
})

afterAll(async () => {
	await pool?.end()
})

contract(
	'postgres',
	async () => {
		const db = pool as pg.Pool
		return {
			rooms: new PgRoomRepository(db),
			dictionaries: new PgDictionaryRepository(db),
			names: new PgNameRepository(db),
		}
	},
	{ skip: !url },
)
