import { describe, expect, it } from 'vitest'
import { cellsInLines, lineKind, linesOf, progressOf } from '../bingo'
import { entriesNeeded, hasCenter } from '../limits'

describe('linesOf', () => {
	it('lists rows, columns and both diagonals', () => {
		const lines = linesOf(5)
		expect(lines).toHaveLength(12)
		expect(lines.filter((l) => l.kind === 'row')).toHaveLength(5)
		expect(lines.filter((l) => l.kind === 'column')).toHaveLength(5)
		expect(lines.find((l) => l.id === 'd0')?.cells).toEqual([0, 6, 12, 18, 24])
		expect(lines.find((l) => l.id === 'd1')?.cells).toEqual([4, 8, 12, 16, 20])
	})

	it('works for a 3x3 grid', () => {
		const lines = linesOf(3)
		expect(lines).toHaveLength(8)
		expect(lines.find((l) => l.id === 'c1')?.cells).toEqual([1, 4, 7])
	})
})

describe('progressOf', () => {
	it('finds nothing on an empty grid', () => {
		expect(progressOf(5, [])).toEqual({ completedLines: [], full: false })
	})

	it('detects a row, a column and a diagonal', () => {
		expect(progressOf(5, [0, 1, 2, 3, 4]).completedLines).toEqual(['r0'])
		expect(progressOf(5, [2, 7, 12, 17, 22]).completedLines).toEqual(['c2'])
		expect(progressOf(5, [4, 8, 12, 16, 20]).completedLines).toEqual(['d1'])
	})

	it('detects a full grid with all its lines', () => {
		const all = Array.from({ length: 16 }, (_, i) => i)
		const progress = progressOf(4, all)
		expect(progress.full).toBe(true)
		expect(progress.completedLines).toHaveLength(10)
	})

	it('accepts a Set', () => {
		expect(progressOf(3, new Set([0, 4, 8])).completedLines).toEqual(['d0'])
	})
})

describe('helpers', () => {
	it('gives the kind of a line id', () => {
		expect(lineKind('r3')).toBe('row')
		expect(lineKind('c0')).toBe('column')
		expect(lineKind('d1')).toBe('diagonal')
	})

	it('collects the cells of completed lines', () => {
		expect([...cellsInLines(3, ['r0', 'c0'])].sort()).toEqual([0, 1, 2, 3, 6])
	})

	it('computes the number of entries a grid needs', () => {
		expect(entriesNeeded(5, true)).toBe(24)
		expect(entriesNeeded(5, false)).toBe(25)
		expect(entriesNeeded(4, true)).toBe(16)
		expect(hasCenter(4)).toBe(false)
	})
})
