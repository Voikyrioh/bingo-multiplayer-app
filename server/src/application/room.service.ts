import {
	CLOSE_CODES,
	type CloseReason,
	type CreateRoomRequest,
	entriesNeeded,
	hasCenter,
	isGridSize,
	type JoinRoomRequest,
	LIMITS,
	type Membership,
	type ParticipantRole,
	type RoomPreview,
	type RoomSummary,
	type ServerMessage,
} from '@bingo/shared'
import { normalizeRoomCode, roomCode } from '../domain/codes'
import { DomainError, forbidden, notFound, validation } from '../domain/errors'
import { generateGrid, initialChecked, toggle } from '../domain/grid'
import { cleanName, isNameTaken } from '../domain/names'
import type { Random } from '../domain/random'
import {
	announcementText,
	evaluateProgress,
	isClosed,
	maxPlayers,
	type NewMessage,
	type Participant,
	type Room,
} from '../domain/room'
import { cleanText } from '../domain/text'
import { drawFunnyName } from './funny-names'
import { KeyedMutex } from './keyed-mutex'
import type {
	Clock,
	DictionaryRepository,
	IdGenerator,
	NameRepository,
	PasswordHasher,
	RealtimeGateway,
	RoomRepository,
	TokenService,
} from './ports'
import { messageView, participantView, roomSummary, roomView } from './views'

export interface RoomServiceDeps {
	rooms: RoomRepository
	dictionaries: DictionaryRepository
	names: NameRepository
	passwords: PasswordHasher
	tokens: TokenService
	realtime: RealtimeGateway
	clock: Clock
	ids: IdGenerator
	random: Random
}

/** Who is talking on a WebSocket, once its token is verified. */
export interface Session {
	roomId: string
	participantId: string
}

const PUBLIC_LIST_LIMIT = 100
const CHAT_WINDOW_MS = 10_000
const CHAT_MAX_PER_WINDOW = 8
/** Activity is written at most once per minute (a toggle is not worth a write each). */
const ACTIVITY_WRITE_INTERVAL_MS = 60_000
const PURGE_CLOSED_AFTER_MS = 7 * 24 * 60 * 60 * 1000

export class RoomService {
	private readonly mutex = new KeyedMutex()
	/** Room id → time the last connection left. Rooms absent here are empty since boot. */
	private readonly emptySince = new Map<string, number>()
	private readonly chatHistory = new Map<string, number[]>()
	private readonly bootedAt: number

	constructor(private readonly deps: RoomServiceDeps) {
		this.bootedAt = deps.clock.now().getTime()
	}

	// ---------- REST use cases ----------

