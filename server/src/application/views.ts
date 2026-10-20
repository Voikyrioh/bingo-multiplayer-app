import type {
	DictionarySummary,
	DictionaryView,
	MessageView,
	ParticipantView,
	RoomSummary,
	RoomView,
} from '@bingo/shared'
import { progressOf } from '@bingo/shared'
import type { Dictionary } from '../domain/dictionary'
import { type Message, maxPlayers, type Participant, type Room } from '../domain/room'

/** Domain → protocol mapping. Hashes and tokens never leave this layer. */

export function dictionarySummary(d: Dictionary): DictionarySummary {
	return {
		code: d.code,
		language: d.language,
		title: d.title,
		description: d.description,
		entryCount: d.entries.length,
		featured: d.featured,
	}
}

export function dictionaryView(d: Dictionary): DictionaryView {
	return {
		...dictionarySummary(d),
		entries: d.entries,
		freeSpace: d.freeSpace,
		createdAt: d.createdAt.toISOString(),
	}
}

export function roomView(room: Room): RoomView {
	return {
		code: room.code,
		name: room.name,
		mode: room.mode,
		visibility: room.visibility,
		hasPassword: room.passwordHash !== null,
		gridSize: room.gridSize,
		freeCenter: room.freeCenter,
		ownerId: room.ownerId,
		dictionary: {
			code: room.dictionary.code,
			title: room.dictionary.title,
			language: room.dictionary.language,
		},
		createdAt: room.createdAt.toISOString(),
		maxPlayers: maxPlayers(room),
	}
}

export function roomSummary(room: Room, players: number, spectators: number): RoomSummary {
	return {
		code: room.code,
		name: room.name,
		dictionaryTitle: room.dictionary.title,
		language: room.dictionary.language,
		gridSize: room.gridSize,
		hasPassword: room.passwordHash !== null,
		players,
		spectators,
		maxPlayers: maxPlayers(room),
		createdAt: room.createdAt.toISOString(),
		lastActivityAt: room.lastActivityAt.toISOString(),
	}
}

export function participantView(
	p: Participant,
	room: Pick<Room, 'ownerId' | 'gridSize'>,
	online: boolean,
): ParticipantView {
	return {
		id: p.id,
		name: p.name,
		role: p.role,
		isOwner: room.ownerId === p.id,
		online,
		cells: p.cells,
		checked: p.checked,
		completedLines: p.cells ? progressOf(room.gridSize, p.checked).completedLines : [],
		fullAt: p.fullAt?.toISOString() ?? null,
		joinedAt: p.joinedAt.toISOString(),
	}
}

export function messageView(m: Message): MessageView {
	return {
		id: m.id,
		kind: m.kind,
		authorId: m.authorId,
		authorName: m.authorName,
		text: m.text,
		...(m.key ? { key: m.key, params: m.params ?? {} } : {}),
		createdAt: m.createdAt.toISOString(),
		...(m.announcement ? { announcement: m.announcement } : {}),
	}
}
