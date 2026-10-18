import { DictionaryService } from '../../application/dictionary.service'
import { NameService } from '../../application/name.service'
import type { Clock, IdGenerator } from '../../application/ports'
import { RoomService } from '../../application/room.service'
import type { Random } from '../../domain/random'
import {
	MemoryDictionaryRepository,
	MemoryNameRepository,
	MemoryRoomRepository,
} from '../../infrastructure/memory/memory.repositories'
import { ConnectionHub, type Socket } from '../../infrastructure/realtime/connection-hub'
import { ScryptPasswordHasher } from '../../infrastructure/security/scrypt-password-hasher'
import { sha256TokenService } from '../../infrastructure/security/sha256-token-service'

/** Deterministic random (mulberry32). */
export function seededRandom(seed = 42): Random {
	let state = seed
	return {
		int(max) {
			state = (state + 0x6d2b79f5) | 0
			let t = state
			t = Math.imul(t ^ (t >>> 15), t | 1)
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
			return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max)
		},
	}
}

export class FakeClock implements Clock {
	constructor(private time = new Date('2026-10-18T20:00:00Z').getTime()) {}
	now() {
		return new Date(this.time)
	}
	advance(ms: number) {
		this.time += ms
	}
}

export function sequentialIds(): IdGenerator {
	let n = 0
	return {
		uuid: () => `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`,
	}
}

/** Records what the hub sends; parse() returns the JSON messages. */
export class FakeSocket implements Socket {
	sent: string[] = []
	closedWith: number | null = null
	send(data: string) {
		this.sent.push(data)
	}
	close(code?: number) {
		this.closedWith = code ?? 1000
	}
	messages() {
		return this.sent.map((s) => JSON.parse(s))
	}
	ofType(type: string) {
		return this.messages().filter((m) => m.type === type)
	}
}

export function createTestServices() {
	const clock = new FakeClock()
	const random = seededRandom()
	const ids = sequentialIds()
	const roomRepo = new MemoryRoomRepository()
	const dictionaryRepo = new MemoryDictionaryRepository()
	const names = new MemoryNameRepository(random)
	const hub = new ConnectionHub()
	const rooms = new RoomService({
		rooms: roomRepo,
		dictionaries: dictionaryRepo,
		names,
		passwords: new ScryptPasswordHasher({ N: 1024, r: 8, p: 1 }),
		tokens: sha256TokenService,
		realtime: hub,
		clock,
		ids,
		random,
	})
	const dictionaries = new DictionaryService({ dictionaries: dictionaryRepo, clock, ids, random })
	const nameService = new NameService({ names, dictionaries: dictionaryRepo, rooms: roomRepo })
	return {
		clock,
		random,
		roomRepo,
		dictionaryRepo,
		nameRepo: names,
		names: nameService,
		hub,
		rooms,
		dictionaries,
	}
}

export const MACRON = 'discours-macron'

export const baseRoom = {
	name: 'Soirée allocution',
	mode: 'multi' as const,
	visibility: 'public' as const,
	dictionaryCode: MACRON,
	gridSize: 5,
	freeCenter: true,
	ownerName: 'Alice',
}