	async create(request: CreateRoomRequest): Promise<Membership> {
		const { rooms, dictionaries, passwords, clock, ids, random } = this.deps
		const solo = request.mode === 'solo'
		const name = cleanText(request.name)
		if (name.length < LIMITS.roomNameMin || name.length > LIMITS.roomNameMax) {
			throw validation(
				`Le nom du salon doit faire entre ${LIMITS.roomNameMin} et ${LIMITS.roomNameMax} caractères.`,
			)
		}
		if (!isGridSize(request.gridSize)) throw validation('Taille de grille invalide.')
		const password = solo ? null : request.password || null
		if (
			password !== null &&
			(password.length < LIMITS.passwordMin || password.length > LIMITS.passwordMax)
		) {
			throw validation(
				`Le mot de passe doit faire entre ${LIMITS.passwordMin} et ${LIMITS.passwordMax} caractères.`,
			)
		}
		const dictionary = await dictionaries.findByCode(request.dictionaryCode)
		if (!dictionary) throw notFound('Ce dictionnaire n’existe pas.')
		const freeCenter = request.freeCenter && hasCenter(request.gridSize)
		const needed = entriesNeeded(request.gridSize, freeCenter)
		if (dictionary.entries.length < needed) {
			throw validation(
				`« ${dictionary.title} » a ${dictionary.entries.length} expressions : il en faut ${needed} pour une grille ${request.gridSize}×${request.gridSize}.`,
			)
		}

		const ownerName = cleanName(request.ownerName) ?? (await this.funnyName([], dictionary.id))
		let code = roomCode(random)
		while (await rooms.findByCode(code)) code = roomCode(random)
		const now = clock.now()
		const room: Room = {
			id: ids.uuid(),
			code,
			name,
			mode: request.mode,
			visibility: solo ? 'unlisted' : request.visibility,
			passwordHash: password ? await passwords.hash(password) : null,
			dictionary: { id: dictionary.id, code: dictionary.code, title: dictionary.title },
			gridSize: request.gridSize,
			freeCenter,
			ownerId: null,
			createdAt: now,
			lastActivityAt: now,
			closedAt: null,
		}
		const { participant, token } = this.newParticipant(
			room,
			ownerName,
			'player',
			dictionary.entries,
			dictionary.freeSpace,
		)
		room.ownerId = participant.id
		await rooms.create(room, participant)
		await rooms.addMessage(
			this.systemMessage(
				room.id,
				solo
					? `Partie solo lancée avec « ${dictionary.title} ». Bonne chance ${ownerName} !`
					: `${ownerName} a créé le salon. Partagez le lien pour inviter du monde !`,
			),
		)
		return membership(room, participant, token)
	}

	async preview(rawCode: string): Promise<RoomPreview> {
		const room = await this.findRoom(rawCode)
		const counts = await this.deps.rooms.countParticipants(room.id)
		return {
			...roomSummary(room, counts.players, counts.spectators),
			mode: room.mode,
			visibility: room.visibility,
			closed: isClosed(room),
		}
	}

	async listPublic(): Promise<RoomSummary[]> {
		const rows = await this.deps.rooms.listOpenPublic(PUBLIC_LIST_LIMIT)
		return rows.map((row) => roomSummary(row.room, row.players, row.spectators))
	}

	async join(rawCode: string, request: JoinRoomRequest): Promise<Membership> {
		const { rooms, dictionaries, passwords, realtime } = this.deps
		const room = await this.findRoom(rawCode)
		if (isClosed(room)) throw new DomainError('room-closed', 'Ce salon est fermé.')
		if (room.mode === 'solo') {
			throw new DomainError('solo-room', 'C’est une partie solo : impossible de la rejoindre.')
		}
		if (room.passwordHash && !(await passwords.verify(request.password ?? '', room.passwordHash))) {
			throw new DomainError('wrong-password', 'Mot de passe incorrect.')
		}
		const wanted = cleanName(request.name)

		return this.mutex.run(room.id, async () => {
			const participants = await rooms.listParticipants(room.id)
			const role = request.role
			const sameRole = participants.filter((p) => p.role === role).length
			const capacity = role === 'player' ? maxPlayers(room) : LIMITS.maxSpectatorsPerRoom
			if (sameRole >= capacity) {
				throw new DomainError(
					'room-full',
					role === 'player'
						? `Le salon est complet (${capacity} joueurs). Vous pouvez regarder en spectateur.`
						: 'Il n’y a plus de place pour les spectateurs.',
				)
			}
			const takenNames = participants.map((p) => p.name)
			if (wanted && isNameTaken(wanted, takenNames)) {
				throw validation('Ce pseudo est déjà pris dans ce salon.')
			}
			const name = wanted ?? (await this.funnyName(takenNames, room.dictionary.id))
			const dictionary = await dictionaries.findById(room.dictionary.id)
			if (!dictionary) throw notFound('Le dictionnaire de ce salon a disparu.')

			const { participant, token } = this.newParticipant(
				room,
				name,
				role,
				dictionary.entries,
				dictionary.freeSpace,
			)
			await rooms.addParticipant(participant)
			realtime.broadcast(room.id, {
				type: 'participant:joined',
				participant: participantView(participant, room, false),
			})
			await this.postMessage(
				this.systemMessage(
					room.id,
					role === 'player' ? `👋 ${name} rejoint la partie.` : `👀 ${name} regarde en spectateur.`,
				),
			)
			await this.touch(room)
			return membership(room, participant, token)
		})
	}

