import { normalizeRoomCode } from '../domain/codes'
import { drawFunnyName } from './funny-names'
import type { DictionaryRepository, NameRepository, RoomRepository } from './ports'

export interface NameServiceDeps {
	names: NameRepository
	dictionaries: DictionaryRepository
	rooms: RoomRepository
}

/** Names for the dice button: themed by the room's (or chosen) dictionary. */
export class NameService {
	constructor(private readonly deps: NameServiceDeps) {}

	async random(context: { roomCode?: string; dictionaryCode?: string } = {}): Promise<string> {
		const { names, dictionaries, rooms } = this.deps
		if (context.roomCode) {
			const room = await rooms.findByCode(normalizeRoomCode(context.roomCode))
			if (room) {
				const taken = (await rooms.listParticipants(room.id)).map((p) => p.name)
				return drawFunnyName(names, taken, room.dictionary.id)
			}
		}
		if (context.dictionaryCode) {
			const dictionary = await dictionaries.findByCode(context.dictionaryCode)
			return drawFunnyName(names, [], dictionary?.id ?? null)
		}
		return drawFunnyName(names, [], null)
	}
}
