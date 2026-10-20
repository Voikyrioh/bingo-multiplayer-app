import { describe, expect, it } from 'vitest'
import { validateDictionary } from '../domain/dictionary'
import { DomainError } from '../domain/errors'
import { centerOf, generateGrid, initialChecked, toggle } from '../domain/grid'
import { cleanName, firstFreeName } from '../domain/names'
import { shuffle } from '../domain/random'
import { announcementFeed, evaluateProgress } from '../domain/room'
import { seededRandom } from './support/fixtures'

const entries = Array.from({ length: 30 }, (_, i) => `Expression ${i + 1}`)

describe('generateGrid', () => {
	it('draws distinct entries and puts the free cell in the center', () => {
		const cells = generateGrid(
			entries,
			{ size: 5, freeCenter: true, freeSpace: null },
			seededRandom(),
		)
		expect(cells).toHaveLength(25)
		// Empty label: the client shows its translated "free cell".
		expect(cells[centerOf(5)]).toEqual({ text: '', free: true })
		const texts = cells.filter((c) => !c.free).map((c) => c.text)
		expect(new Set(texts).size).toBe(24)
		expect(texts.every((t) => entries.includes(t))).toBe(true)
	})

	it('gives different grids to different draws', () => {
		const spec = { size: 5, freeCenter: false, freeSpace: null }
		const a = generateGrid(entries, spec, seededRandom(1)).map((c) => c.text)
		const b = generateGrid(entries, spec, seededRandom(2)).map((c) => c.text)
		expect(a).not.toEqual(b)
	})

	it('ignores the free center on an even grid', () => {
		const cells = generateGrid(
			entries,
			{ size: 4, freeCenter: true, freeSpace: 'X' },
			seededRandom(),
		)
		expect(cells.some((c) => c.free)).toBe(false)
	})

	it('uses the dictionary label for the free cell', () => {
		const cells = generateGrid(
			entries,
			{ size: 3, freeCenter: true, freeSpace: 'Regard grave' },
			seededRandom(),
		)
		expect(cells[4]?.text).toBe('Regard grave')
		expect(initialChecked(cells)).toEqual([4])
	})

	it('refuses a dictionary that is too small', () => {
		expect(() =>
			generateGrid(
				entries.slice(0, 10),
				{ size: 5, freeCenter: true, freeSpace: null },
				seededRandom(),
			),
		).toThrow(DomainError)
	})
})

describe('toggle', () => {
	const cells = generateGrid(
		entries,
		{ size: 3, freeCenter: true, freeSpace: null },
		seededRandom(),
	)

	it('checks then unchecks a cell', () => {
		expect(toggle(cells, [4], 0)).toEqual([0, 4])
		expect(toggle(cells, [0, 4], 0)).toEqual([4])
	})

	it('keeps the free cell checked', () => {
		expect(toggle(cells, [4], 4)).toEqual([4])
	})

	it('refuses a cell outside the grid', () => {
		expect(() => toggle(cells, [], 9)).toThrow('cellNotFound')
	})
})

describe('evaluateProgress', () => {
	const fresh = { announcedLines: [], fullAt: null }

	it('announces a new row', () => {
		const change = evaluateProgress(fresh, 3, [0, 1, 2])
		expect(change.announcement).toEqual({ kind: 'line', lineCount: 1 })
		expect(change.announcedLines).toEqual(['r0'])
	})

	it('prefers the diagonal when a cell completes a row and a diagonal', () => {
		const change = evaluateProgress(fresh, 3, [0, 1, 2, 4, 8])
		expect(change.announcement?.kind).toBe('diagonal')
		expect(change.announcement?.lineCount).toBe(2)
	})

	it('never announces the same line twice', () => {
		const change = evaluateProgress({ announcedLines: ['r0'], fullAt: null }, 3, [0, 1, 2])
		expect(change.announcement).toBeNull()
	})

	it('announces a full grid once', () => {
		const all = [0, 1, 2, 3, 4, 5, 6, 7, 8]
		expect(evaluateProgress(fresh, 3, all).becameFull).toBe(true)
		expect(evaluateProgress(fresh, 3, all).announcement?.kind).toBe('full')
		const again = evaluateProgress({ announcedLines: [], fullAt: new Date() }, 3, all)
		expect(again.becameFull).toBe(false)
		expect(again.announcement?.kind).toBe('diagonal')
	})

	it('describes announcements as translation keys, never as text', () => {
		expect(announcementFeed('Bob', 'full', 12, 1)).toEqual({
			key: 'announce.full',
			params: { name: 'Bob', lineCount: 12, rank: 1 },
		})
		expect(announcementFeed('Bob', 'line', 2)).toEqual({
			key: 'announce.line',
			params: { name: 'Bob', lineCount: 2 },
		})
	})
})

describe('validateDictionary', () => {
	const draft = { language: 'fr', title: '  Mon  bingo ', entries, isPublic: true }

	it('cleans the title and drops empty or duplicate entries', () => {
		const valid = validateDictionary({
			...draft,
			entries: [...entries, '', '  expression 1 ', 'Éxpression 2'],
		})
		expect(valid.title).toBe('Mon bingo')
		expect(valid.entries).toHaveLength(30)
		expect(valid.freeSpace).toBeNull()
		expect(valid.language).toBe('fr')
	})

	it('requires a supported language', () => {
		expect(() => validateDictionary({ ...draft, language: 'xx' })).toThrow(
			'dictionaryLanguageInvalid',
		)
		expect(validateDictionary({ ...draft, language: 'de' }).language).toBe('de')
	})

	it('requires enough entries', () => {
		expect(() => validateDictionary({ ...draft, entries: ['a', 'b'] })).toThrow(
			'dictionaryTooFewEntries',
		)
	})

	it('refuses a too long entry', () => {
		expect(() => validateDictionary({ ...draft, entries: [...entries, 'x'.repeat(81)] })).toThrow()
	})
})

describe('names', () => {
	it('returns null for an empty name (a funny one will be drawn)', () => {
		expect(cleanName('   ')).toBeNull()
		expect(cleanName(' Bob ')).toBe('Bob')
	})

	it('picks a free candidate, or numbers it', () => {
		expect(firstFreeName(['Raclette', 'Tartine'], ['raclette'])).toBe('Tartine')
		expect(firstFreeName(['Raclette'], ['Raclette', 'Raclette 2'])).toBe('Raclette 3')
	})
})

describe('shuffle', () => {
	it('keeps every item', () => {
		expect(shuffle([1, 2, 3, 4], seededRandom()).sort()).toEqual([1, 2, 3, 4])
	})
})
