import { describe, expect, it } from 'vitest'
import { draftProblem, emptyDraft, parseEntries } from '../lib/dictionary-draft'

describe('dictionary draft', () => {
	it('parses one entry per line without blanks or duplicates', () => {
		expect(parseEntries('  Un  \n\nDeux\nun\nÉté\nete')).toEqual(['Un', 'Deux', 'Été'])
	})

	it('explains what is missing', () => {
		const draft = { ...emptyDraft(), title: 'Mon bingo', entriesText: 'a\nb\nc' }
		expect(draftProblem({ ...draft, title: '' }, 8)).toMatch(/titre/)
		expect(draftProblem(draft, 24)).toBe('Encore 21 expression(s) pour remplir la grille.')
		const enough = Array.from({ length: 24 }, (_, i) => `e${i}`).join('\n')
		expect(draftProblem({ ...draft, entriesText: enough }, 24)).toBeNull()
	})
})
