/**
 * Business limits shared by the server (enforced) and the web client (shown,
 * pre-validated). The server is the only authority: the client mirrors them
 * to give feedback before a round trip.
 */
export const LIMITS = {
	maxPlayersPerRoom: 50,
	maxSpectatorsPerRoom: 50,
	/** A room without any activity for this long is closed. */
	roomInactivityMs: 2 * 24 * 60 * 60 * 1000,
	/** A room nobody is connected to is closed after this grace period (reloads, redeploys). */
	emptyRoomGraceMs: 15 * 60 * 1000,
	gridSizes: [3, 4, 5] as const,
	defaultGridSize: 5,
	nameMin: 1,
	nameMax: 30,
	roomNameMin: 3,
	roomNameMax: 40,
	passwordMin: 3,
	passwordMax: 64,
	dictionaryTitleMin: 3,
	dictionaryTitleMax: 60,
	dictionaryDescriptionMax: 200,
	dictionaryEntriesMin: 8,
	dictionaryEntriesMax: 200,
	entryMax: 80,
	freeSpaceMax: 60,
	chatMessageMax: 300,
	chatHistory: 100,
} as const

export type GridSize = (typeof LIMITS.gridSizes)[number]

export function isGridSize(value: number): value is GridSize {
	return (LIMITS.gridSizes as readonly number[]).includes(value)
}

/** Whether a free center cell is possible (only odd grids have a center). */
export function hasCenter(size: number): boolean {
	return size % 2 === 1
}

/** Number of dictionary entries a grid needs. */
export function entriesNeeded(size: number, freeCenter: boolean): number {
	return size * size - (freeCenter && hasCenter(size) ? 1 : 0)
}
