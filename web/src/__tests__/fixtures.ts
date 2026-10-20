import type { ParticipantView, RoomView } from '@bingo/shared'

export const room: RoomView = {
	code: 'ABC234',
	name: 'Salon test',
	mode: 'multi',
	visibility: 'public',
	hasPassword: false,
	gridSize: 3,
	freeCenter: true,
	ownerId: 'alice',
	dictionary: { code: 'discours-macron', title: 'Discours', language: 'fr' },
	createdAt: '2026-10-18T20:00:00.000Z',
	maxPlayers: 50,
}

export const cells = Array.from({ length: 9 }, (_, i) =>
	i === 4 ? { text: 'Gratuit', free: true } : { text: `Expression ${i}`, free: false },
)

export function participant(id: string, overrides: Partial<ParticipantView> = {}): ParticipantView {
	return {
		id,
		name: id[0]?.toUpperCase() + id.slice(1),
		role: 'player',
		isOwner: id === 'alice',
		online: true,
		cells,
		checked: [4],
		completedLines: [],
		fullAt: null,
		joinedAt: `2026-10-18T20:00:0${id.length}.000Z`,
		...overrides,
	}
}