	// ---------- Realtime use cases ----------

	async authenticate(rawCode: string, token: string): Promise<Session> {
		const { rooms, tokens } = this.deps
		const participant = await rooms.findParticipantByTokenHash(tokens.hash(token))
		if (!participant) throw new DomainError('unauthorized', 'Accès refusé à ce salon.')
		const room = await rooms.findById(participant.roomId)
		if (!room || room.code !== normalizeRoomCode(rawCode)) {
			throw new DomainError('unauthorized', 'Accès refusé à ce salon.')
		}
		if (isClosed(room)) throw new DomainError('room-closed', 'Ce salon est fermé.')
		return { roomId: room.id, participantId: participant.id }
	}

	async snapshot(session: Session): Promise<ServerMessage> {
		const { rooms, realtime } = this.deps
		const room = await this.roomById(session.roomId)
		const [participants, messages] = await Promise.all([
			rooms.listParticipants(room.id),
			rooms.listMessages(room.id, LIMITS.chatHistory),
		])
		return {
			type: 'snapshot',
			me: session.participantId,
			room: roomView(room),
			participants: participants.map((p) => participantView(p, room, realtime.isOnline(p.id))),
			messages: messages.map(messageView),
		}
	}

	/** The WebSocket of this participant is registered in the hub. */
	connected(session: Session): void {
		this.emptySince.delete(session.roomId)
		this.deps.realtime.broadcast(session.roomId, {
			type: 'participant:presence',
			participantId: session.participantId,
			online: true,
		})
	}

	/** The WebSocket of this participant left the hub. */
	disconnected(session: Session): void {
		const { realtime, clock } = this.deps
		if (realtime.onlineCount(session.roomId) === 0) {
			this.emptySince.set(session.roomId, clock.now().getTime())
		}
		realtime.broadcast(session.roomId, {
			type: 'participant:presence',
			participantId: session.participantId,
			online: false,
		})
	}

	async toggle(session: Session, cell: number): Promise<void> {
		const { rooms, realtime, clock } = this.deps
		await this.mutex.run(session.roomId, async () => {
			const room = await this.openRoom(session.roomId)
			const participant = await this.participantOf(session)
			if (participant.role !== 'player' || !participant.cells) {
				throw forbidden('Les spectateurs ne peuvent pas cocher de case.')
			}
			const checked = toggle(participant.cells, participant.checked, cell)
			const change = evaluateProgress(participant, room.gridSize, checked)
			const updated: Participant = {
				...participant,
				checked: change.checked,
				announcedLines: change.announcedLines,
				fullAt: change.becameFull ? clock.now() : participant.fullAt,
			}
			await rooms.saveProgress(updated)
			realtime.broadcast(room.id, {
				type: 'participant:progress',
				participantId: updated.id,
				checked: updated.checked,
				completedLines: change.completedLines,
				fullAt: updated.fullAt?.toISOString() ?? null,
			})
			if (change.announcement) {
				const { kind, lineCount } = change.announcement
				let rank: number | undefined
				if (kind === 'full') {
					const all = await rooms.listParticipants(room.id)
					rank = all.filter((p) => p.fullAt !== null).length
				}
				realtime.broadcast(room.id, {
					type: 'announce',
					announcement: {
						participantId: updated.id,
						name: updated.name,
						kind,
						lineCount,
						...(rank ? { rank } : {}),
					},
				})
				await this.postMessage({
					...this.systemMessage(room.id, announcementText(updated.name, kind, lineCount, rank)),
					kind: 'announce',
					authorId: updated.id,
					authorName: updated.name,
					announcement: kind,
				})
			}
			await this.touch(room)
		})
	}

