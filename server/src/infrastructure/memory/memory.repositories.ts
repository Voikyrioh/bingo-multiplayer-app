import type { LanguageCode } from '@bingo/shared'
import type {
	DictionaryRepository,
	NameRepository,
	OpenRoomRow,
	RoomRepository,
} from '../../application/ports'
import type { Dictionary } from '../../domain/dictionary'
import { type Random, shuffle } from '../../domain/random'
import type { Message, NewMessage, Participant, Room } from '../../domain/room'
import { FEATURED_DICTIONARIES, FUNNY_NAMES } from '../seed-data'

/**
 * In-memory adapters: unit tests and `STORAGE=memory` (try the app without
 * Postgres). Same contract as the Postgres ones (see the contract tests).
 * Objects are copied in and out so that callers cannot mutate the store.
 */
const clone = <T>(value: T): T => structuredClone(value)

export class MemoryDictionaryRepository implements DictionaryRepository {
	private readonly byId = new Map<string, Dictionary>()

	constructor(seed = true) {
		if (!seed) return
		for (const { funnyNames: _names, ...d } of FEATURED_DICTIONARIES) {
			this.byId.set(d.id, {
				...d,
				isPublic: true,
				featured: true,
				createdAt: new Date('2026-10-18T00:00:00Z'),
			})
		}
	}

	async create(dictionary: Dictionary) {
		this.byId.set(dictionary.id, clone(dictionary))
	}

	async findByCode(code: string) {
		const found = [...this.byId.values()].find((d) => d.code === code)
		return found ? clone(found) : null
	}

	async findById(id: string) {
		const found = this.byId.get(id)
		return found ? clone(found) : null
	}

	async listListed(limit: number, language?: LanguageCode) {
		return [...this.byId.values()]
			.filter((d) => (d.isPublic || d.featured) && (!language || d.language === language))
			.sort(
				(a, b) =>
					Number(b.featured) - Number(a.featured) || b.createdAt.getTime() - a.createdAt.getTime(),
			)
			.slice(0, limit)
			.map(clone)
	}
}

export class MemoryNameRepository implements NameRepository {
	constructor(
		private readonly random: Random,
		private readonly names: string[] = FUNNY_NAMES,
		private readonly byDictionary: Map<string, string[]> = new Map(
			FEATURED_DICTIONARIES.map((d) => [d.id, d.funnyNames ?? []]),
		),
	) {}

	async sample(count: number, dictionaryId?: string | null) {
		const pool = dictionaryId ? (this.byDictionary.get(dictionaryId) ?? []) : this.names
		return shuffle(pool, this.random).slice(0, count)
	}
}

export class MemoryRoomRepository implements RoomRepository {
	private readonly rooms = new Map<string, Room>()
	private readonly participants = new Map<string, Participant>()
	private readonly messages: Message[] = []
	private nextMessageId = 1

	async create(room: Room, owner: Participant) {
		this.rooms.set(room.id, clone(room))
		this.participants.set(owner.id, clone(owner))
	}

	async findByCode(code: string) {
		const found = [...this.rooms.values()].find((r) => r.code === code)
		return found ? clone(found) : null
	}

	async findById(id: string) {
		const found = this.rooms.get(id)
		return found ? clone(found) : null
	}

	async update(room: Room) {
		const current = this.rooms.get(room.id)
		if (!current) return
		this.rooms.set(room.id, {
			...current,
			name: room.name,
			ownerId: room.ownerId,
			lastActivityAt: room.lastActivityAt,
			closedAt: room.closedAt,
		})
	}

	async listOpenPublic(limit: number, language?: LanguageCode): Promise<OpenRoomRow[]> {
		const rows = []
		for (const room of this.rooms.values()) {
			if (room.closedAt || room.visibility !== 'public' || room.mode !== 'multi') continue
			if (language && room.dictionary.language !== language) continue
			rows.push({ room: clone(room), ...(await this.countParticipants(room.id)) })
		}
		return rows
			.sort(
				(a, b) =>
					b.players - a.players ||
					b.room.lastActivityAt.getTime() - a.room.lastActivityAt.getTime(),
			)
			.slice(0, limit)
	}

	async listOpen() {
		return [...this.rooms.values()].filter((r) => !r.closedAt).map(clone)
	}

	async countParticipants(roomId: string) {
		let players = 0
		let spectators = 0
		for (const p of this.participants.values()) {
			if (p.roomId !== roomId) continue
			if (p.role === 'player') players++
			else spectators++
		}
		return { players, spectators }
	}

	async purgeClosedBefore(date: Date) {
		let purged = 0
		for (const room of [...this.rooms.values()]) {
			if (!room.closedAt || room.closedAt >= date) continue
			this.rooms.delete(room.id)
			for (const p of [...this.participants.values()]) {
				if (p.roomId === room.id) this.participants.delete(p.id)
			}
			for (let i = this.messages.length - 1; i >= 0; i--) {
				if (this.messages[i]?.roomId === room.id) this.messages.splice(i, 1)
			}
			purged++
		}
		return purged
	}

	async addParticipant(participant: Participant) {
		this.participants.set(participant.id, clone(participant))
	}

	async findParticipant(participantId: string) {
		const found = this.participants.get(participantId)
		return found ? clone(found) : null
	}

	async findParticipantByTokenHash(tokenHash: string) {
		const found = [...this.participants.values()].find((p) => p.tokenHash === tokenHash)
		return found ? clone(found) : null
	}

	async listParticipants(roomId: string) {
		return [...this.participants.values()]
			.filter((p) => p.roomId === roomId)
			.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
			.map(clone)
	}

	async saveProgress(participant: Participant) {
		const current = this.participants.get(participant.id)
		if (!current) return
		this.participants.set(participant.id, {
			...current,
			checked: [...participant.checked],
			announcedLines: [...participant.announcedLines],
			fullAt: participant.fullAt,
		})
	}

	async removeParticipant(participantId: string) {
		this.participants.delete(participantId)
	}

	async addMessage(message: NewMessage) {
		const saved = { ...clone(message), id: String(this.nextMessageId++) }
		this.messages.push(saved)
		return clone(saved)
	}

	async listMessages(roomId: string, limit: number) {
		return this.messages
			.filter((m) => m.roomId === roomId)
			.slice(-limit)
			.map(clone)
	}
}
