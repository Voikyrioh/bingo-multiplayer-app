/**
 * Contract between the web client and the server: REST payloads and the
 * WebSocket messages of a room. Any change here is a protocol change.
 */

export type RoomMode = 'multi' | 'solo'
export type RoomVisibility = 'public' | 'unlisted'
export type ParticipantRole = 'player' | 'spectator'

// ---------- REST ----------

export interface DictionarySummary {
	code: string
	title: string
	description: string
	entryCount: number
	featured: boolean
}

export interface DictionaryView extends DictionarySummary {
	entries: string[]
	freeSpace: string | null
	createdAt: string
}

export interface CreateDictionaryRequest {
	title: string
	description?: string
	entries: string[]
	freeSpace?: string | null
	isPublic: boolean
}

export interface RoomSummary {
	code: string
	name: string
	dictionaryTitle: string
	gridSize: number
	hasPassword: boolean
	players: number
	spectators: number
	maxPlayers: number
	createdAt: string
	lastActivityAt: string
}

export interface RoomPreview extends RoomSummary {
	mode: RoomMode
	visibility: RoomVisibility
	closed: boolean
}

export interface CreateRoomRequest {
	name: string
	mode: RoomMode
	visibility: RoomVisibility
	password?: string | null
	dictionaryCode: string
	gridSize: number
	freeCenter: boolean
	ownerName?: string | null
}

export interface JoinRoomRequest {
	name?: string | null
	password?: string | null
	role: ParticipantRole
}

/** Returned by room creation and join: the token authenticates the WebSocket. */
export interface Membership {
	roomCode: string
	participantId: string
	name: string
	role: ParticipantRole
	token: string
}

export interface ApiError {
	code: string
	message: string
}

// ---------- Views shared by REST and WebSocket ----------

export interface GridCellView {
	text: string
	free: boolean
}

export interface ParticipantView {
	id: string
	name: string
	role: ParticipantRole
	isOwner: boolean
	online: boolean
	/** Null for spectators. */
	cells: GridCellView[] | null
	checked: number[]
	completedLines: string[]
	fullAt: string | null
	joinedAt: string
}

export interface RoomView {
	code: string
	name: string
	mode: RoomMode
	visibility: RoomVisibility
	hasPassword: boolean
	gridSize: number
	freeCenter: boolean
	ownerId: string | null
	dictionary: { code: string; title: string }
	createdAt: string
	maxPlayers: number
}

export type MessageKind = 'chat' | 'system' | 'announce'

export type AnnouncementKind = 'line' | 'diagonal' | 'full'

export interface MessageView {
	id: string
	kind: MessageKind
	authorId: string | null
	authorName: string | null
	text: string
	createdAt: string
	/** Only for kind = announce. */
	announcement?: AnnouncementKind
}

export interface Announcement {
	participantId: string
	name: string
	kind: AnnouncementKind
	/** Lines completed so far by this participant (rows + columns + diagonals). */
	lineCount: number
	/** 1 for the first full grid of the room, 2 for the second... (kind = full). */
	rank?: number
}

// ---------- WebSocket ----------

export type ClientMessage =
	| { type: 'auth'; token: string }
	| { type: 'toggle'; cell: number }
	| { type: 'chat'; text: string }
	| { type: 'kick'; participantId: string }
	| { type: 'leave' }
	/** Asks for a fresh snapshot (after an error, to drop optimistic changes). */
	| { type: 'sync' }
	| { type: 'ping' }

export type CloseReason = 'inactive' | 'empty'

export type ServerMessage =
	| {
			type: 'snapshot'
			me: string
			room: RoomView
			participants: ParticipantView[]
			messages: MessageView[]
	  }
	| { type: 'participant:joined'; participant: ParticipantView }
	| { type: 'participant:left'; participantId: string; reason: 'left' | 'kicked' }
	| {
			type: 'participant:progress'
			participantId: string
			checked: number[]
			completedLines: string[]
			fullAt: string | null
	  }
	| { type: 'participant:presence'; participantId: string; online: boolean }
	| { type: 'room:updated'; room: RoomView }
	| { type: 'room:closed'; reason: CloseReason }
	| { type: 'message'; message: MessageView }
	| { type: 'announce'; announcement: Announcement }
	| { type: 'kicked' }
	| { type: 'error'; code: string; message: string }
	| { type: 'pong' }

/** WebSocket close codes (4000-4999 are free for applications). */
export const CLOSE_CODES = {
	unauthorized: 4001,
	kicked: 4003,
	roomClosed: 4004,
	replaced: 4005,
	left: 4006,
} as const
