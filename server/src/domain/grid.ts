import { entriesNeeded, type GridCellView, hasCenter } from '@bingo/shared'
import { validation } from './errors'
import { type Random, shuffle } from './random'

export type GridCell = GridCellView

export const DEFAULT_FREE_SPACE = 'Case gratuite ⭐'

export interface GridSpec {
	size: number
	freeCenter: boolean
	freeSpace: string | null
}

export function centerOf(size: number): number {
	return Math.floor((size * size) / 2)
}

/** Whether a grid with this spec really has a free center (odd sizes only). */
export function usesFreeCenter(spec: Pick<GridSpec, 'size' | 'freeCenter'>): boolean {
	return spec.freeCenter && hasCenter(spec.size)
}

/**
 * Draws a random grid out of the dictionary entries: every player of a room
 * gets the same dictionary but a different grid.
 */
export function generateGrid(
	entries: readonly string[],
	spec: GridSpec,
	random: Random,
): GridCell[] {
	const needed = entriesNeeded(spec.size, spec.freeCenter)
	if (entries.length < needed) {
		throw validation(
			`Ce dictionnaire a ${entries.length} expressions, il en faut ${needed} pour une grille ${spec.size}×${spec.size}.`,
		)
	}
	const drawn = shuffle(entries, random).slice(0, needed)
	const cells: GridCell[] = drawn.map((text) => ({ text, free: false }))
	if (usesFreeCenter(spec)) {
		cells.splice(centerOf(spec.size), 0, { text: spec.freeSpace ?? DEFAULT_FREE_SPACE, free: true })
	}
	return cells
}

/** Cells checked at the start: the free cell, if any. */
export function initialChecked(cells: readonly GridCell[]): number[] {
	return cells.flatMap((cell, index) => (cell.free ? [index] : []))
}

/** Checks or unchecks a cell. A free cell stays checked. Returns sorted indexes. */
export function toggle(
	cells: readonly GridCell[],
	checked: readonly number[],
	cell: number,
): number[] {
	if (!Number.isInteger(cell) || cell < 0 || cell >= cells.length) {
		throw validation('Cette case n’existe pas.')
	}
	if (cells[cell]?.free) return [...checked]
	const set = new Set(checked)
	if (set.has(cell)) set.delete(cell)
	else set.add(cell)
	return [...set].sort((a, b) => a - b)
}