	async chat(session: Session, rawText: string): Promise<void> {
		const text = cleanText(rawText)
		if (!text) return
		if (text.length > LIMITS.chatMessageMax) {
			throw validation(`Un message fait au plus ${LIMITS.chatMessageMax} caractères.`)
		}
		this.checkChatRate(session.participantId)
		const room = await this.openRoom(session.roomId)
		const participant = await this.participantOf(session)
		await this.postMessage({
			roomId: room.id,
			kind: 'chat',
			authorId: participant.id,
			authorName: participant.name,
			text,
			announcement: null,
			createdAt: this.deps.clock.now(),
		})
		await this.touch(room)
	}

	async kick(session: Session, targetId: string): Promise<void> {
		const { rooms, realtime } = this.deps
		await this.mutex.run(session.roomId, async () => {
			const room = await this.openRoom(session.roomId)
			if (room.ownerId !== session.participantId) {
				throw forbidden('Seul l’hôte du salon peut exclure quelqu’un.')
			}
			if (targetId === session.participantId) throw validation('Vous ne pouvez pas vous exclure.')
			const participants = await rooms.listParticipants(room.id)
			const target = participants.find((p) => p.id === targetId)
			if (!target) throw notFound('Cette personne n’est plus dans le salon.')
			await rooms.removeParticipant(target.id)
			realtime.broadcast(room.id, {
				type: 'participant:left',
				participantId: target.id,
				reason: 'kicked',
			})
			realtime.disconnect(target.id, CLOSE_CODES.kicked, { type: 'kicked' })
			await this.postMessage(this.systemMessage(room.id, `🚪 ${target.name} a été exclu du salon.`))
		})
	}

	async leave(session: Session): Promise<void> {
		const { rooms, realtime } = this.deps
		await this.mutex.run(session.roomId, async () => {
			const room = await this.openRoom(session.roomId)
			const participant = await this.participantOf(session)
			await rooms.removeParticipant(participant.id)
			realtime.disconnect(participant.id, CLOSE_CODES.left)
			const remaining = await rooms.listParticipants(room.id)
			if (remaining.length === 0) {
				await this.close(room, 'empty')
				return
			}
			realtime.broadcast(room.id, {
				type: 'participant:left',
				participantId: participant.id,
				reason: 'left',
			})
			await this.postMessage(this.systemMessage(room.id, `${participant.name} a quitté le salon.`))
			if (room.ownerId === participant.id) {
				const heir = remaining.find((p) => p.role === 'player') ?? remaining[0]
				if (!heir) return
				const updated = { ...room, ownerId: heir.id }
				await rooms.update(updated)
				realtime.broadcast(room.id, { type: 'room:updated', room: roomView(updated) })
				await this.postMessage(
					this.systemMessage(room.id, `👑 ${heir.name} est maintenant l’hôte du salon.`),
				)
			}
		})
	}

	// ---------- Maintenance ----------

	/**
	 * Closes rooms inactive for 2 days, or nobody is connected to after the
	 * grace period, and purges rooms closed for a week. Run periodically.
	 */
	async sweep(): Promise<{ closed: number; purged: number }> {
		const { rooms, realtime, clock } = this.deps
		const now = clock.now().getTime()
		let closed = 0
		for (const room of await rooms.listOpen()) {
			let reason: CloseReason | null = null
			if (now - room.lastActivityAt.getTime() > LIMITS.roomInactivityMs) reason = 'inactive'
			else if (realtime.onlineCount(room.id) === 0) {
				const since = this.emptySince.get(room.id) ?? this.bootedAt
				if (now - since > LIMITS.emptyRoomGraceMs) reason = 'empty'
			}
			if (reason) {
				await this.mutex.run(room.id, () => this.close(room, reason))
				closed++
			}
		}
		const purged = await rooms.purgeClosedBefore(new Date(now - PURGE_CLOSED_AFTER_MS))
		for (const [participantId, times] of this.chatHistory) {
			if (times.every((t) => now - t >= CHAT_WINDOW_MS)) this.chatHistory.delete(participantId)
		}
		return { closed, purged }
	}

