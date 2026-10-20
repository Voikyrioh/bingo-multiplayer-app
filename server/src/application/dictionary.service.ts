import type { DictionarySummary, DictionaryView, LanguageCode } from '@bingo/shared'
import { dictionaryCode } from '../domain/codes'
import { type DictionaryDraft, validateDictionary } from '../domain/dictionary'
import { notFound } from '../domain/errors'
import type { Random } from '../domain/random'
import type { Clock, DictionaryRepository, IdGenerator } from './ports'
import { dictionarySummary, dictionaryView } from './views'

export interface DictionaryServiceDeps {
	dictionaries: DictionaryRepository
	clock: Clock
	ids: IdGenerator
	random: Random
}

const LISTED_LIMIT = 100

export class DictionaryService {
	constructor(private readonly deps: DictionaryServiceDeps) {}

	/** The language arrives unchecked from the client: the domain validates it. */
	async create(request: DictionaryDraft): Promise<DictionaryView> {
		const draft = validateDictionary(request)
		const { dictionaries, clock, ids, random } = this.deps
		let code = dictionaryCode(random)
		while (await dictionaries.findByCode(code)) code = dictionaryCode(random)
		const dictionary = {
			id: ids.uuid(),
			code,
			...draft,
			featured: false,
			createdAt: clock.now(),
		}
		await dictionaries.create(dictionary)
		return dictionaryView(dictionary)
	}

	async get(code: string): Promise<DictionaryView> {
		const dictionary = await this.deps.dictionaries.findByCode(code)
		if (!dictionary) throw notFound('dictionaryNotFound')
		return dictionaryView(dictionary)
	}

	async listListed(language?: LanguageCode): Promise<DictionarySummary[]> {
		const list = await this.deps.dictionaries.listListed(LISTED_LIMIT, language)
		return list.map(dictionarySummary)
	}
}
