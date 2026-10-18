import type {
	CloseReason,
	MessageView,
	ParticipantView,
	RoomView,
	ServerMessage,
} from '@bingo/shared'
import { LIMITS, progressOf } from '@bingo/shared'

export interface RoomState {
	ready: boolean
	me: string | null
	room: RoomView | null
	participants: ParticipantView[]
	messages: MessageView[]
	closed: CloseReason | null
	kicked: boolean
	/** Events received before the first snapshot, replayed after it. */
	early: ServerMessage[]
}

export function emptyRoomState(): RoomState {
	return {
		ready: false,
		me: null,
		room: null,
		participants: [],
		messages: [],
		closed: null,
		kicked: false,
		early: [],
	}
}

/**
 * Applies a server message to the state (mutates it: the state is a Vue
 * reactive object). Every event is idempotent, so replaying an event that the
 * snapshot already contains is harmless.
 */
export function applyServerMessage(state: RoomState, message: ServerMessage): void {
	if (message.type === 'snapshot') {
		state.ready = true
		state.me = message.me
		state.room = message.room
		state.participants = message.participants
		state.messages = message.messages
		const early = state.early
		state.early = []
		for (const event of early) applyServerMessage(state, event)
		return
	}
	if (!state.ready && message.type !== 'kicked' && message.type !== 'room:closed') {
		state.early.push(message)
		return
	}
	switch (message.type) {
		case 'participant:joined': {
			const index = state.participants.findIndex((p) => p.id === message.participant.id)
			if (index >= 0) state.participants[index] = message.participant
			else state.participants.push(message.participant)
			return
		}
		case 'participant:left':
			state.participants = state.participants.filter((p) => p.id !== message.participantId)
			return
		case 'participant:progress': {
			const p = state.participants.find((x) => x.id === message.participantId)
			if (!p) return
			p.checked = message.checked
			p.completedLines = message.completedLines
			p.fullAt = message.fullAt
			return
		}
		case 'participant:presence': {
			const p = state.participants.find((x) => x.id === message.participantId)
			if (p) p.online = message.online
			return
		}
		case 'room:updated': {
			state.room = message.room
			for (const p of state.participants) p.isOwner = p.id === message.room.ownerId
			return
		}
		case 'room:closed':
			state.closed = message.reason
			return
		case 'kicked':
			state.kicked = true
			return
		case 'message':
			if (state.messages.some((m) => m.id === message.message.id)) return
			state.messages.push(message.message)
			if (state.messages.length > LIMITS.chatHistory * 2)
				state.messages.splice(0, LIMITS.chatHistory)
			return
		default:
			return
	}
}

/** Optimistic toggle of my own cell, before the server confirms it. */
export function toggleLocally(state: RoomState, cell: number): boolean {
	const me = state.participants.find((p) => p.id === state.me)
	if (!me?.cells || !state.room || me.cells[cell]?.free) return false
	const set = new Set(me.checked)
	if (set.has(cell)) set.delete(cell)
	else set.add(cell)
	me.checked = [...set].sort((a, b) => a - b)
	me.completedLines = progressOf(state.room.gridSize, me.checked).completedLines
	return true
}

/** Players first (full grids, then most lines, then most cells), spectators last. */
export function ranking(participants: ParticipantView[]): ParticipantView[] {
	return [...participants].sort((a, b) => {
		if (a.role !== b.role) return a.role === 'player' ? -1 : 1
		if (a.fullAt || b.fullAt) {
			if (!a.fullAt) return 1
			if (!b.fullAt) return -1
			return a.fullAt.localeCompare(b.fullAt)
		}
		return (
			b.completedLines.length - a.completedLines.length ||
			b.checked.length - a.checked.length ||
			a.joinedAt.localeCompare(b.joinedAt)
		)
	})
}
