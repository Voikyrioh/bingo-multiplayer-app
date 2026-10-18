import {
	type AnnouncementKind,
	LIMITS,
	lineKind,
	type MessageKind,
	type ParticipantRole,
	progressOf,
	type RoomMode,
	type RoomVisibility,
} from '@bingo/shared'
import type { GridCell } from './grid'

export interface Room {
	id: string
	code: string
	name: string
	mode: RoomMode
	visibility: RoomVisibility
	passwordHash: string | null
	dictionary: { id: string; code: string; title: string }
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
	text: string
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

export function announcementText(
	name: string,
	kind: AnnouncementKind,
	lineCount: number,
	rank?: number,
): string {
	if (kind === 'full') {
		const place = rank === 1 ? '1er carton plein du salon !' : `carton plein n°${rank ?? '?'}`
		return `🏆 ${name} a rempli toute sa grille : ${place}`
	}
	const total = lineCount > 1 ? ` (${lineCount} lignes au total)` : ''
	if (kind === 'diagonal') return `↘️ ${name} a complété une diagonale !${total}`
	return `🎯 ${name} a complété une ligne !${total}`
}
