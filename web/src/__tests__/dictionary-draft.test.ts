import { describe, expect, it } from 'vitest'
import { draftProblem, emptyDraft, parseEntries } from '../lib/dictionary-draft'

describe('dictionary draft', () => {
	it('parses one entry per line without blanks or duplicates', () => {
		expect(parseEntries('  Un  \n\nDeux\nun\nÉté\nete')).toEqual(['Un', 'Deux', 'Été'])
	})

	it('explains what is missing', () => {
		const draft = { ...emptyDraft('fr'), title: 'Mon bingo', entriesText: 'a\nb\nc' }
		expect(draftProblem({ ...draft, title: '' }, 8)?.key).toBe('titleMissing')
		expect(draftProblem(draft, 24)).toEqual({ key: 'missingEntries', params: {}, count: 21 })
		const enough = Array.from({ length: 24 }, (_, i) => `e${i}`).join('\n')
		expect(draftProblem({ ...draft, entriesText: enough }, 24)).toBeNull()
	})
})
