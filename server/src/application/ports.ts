import type { CloseReason, LanguageCode, ServerMessage } from '@bingo/shared'
import type { Dictionary } from '../domain/dictionary'
import type { Message, NewMessage, Participant, Room } from '../domain/room'

/**
 * Ports of the hexagon: what the use cases need from the outside world.
 * Adapters live in infrastructure/ (Postgres, memory, crypto, WebSocket hub).
 */

export interface DictionaryRepository {
	create(dictionary: Dictionary): Promise<void>
	findByCode(code: string): Promise<Dictionary | null>
	findById(id: string): Promise<Dictionary | null>
	/** Featured first, then the newest public ones; only one language if given. */
	listListed(limit: number, language?: LanguageCode): Promise<Dictionary[]>
}

export interface NameRepository {
	/**
	 * Random sample of funny names (order is random). With a dictionary id: only
	 * the names reserved for that dictionary (possibly none); without: the
	 * general pool.
	 */
	sample(count: number, dictionaryId?: string | null): Promise<string[]>
}

export interface OpenRoomRow {
	room: Room
	players: number
	spectators: number
}

export interface RoomRepository {
	create(room: Room, owner: Participant): Promise<void>
	findByCode(code: string): Promise<Room | null>
	findById(id: string): Promise<Room | null>
	/** Saves name, owner, activity and closing date. */
	update(room: Room): Promise<void>
	/** Open public multiplayer rooms; only those playing a dictionary of `language` if given. */
	listOpenPublic(limit: number, language?: LanguageCode): Promise<OpenRoomRow[]>
	listOpen(): Promise<Room[]>
	countParticipants(roomId: string): Promise<{ players: number; spectators: number }>
	/** Deletes rooms closed before this date, with their participants and messages. */
	purgeClosedBefore(date: Date): Promise<number>

	addParticipant(participant: Participant): Promise<void>
	findParticipant(participantId: string): Promise<Participant | null>
	findParticipantByTokenHash(tokenHash: string): Promise<Participant | null>
	listParticipants(roomId: string): Promise<Participant[]>
	saveProgress(participant: Participant): Promise<void>
	removeParticipant(participantId: string): Promise<void>

	addMessage(message: NewMessage): Promise<Message>
	/** The most recent messages, oldest first. */
	listMessages(roomId: string, limit: number): Promise<Message[]>
}

export interface PasswordHasher {
	hash(password: string): Promise<string>
	verify(password: string, hash: string): Promise<boolean>
}

export interface TokenService {
	/** A new secret token and the hash that is stored (never the token). */
	issue(): { token: string; hash: string }
	hash(token: string): string
}

export interface Clock {
	now(): Date
}

export interface IdGenerator {
	uuid(): string
}

/** Push side of the realtime layer (implemented by the WebSocket hub). */
export interface RealtimeGateway {
	broadcast(roomId: string, message: ServerMessage): void
	/** Closes the connection of one participant, after sending it a last message. */
	disconnect(participantId: string, closeCode: number, last?: ServerMessage): void
	closeRoom(roomId: string, reason: CloseReason): void
	isOnline(participantId: string): boolean
	onlineCount(roomId: string): number
}
