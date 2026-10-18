import type pg from 'pg'
import type {
	DictionaryRepository,
	NameRepository,
	OpenRoomRow,
	RoomRepository,
} from '../../application/ports'
import type { Dictionary } from '../../domain/dictionary'
import type { Message, NewMessage, Participant, Room } from '../../domain/room'

/**
 * Postgres adapters (node-postgres, plain SQL). jsonb columns come back
 * parsed, timestamptz as Date, bigserial as string.
 */

interface DictionaryRow {
	id: string
	code: string
	title: string
	description: string
	entries: string[]
	free_space: string | null
	is_public: boolean
	featured: boolean
	created_at: Date
}

const toDictionary = (r: DictionaryRow): Dictionary => ({
	id: r.id,
	code: r.code,
	title: r.title,
	description: r.description,
	entries: r.entries,
	freeSpace: r.free_space,
	isPublic: r.is_public,
	featured: r.featured,
	createdAt: r.created_at,
})

export class PgDictionaryRepository implements DictionaryRepository {
	constructor(private readonly pool: pg.Pool) {}

	async create(d: Dictionary) {
		await this.pool.query(
			`INSERT INTO dictionaries (id, code, title, description, entries, free_space, is_public, featured, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			[
				d.id,
				d.code,
				d.title,
				d.description,
				JSON.stringify(d.entries),
				d.freeSpace,
				d.isPublic,
				d.featured,
				d.createdAt,
			],
		)
	}

	async findByCode(code: string) {
		const { rows } = await this.pool.query<DictionaryRow>(
			'SELECT * FROM dictionaries WHERE code = $1',
			[code],
		)
		return rows[0] ? toDictionary(rows[0]) : null
	}

	async findById(id: string) {
		const { rows } = await this.pool.query<DictionaryRow>(
			'SELECT * FROM dictionaries WHERE id = $1',
			[id],
		)
		return rows[0] ? toDictionary(rows[0]) : null
	}

	async listListed(limit: number) {
		const { rows } = await this.pool.query<DictionaryRow>(
			`SELECT * FROM dictionaries WHERE is_public OR featured
			 ORDER BY featured DESC, created_at DESC LIMIT $1`,
			[limit],
		)
		return rows.map(toDictionary)
	}
}

export class PgNameRepository implements NameRepository {
	constructor(private readonly pool: pg.Pool) {}

	async sample(count: number) {
		const { rows } = await this.pool.query<{ name: string }>(
			'SELECT name FROM funny_names ORDER BY random() LIMIT $1',
			[count],
		)
		return rows.map((r) => r.name)
	}
}

interface RoomRow {
	id: string
	code: string
	name: string
	mode: Room['mode']
	visibility: Room['visibility']
	password_hash: string | null
	dictionary_id: string
	dictionary_code: string
	dictionary_title: string
	grid_size: number
	free_center: boolean
	owner_id: string | null
	created_at: Date
	last_activity_at: Date
	closed_at: Date | null
}

const ROOM_SELECT = `SELECT r.*, d.code AS dictionary_code, d.title AS dictionary_title
	FROM rooms r JOIN dictionaries d ON d.id = r.dictionary_id`

const toRoom = (r: RoomRow): Room => ({
	id: r.id,
	code: r.code,
	name: r.name,
	mode: r.mode,
	visibility: r.visibility,
	passwordHash: r.password_hash,
	dictionary: { id: r.dictionary_id, code: r.dictionary_code, title: r.dictionary_title },
	gridSize: r.grid_size,
	freeCenter: r.free_center,
	ownerId: r.owner_id,
	createdAt: r.created_at,
	lastActivityAt: r.last_activity_at,
	closedAt: r.closed_at,
})

interface ParticipantRow {
	id: string
	room_id: string
	name: string
	role: Participant['role']
	token_hash: string
	cells: Participant['cells']
	checked: number[]
	announced_lines: string[]
	full_at: Date | null
	joined_at: Date
}

const toParticipant = (r: ParticipantRow): Participant => ({
	id: r.id,
	roomId: r.room_id,
	name: r.name,
	role: r.role,
	tokenHash: r.token_hash,
	cells: r.cells,
	checked: r.checked,
	announcedLines: r.announced_lines,
	fullAt: r.full_at,
	joinedAt: r.joined_at,
})

interface MessageRow {
	id: string
	room_id: string
	kind: Message['kind']
	author_id: string | null
	author_name: string | null
	text: string
	announcement: Message['announcement']
	created_at: Date
}

const toMessage = (r: MessageRow): Message => ({
	id: String(r.id),
	roomId: r.room_id,
	kind: r.kind,
	authorId: r.author_id,
	authorName: r.author_name,
	text: r.text,
	announcement: r.announcement,
	createdAt: r.created_at,
})

export class PgRoomRepository implements RoomRepository {
	constructor(private readonly pool: pg.Pool) {}

	async create(room: Room, owner: Participant) {
		const client = await this.pool.connect()
		try {
			await client.query('BEGIN')
			await client.query(
				`INSERT INTO rooms (id, code, name, mode, visibility, password_hash, dictionary_id, grid_size,
					free_center, owner_id, created_at, last_activity_at, closed_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
				[
					room.id,
					room.code,
					room.name,
					room.mode,
					room.visibility,
					room.passwordHash,
					room.dictionary.id,
					room.gridSize,
					room.freeCenter,
					room.ownerId,
					room.createdAt,
					room.lastActivityAt,
					room.closedAt,
				],
			)
			await insertParticipant(client, owner)
			await client.query('COMMIT')
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	}

	async findByCode(code: string) {
		const { rows } = await this.pool.query<RoomRow>(`${ROOM_SELECT} WHERE r.code = $1`, [code])
		return rows[0] ? toRoom(rows[0]) : null
	}

	async findById(id: string) {
		const { rows } = await this.pool.query<RoomRow>(`${ROOM_SELECT} WHERE r.id = $1`, [id])
		return rows[0] ? toRoom(rows[0]) : null
	}

	async update(room: Room) {
		await this.pool.query(
			'UPDATE rooms SET name = $2, owner_id = $3, last_activity_at = $4, closed_at = $5 WHERE id = $1',
			[room.id, room.name, room.ownerId, room.lastActivityAt, room.closedAt],
		)
	}

	async listOpenPublic(limit: number): Promise<OpenRoomRow[]> {
		const { rows } = await this.pool.query<RoomRow & { players: number; spectators: number }>(
			`SELECT r.*, d.code AS dictionary_code, d.title AS dictionary_title,
				count(p.id) FILTER (WHERE p.role = 'player')::int AS players,
				count(p.id) FILTER (WHERE p.role = 'spectator')::int AS spectators
			 FROM rooms r
			 JOIN dictionaries d ON d.id = r.dictionary_id
			 LEFT JOIN participants p ON p.room_id = r.id
			 WHERE r.closed_at IS NULL AND r.visibility = 'public' AND r.mode = 'multi'
			 GROUP BY r.id, d.code, d.title
			 ORDER BY players DESC, r.last_activity_at DESC
			 LIMIT $1`,
			[limit],
		)
		return rows.map((r) => ({ room: toRoom(r), players: r.players, spectators: r.spectators }))
	}

	async listOpen() {
		const { rows } = await this.pool.query<RoomRow>(`${ROOM_SELECT} WHERE r.closed_at IS NULL`)
		return rows.map(toRoom)
	}

	async countParticipants(roomId: string) {
		const { rows } = await this.pool.query<{ players: number; spectators: number }>(
			`SELECT count(*) FILTER (WHERE role = 'player')::int AS players,
				count(*) FILTER (WHERE role = 'spectator')::int AS spectators
			 FROM participants WHERE room_id = $1`,
			[roomId],
		)
		return rows[0] ?? { players: 0, spectators: 0 }
	}

	async purgeClosedBefore(date: Date) {
		const { rowCount } = await this.pool.query(
			'DELETE FROM rooms WHERE closed_at IS NOT NULL AND closed_at < $1',
			[date],
		)
		return rowCount ?? 0
	}

	async addParticipant(participant: Participant) {
		await insertParticipant(this.pool, participant)
	}

	async findParticipant(participantId: string) {
		const { rows } = await this.pool.query<ParticipantRow>(
			'SELECT * FROM participants WHERE id = $1',
			[participantId],
		)
		return rows[0] ? toParticipant(rows[0]) : null
	}

	async findParticipantByTokenHash(tokenHash: string) {
		const { rows } = await this.pool.query<ParticipantRow>(
			'SELECT * FROM participants WHERE token_hash = $1',
			[tokenHash],
		)
		return rows[0] ? toParticipant(rows[0]) : null
	}

	async listParticipants(roomId: string) {
		const { rows } = await this.pool.query<ParticipantRow>(
			'SELECT * FROM participants WHERE room_id = $1 ORDER BY joined_at, id',
			[roomId],
		)
		return rows.map(toParticipant)
	}

	async saveProgress(participant: Participant) {
		await this.pool.query(
			'UPDATE participants SET checked = $2, announced_lines = $3, full_at = $4 WHERE id = $1',
			[
				participant.id,
				JSON.stringify(participant.checked),
				JSON.stringify(participant.announcedLines),
				participant.fullAt,
			],
		)
	}

	async removeParticipant(participantId: string) {
		await this.pool.query('DELETE FROM participants WHERE id = $1', [participantId])
	}

	async addMessage(message: NewMessage) {
		const { rows } = await this.pool.query<MessageRow>(
			`INSERT INTO messages (room_id, kind, author_id, author_name, text, announcement, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
			[
				message.roomId,
				message.kind,
				message.authorId,
				message.authorName,
				message.text,
				message.announcement,
				message.createdAt,
			],
		)
		return toMessage(rows[0] as MessageRow)
	}

	async listMessages(roomId: string, limit: number) {
		const { rows } = await this.pool.query<MessageRow>(
			`SELECT * FROM (SELECT * FROM messages WHERE room_id = $1 ORDER BY id DESC LIMIT $2) recent
			 ORDER BY id`,
			[roomId, limit],
		)
		return rows.map(toMessage)
	}
}

async function insertParticipant(db: pg.Pool | pg.PoolClient, p: Participant) {
	await db.query(
		`INSERT INTO participants (id, room_id, name, role, token_hash, cells, checked, announced_lines, full_at, joined_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		[
			p.id,
			p.roomId,
			p.name,
			p.role,
			p.tokenHash,
			p.cells ? JSON.stringify(p.cells) : null,
			JSON.stringify(p.checked),
			JSON.stringify(p.announcedLines),
			p.fullAt,
			p.joinedAt,
		],
	)
}
