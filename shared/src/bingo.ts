/**
 * Pure bingo rules: which lines exist on a square grid and which ones a set of
 * checked cells completes. Cells are indexed row by row, from 0 to size² - 1.
 */

export type LineKind = 'row' | 'column' | 'diagonal'

export interface Line {
	/** Stable identifier: r0..rN, c0..cN, d0 (top-left → bottom-right), d1. */
	id: string
	kind: LineKind
	cells: number[]
}

const cache = new Map<number, Line[]>()

export function linesOf(size: number): Line[] {
	const cached = cache.get(size)
	if (cached) return cached
	const lines: Line[] = []
	const range = Array.from({ length: size }, (_, i) => i)
	for (const r of range) {
		lines.push({ id: `r${r}`, kind: 'row', cells: range.map((c) => r * size + c) })
	}
	for (const c of range) {
		lines.push({ id: `c${c}`, kind: 'column', cells: range.map((r) => r * size + c) })
	}
	lines.push({ id: 'd0', kind: 'diagonal', cells: range.map((i) => i * size + i) })
	lines.push({ id: 'd1', kind: 'diagonal', cells: range.map((i) => i * size + (size - 1 - i)) })
	cache.set(size, lines)
	return lines
}

export interface Progress {
	/** Ids of every complete line (rows, columns, diagonals). */
	completedLines: string[]
	/** Every cell is checked. */
	full: boolean
}

export function progressOf(size: number, checked: Iterable<number>): Progress {
	const set = checked instanceof Set ? (checked as Set<number>) : new Set(checked)
	const completedLines = linesOf(size)
		.filter((line) => line.cells.every((cell) => set.has(cell)))
		.map((line) => line.id)
	return { completedLines, full: set.size >= size * size }
}

export function lineKind(id: string): LineKind {
	if (id.startsWith('r')) return 'row'
	if (id.startsWith('c')) return 'column'
	return 'diagonal'
}

/** Cells that belong to at least one completed line (to highlight them). */
export function cellsInLines(size: number, lineIds: Iterable<string>): Set<number> {
	const wanted = new Set(lineIds)
	const cells = new Set<number>()
	for (const line of linesOf(size)) {
		if (!wanted.has(line.id)) continue
		for (const cell of line.cells) cells.add(cell)
	}
	return cells
}
