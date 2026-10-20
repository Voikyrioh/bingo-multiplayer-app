import {
	type AnnouncementKind,
	type LanguageCode,
	LIMITS,
	lineKind,
	type MessageKind,
	type ParticipantRole,
	progressOf,
	type RoomMode,
	type RoomVisibility,
	type TextParams,
} from '@bingo/shared'
import type { GridCell } from './grid'

export interface Room {
	id: string
	code: string
	name: string
	mode: RoomMode
	visibility: RoomVisibility
	passwordHash: string | null
	dictionary: { id: string; code: string; title: string; language: LanguageCode }
	gridSize: number
	freeCenter: boolean
	ownerId: string | null
	createdAt: Date
	lastActivityAt: Date
	closedAt: Date | null
}

export interface Participant {
	id: string
	roomId: string
	name: string
	role: ParticipantRole
	tokenHash: string
	/** Null for spectators. */
	cells: GridCell[] | null
	checked: number[]
	/** Lines already announced: unchecking then rechecking never announces twice. */
	announcedLines: string[]
	fullAt: Date | null
	joinedAt: Date
}

export interface Message {
	id: string
	roomId: string
	kind: MessageKind
	authorId: string | null
	authorName: string | null
	/** Chat text as typed; empty for system and announce messages. */
	text: string
	/** System and announce messages: translated by each client (`feed.<key>`). */
	key: string | null
	params: TextParams | null
	announcement: AnnouncementKind | null
	createdAt: Date
}

export type NewMessage = Omit<Message, 'id'>

export function maxPlayers(room: Pick<Room, 'mode'>): number {
	return room.mode === 'solo' ? 1 : LIMITS.maxPlayersPerRoom
}

export function isClosed(room: Pick<Room, 'closedAt'>): boolean {
	return room.closedAt !== null
}

export interface ProgressChange {
	checked: number[]
	completedLines: string[]
	announcedLines: string[]
	/** Set when the grid just became full. */
	becameFull: boolean
	/** What to tell the room, if anything new was completed. */
	announcement: { kind: AnnouncementKind; lineCount: number } | null
}

/**
 * Compares the new checked cells with what was already announced. Only the
 * most important novelty is announced: a full grid beats a diagonal, which
 * beats a row or a column.
 */
export function evaluateProgress(
	participant: Pick<Participant, 'announcedLines' | 'fullAt'>,
	size: number,
	checked: number[],
): ProgressChange {
	const { completedLines, full } = progressOf(size, checked)
	const announced = new Set(participant.announcedLines)
	const fresh = completedLines.filter((id) => !announced.has(id))
	const becameFull = full && participant.fullAt === null
	const announcedLines = [...announced, ...fresh]

	let kind: AnnouncementKind | null = null
	if (becameFull) kind = 'full'
	else if (fresh.some((id) => lineKind(id) === 'diagonal')) kind = 'diagonal'
	else if (fresh.length > 0) kind = 'line'

	return {
		checked,
		completedLines,
		announcedLines,
		becameFull,
		announcement: kind ? { kind, lineCount: completedLines.length } : null,
	}
}

/**
 * Feed entry of an announcement. The server never words it: every viewer
 * reads it in their own language (`feed.announce.<kind>` on the client).
 */
export function announcementFeed(
	name: string,
	kind: AnnouncementKind,
	lineCount: number,
	rank?: number,
): { key: string; params: TextParams } {
	return {
		key: `announce.${kind}`,
		params: { name, lineCount, ...(rank ? { rank } : {}) },
	}
}
