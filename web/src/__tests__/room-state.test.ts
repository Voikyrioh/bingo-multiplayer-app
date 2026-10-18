import { describe, expect, it } from 'vitest'
import { applyServerMessage, emptyRoomState, ranking, toggleLocally } from '../lib/room-state'
import { participant, room } from './fixtures'

function liveState() {
	const state = emptyRoomState()
	applyServerMessage(state, {
		type: 'snapshot',
		me: 'bob',
		room,
		participants: [participant('alice'), participant('bob')],
		messages: [],
	})
	return state
}

describe('applyServerMessage', () => {
	it('buffers events received before the snapshot and replays them', () => {
		const state = emptyRoomState()
		applyServerMessage(state, { type: 'participant:joined', participant: participant('chloe') })
		expect(state.participants).toHaveLength(0)
		applyServerMessage(state, {
			type: 'snapshot',
			me: 'bob',
			room,
			participants: [participant('alice'), participant('bob'), participant('chloe')],
			messages: [],
		})
		expect(state.ready).toBe(true)
		expect(state.participants.map((p) => p.id)).toEqual(['alice', 'bob', 'chloe'])
	})

	it('applies progress, presence and departures', () => {
		const state = liveState()
		applyServerMessage(state, {
			type: 'participant:progress',
			participantId: 'alice',
			checked: [0, 1, 2, 4],
			completedLines: ['r0'],
			fullAt: null,
		})
		applyServerMessage(state, { type: 'participant:presence', participantId: 'bob', online: false })
		expect(state.participants[0]?.completedLines).toEqual(['r0'])
		expect(state.participants[1]?.online).toBe(false)
		applyServerMessage(state, {
			type: 'participant:left',
			participantId: 'alice',
			reason: 'kicked',
		})
		expect(state.participants.map((p) => p.id)).toEqual(['bob'])
	})

	it('ignores a message it already has', () => {
		const state = liveState()
		const message = {
			id: '7',
			kind: 'chat' as const,
			authorId: 'alice',
			authorName: 'Alice',
			text: 'Salut',
			createdAt: '2026-10-18T20:01:00.000Z',
		}
		applyServerMessage(state, { type: 'message', message })
		applyServerMessage(state, { type: 'message', message })
		expect(state.messages).toHaveLength(1)
	})

	it('moves the crown when the owner changes', () => {
		const state = liveState()
		applyServerMessage(state, { type: 'room:updated', room: { ...room, ownerId: 'bob' } })
		expect(state.participants.find((p) => p.isOwner)?.id).toBe('bob')
	})

	it('records kicks and closings even before the snapshot', () => {
		const state = emptyRoomState()
		applyServerMessage(state, { type: 'kicked' })
		applyServerMessage(state, { type: 'room:closed', reason: 'inactive' })
		expect(state.kicked).toBe(true)
		expect(state.closed).toBe('inactive')
	})
})

describe('toggleLocally', () => {
	it('checks my cell and computes the lines', () => {
		const state = liveState()
		for (const cell of [0, 8]) toggleLocally(state, cell)
		const me = state.participants.find((p) => p.id === 'bob')
		expect(me?.checked).toEqual([0, 4, 8])
		expect(me?.completedLines).toEqual(['d0'])
	})

	it('never unchecks the free cell', () => {
		const state = liveState()
		expect(toggleLocally(state, 4)).toBe(false)
	})
})

describe('ranking', () => {
	it('puts full grids first, then lines, then spectators', () => {
		const list = ranking([
			participant('zoe', { role: 'spectator', cells: null }),
			participant('bob', { completedLines: ['r0'] }),
			participant('alice', { fullAt: '2026-10-18T20:10:00.000Z' }),
			participant('chloe'),
		])
		expect(list.map((p) => p.id)).toEqual(['alice', 'bob', 'chloe', 'zoe'])
	})
})
