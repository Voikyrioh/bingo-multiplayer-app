import pg from 'pg'
import { DictionaryService } from './application/dictionary.service'
import { NameService } from './application/name.service'
import type { DictionaryRepository, NameRepository, RoomRepository } from './application/ports'
import { RoomService } from './application/room.service'
import type { Config } from './config'
import {
	MemoryDictionaryRepository,
	MemoryNameRepository,
	MemoryRoomRepository,
} from './infrastructure/memory/memory.repositories'
import { migrate } from './infrastructure/postgres/migrate'
import {
	PgDictionaryRepository,
	PgNameRepository,
	PgRoomRepository,
} from './infrastructure/postgres/pg.repositories'
import { seed } from './infrastructure/postgres/seed'
import { ConnectionHub } from './infrastructure/realtime/connection-hub'
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher'
import { sha256TokenService } from './infrastructure/security/sha256-token-service'
import { cryptoIds, cryptoRandom, systemClock } from './infrastructure/system/system'
import { logger } from './logger'

/** Composition root: the only place that picks the adapters of each port. */
export interface Container {
	rooms: RoomService
	dictionaries: DictionaryService
	names: NameService
	hub: ConnectionHub
	dispose(): Promise<void>
}

export async function createContainer(config: Config): Promise<Container> {
	let roomRepo: RoomRepository
	let dictionaryRepo: DictionaryRepository
	let names: NameRepository
	let dispose = async () => {}

	if (config.storage.kind === 'postgres') {
		const pool = new pg.Pool({ connectionString: config.storage.url, max: config.storage.poolMax })
		pool.on('error', (error) => logger.error('Postgres pool error', { error: error.message }))
		const applied = await migrate(pool, config.migrationsDir)
		if (applied.length) logger.info('Migrations applied', { applied })
		await seed(pool)
		roomRepo = new PgRoomRepository(pool)
		dictionaryRepo = new PgDictionaryRepository(pool)
		names = new PgNameRepository(pool)
		dispose = () => pool.end()
	} else {
		logger.warn('STORAGE=memory: everything is lost at restart')
		roomRepo = new MemoryRoomRepository()
		dictionaryRepo = new MemoryDictionaryRepository()
		names = new MemoryNameRepository(cryptoRandom)
	}

	const hub = new ConnectionHub()
	const rooms = new RoomService({
		rooms: roomRepo,
		dictionaries: dictionaryRepo,
		names,
		passwords: new ScryptPasswordHasher(),
		tokens: sha256TokenService,
		realtime: hub,
		clock: systemClock,
		ids: cryptoIds,
		random: cryptoRandom,
	})
	const dictionaries = new DictionaryService({
		dictionaries: dictionaryRepo,
		clock: systemClock,
		ids: cryptoIds,
		random: cryptoRandom,
	})
	const nameService = new NameService({ names, dictionaries: dictionaryRepo, rooms: roomRepo })
	return { rooms, dictionaries, names: nameService, hub, dispose }
}