	// ---------- Internals ----------

	private newParticipant(
		room: Room,
		name: string,
		role: ParticipantRole,
		entries: string[],
		freeSpace: string | null,
	): { participant: Participant; token: string } {
		const { tokens, ids, random, clock } = this.deps
		const { token, hash } = tokens.issue()
		const cells =
			role === 'player'
				? generateGrid(
						entries,
						{ size: room.gridSize, freeCenter: room.freeCenter, freeSpace },
						random,
					)
				: null
		const participant: Participant = {
			id: ids.uuid(),
			roomId: room.id,
			name,
			role,
			tokenHash: hash,
			cells,
			checked: cells ? initialChecked(cells) : [],
			announcedLines: [],
			fullAt: null,
			joinedAt: clock.now(),
		}
		return { participant, token }
	}

	private funnyName(taken: string[], dictionaryId: string): Promise<string> {
		return drawFunnyName(this.deps.names, taken, dictionaryId)
	}

	private async findRoom(rawCode: string): Promise<Room> {
		const room = await this.deps.rooms.findByCode(normalizeRoomCode(rawCode))
		if (!room) throw notFound('Ce salon n’existe pas.')
		return room
	}

	private async roomById(id: string): Promise<Room> {
		const room = await this.deps.rooms.findById(id)
		if (!room) throw notFound('Ce salon n’existe pas.')
		return room
	}

	private async openRoom(id: string): Promise<Room> {
		const room = await this.roomById(id)
		if (isClosed(room)) throw new DomainError('room-closed', 'Ce salon est fermé.')
		return room
	}

	private async participantOf(session: Session): Promise<Participant> {
		const participant = await this.deps.rooms.findParticipant(session.participantId)
		if (!participant || participant.roomId !== session.roomId) {
			throw new DomainError('unauthorized', 'Vous ne faites plus partie de ce salon.')
		}
		return participant
	}

	private systemMessage(roomId: string, text: string): NewMessage {
		return {
			roomId,
			kind: 'system',
			authorId: null,
			authorName: null,
			text,
			announcement: null,
			createdAt: this.deps.clock.now(),
		}
	}

	private async postMessage(message: NewMessage): Promise<void> {
		const saved = await this.deps.rooms.addMessage(message)
		this.deps.realtime.broadcast(message.roomId, { type: 'message', message: messageView(saved) })
	}

	private async touch(room: Room): Promise<void> {
		const now = this.deps.clock.now()
		if (now.getTime() - room.lastActivityAt.getTime() < ACTIVITY_WRITE_INTERVAL_MS) return
		await this.deps.rooms.update({ ...room, lastActivityAt: now })
	}

	private async close(room: Room, reason: CloseReason): Promise<void> {
		await this.deps.rooms.update({ ...room, closedAt: this.deps.clock.now() })
		this.emptySince.delete(room.id)
		this.deps.realtime.closeRoom(room.id, reason)
	}

	private checkChatRate(participantId: string): void {
		const now = this.deps.clock.now().getTime()
		const recent = (this.chatHistory.get(participantId) ?? []).filter(
			(t) => now - t < CHAT_WINDOW_MS,
		)
		if (recent.length >= CHAT_MAX_PER_WINDOW) {
			throw new DomainError(
				'rate-limited',
				'Doucement ! Attendez quelques secondes avant d’écrire.',
			)
		}
		recent.push(now)
		this.chatHistory.set(participantId, recent)
	}
}

function membership(room: Room, participant: Participant, token: string): Membership {
	return {
		roomCode: room.code,
		participantId: participant.id,
		name: participant.name,
		role: participant.role,
		token,
	}
}
