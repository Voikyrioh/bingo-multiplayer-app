import { CLOSE_CODES, LIMITS } from '@bingo/shared'
import { describe, expect, it } from 'vitest'
import type { Session } from '../application/room.service'
import { baseRoom, createTestServices, FakeSocket } from './support/fixtures'

async function setup() {
	const services = createTestServices()
	const owner = await services.rooms.create(baseRoom)
	const ownerSession = await services.rooms.authenticate(owner.roomCode, owner.token)
	return { ...services, owner, ownerSession }
}

/** Connects a participant to the hub like the WebSocket layer does. */
function connect(services: ReturnType<typeof createTestServices>, session: Session) {
	const socket = new FakeSocket()
	services.hub.register(session.roomId, session.participantId, socket)
	services.rooms.connected(session)
	return socket
}

describe('RoomService.create', () => {
	it('creates a room whose owner is a player with a grid', async () => {
		const { rooms, owner, ownerSession } = await setup()
		expect(owner.roomCode).toMatch(/^[A-Z2-9]{6}$/)
		expect(owner.role).toBe('player')
		const snapshot = await rooms.snapshot(ownerSession)
		if (snapshot.type !== 'snapshot') throw new Error('expected a snapshot')
		expect(snapshot.room.ownerId).toBe(owner.participantId)
		expect(snapshot.participants[0]?.cells).toHaveLength(25)
		expect(snapshot.participants[0]?.checked).toEqual([12])
		expect(snapshot.messages[0]?.text).toContain('Alice a créé le salon')
	})

	it('draws a funny name when none is given', async () => {
		const { rooms } = createTestServices()
		const owner = await rooms.create({ ...baseRoom, ownerName: '  ' })
		expect(owner.name.length).toBeGreaterThan(2)
	})

	it('refuses an unknown dictionary or a dictionary too small for the grid', async () => {
		const { rooms, dictionaries } = createTestServices()
		await expect(rooms.create({ ...baseRoom, dictionaryCode: 'nope' })).rejects.toThrow(
			/n’existe pas/,
		)
		const small = await dictionaries.create({
			title: 'Petit',
			entries: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
			isPublic: false,
		})
		await expect(rooms.create({ ...baseRoom, dictionaryCode: small.code })).rejects.toThrow(
			/il en faut 24/,
		)
		await expect(
			rooms.create({ ...baseRoom, dictionaryCode: small.code, gridSize: 3, freeCenter: false }),
		).resolves.toBeDefined()
	})

	it('makes solo rooms unlisted and without password', async () => {
		const { rooms } = createTestServices()
		const solo = await rooms.create({ ...baseRoom, mode: 'solo', password: 'secret' })
		const preview = await rooms.preview(solo.roomCode)
		expect(preview).toMatchObject({
			mode: 'solo',
			visibility: 'unlisted',
			hasPassword: false,
			maxPlayers: 1,
		})
		await expect(rooms.join(solo.roomCode, { role: 'player' })).rejects.toMatchObject({
			code: 'solo-room',
		})
		expect(await rooms.listPublic()).toHaveLength(0)
	})
})

describe('RoomService.join', () => {
	it('gives every player the same dictionary but another grid', async () => {
		const { rooms, owner, ownerSession } = await setup()
		const bob = await rooms.join(owner.roomCode, { name: 'Bob', role: 'player' })
		const snapshot = await rooms.snapshot(ownerSession)
		if (snapshot.type !== 'snapshot') throw new Error('expected a snapshot')
		const [a, b] = snapshot.participants
		expect(b?.id).toBe(bob.participantId)
		expect(a?.cells?.map((c) => c.text)).not.toEqual(b?.cells?.map((c) => c.text))
	})

	it('broadcasts the arrival to the connected participants', async () => {
		const services = await setup()
		const socket = connect(services, services.ownerSession)
		await services.rooms.join(services.owner.roomCode, { name: 'Bob', role: 'player' })
		expect(socket.ofType('participant:joined')[0].participant.name).toBe('Bob')
		expect(socket.ofType('message').at(-1).message.text).toContain('Bob rejoint')
	})

	it('accepts lower case codes', async () => {
		const { rooms, owner } = await setup()
		await expect(
			rooms.join(owner.roomCode.toLowerCase(), { role: 'spectator' }),
		).resolves.toBeDefined()
	})

	it('refuses a taken name, case and accent insensitive', async () => {
		const { rooms, owner } = await setup()
		await expect(rooms.join(owner.roomCode, { name: 'alice', role: 'player' })).rejects.toThrow(
			/déjà pris/,
		)
	})

	it('checks the password for players and spectators', async () => {
		const { rooms } = createTestServices()
		const owner = await rooms.create({ ...baseRoom, password: 'chut' })
		await expect(rooms.join(owner.roomCode, { role: 'player' })).rejects.toMatchObject({
			code: 'wrong-password',
		})
		await expect(
			rooms.join(owner.roomCode, { role: 'spectator', password: 'faux' }),
		).rejects.toMatchObject({
			code: 'wrong-password',
		})
		const spectator = await rooms.join(owner.roomCode, { role: 'spectator', password: 'chut' })
		expect(spectator.role).toBe('spectator')
	})

	it('stops at 50 players but still accepts spectators', async () => {
		const { rooms, owner } = await setup()
		for (let i = 1; i < LIMITS.maxPlayersPerRoom; i++) {
			await rooms.join(owner.roomCode, { name: `Joueur ${i}`, role: 'player' })
		}
		await expect(rooms.join(owner.roomCode, { role: 'player' })).rejects.toMatchObject({
			code: 'room-full',
		})
		await expect(rooms.join(owner.roomCode, { role: 'spectator' })).resolves.toBeDefined()
		const preview = await rooms.preview(owner.roomCode)
		expect(preview.players).toBe(50)
		expect(preview.spectators).toBe(1)
	})
})

describe('RoomService.toggle', () => {
	it('broadcasts the progress and announces lines, diagonals and the full grid', async () => {
		const services = await setup()
		const { rooms, ownerSession } = services
		const socket = connect(services, ownerSession)

		for (const cell of [0, 1, 2, 3]) await rooms.toggle(ownerSession, cell)
		expect(socket.ofType('announce')).toHaveLength(0)
		await rooms.toggle(ownerSession, 4)
		expect(socket.ofType('announce')[0].announcement).toMatchObject({
			kind: 'line',
			name: 'Alice',
			lineCount: 1,
		})
		expect(socket.ofType('participant:progress').at(-1).completedLines).toEqual(['r0'])

		for (const cell of [6, 18]) await rooms.toggle(ownerSession, cell)
		await rooms.toggle(ownerSession, 24)
		expect(socket.ofType('announce').at(-1).announcement.kind).toBe('diagonal')

		for (let cell = 0; cell < 25; cell++) {
			const snapshot = await rooms.snapshot(ownerSession)
			if (snapshot.type !== 'snapshot') throw new Error('expected a snapshot')
			if (!snapshot.participants[0]?.checked.includes(cell)) await rooms.toggle(ownerSession, cell)
		}
		const last = socket.ofType('announce').at(-1).announcement
		expect(last).toMatchObject({ kind: 'full', rank: 1, lineCount: 12 })
		expect(socket.ofType('message').at(-1).message).toMatchObject({
			kind: 'announce',
			announcement: 'full',
		})
	})

	it('does not announce a line again after unchecking and rechecking', async () => {
		const services = await setup()
		const socket = connect(services, services.ownerSession)
		for (const cell of [0, 1, 2, 3, 4]) await services.rooms.toggle(services.ownerSession, cell)
		await services.rooms.toggle(services.ownerSession, 4)
		await services.rooms.toggle(services.ownerSession, 4)
		expect(socket.ofType('announce')).toHaveLength(1)
	})

	it('forbids spectators to play', async () => {
		const { rooms, owner } = await setup()
		const spectator = await rooms.join(owner.roomCode, { role: 'spectator' })
		const session = await rooms.authenticate(owner.roomCode, spectator.token)
		await expect(rooms.toggle(session, 0)).rejects.toMatchObject({ code: 'forbidden' })
	})
})

describe('RoomService.chat', () => {
	it('broadcasts cleaned messages', async () => {
		const services = await setup()
		const socket = connect(services, services.ownerSession)
		await services.rooms.chat(services.ownerSession, '  Il a dit   « en même temps » !  ')
		expect(socket.ofType('message').at(-1).message).toMatchObject({
			kind: 'chat',
			authorName: 'Alice',
			text: 'Il a dit « en même temps » !',
		})
	})

	it('limits the rate', async () => {
		const { rooms, ownerSession, clock } = await setup()
		for (let i = 0; i < 8; i++) await rooms.chat(ownerSession, `msg ${i}`)
		await expect(rooms.chat(ownerSession, 'trop')).rejects.toMatchObject({ code: 'rate-limited' })
		clock.advance(11_000)
		await expect(rooms.chat(ownerSession, 'ok')).resolves.toBeUndefined()
	})
})

describe('RoomService.kick and leave', () => {
	it('lets only the owner kick, and closes the socket of the kicked one', async () => {
		const services = await setup()
		const { rooms, owner, ownerSession } = services
		const bob = await rooms.join(owner.roomCode, { name: 'Bob', role: 'player' })
		const bobSession = await rooms.authenticate(owner.roomCode, bob.token)
		const bobSocket = connect(services, bobSession)

		await expect(rooms.kick(bobSession, owner.participantId)).rejects.toMatchObject({
			code: 'forbidden',
		})
		await rooms.kick(ownerSession, bob.participantId)
		expect(bobSocket.ofType('kicked')).toHaveLength(1)
		expect(bobSocket.closedWith).toBe(CLOSE_CODES.kicked)
		await expect(rooms.authenticate(owner.roomCode, bob.token)).rejects.toMatchObject({
			code: 'unauthorized',
		})
	})

	it('hands the room over to the oldest player when the owner leaves', async () => {
		const services = await setup()
		const { rooms, owner, ownerSession } = services
		await rooms.join(owner.roomCode, { name: 'Zoé', role: 'spectator' })
		const bob = await rooms.join(owner.roomCode, { name: 'Bob', role: 'player' })
		const bobSocket = connect(services, await rooms.authenticate(owner.roomCode, bob.token))
		await rooms.leave(ownerSession)
		expect(bobSocket.ofType('room:updated')[0].room.ownerId).toBe(bob.participantId)
		expect(bobSocket.ofType('participant:left')[0]).toMatchObject({ reason: 'left' })
	})

	it('closes the room when the last participant leaves', async () => {
		const { rooms, owner, ownerSession } = await setup()
		await rooms.leave(ownerSession)
		expect((await rooms.preview(owner.roomCode)).closed).toBe(true)
		await expect(rooms.join(owner.roomCode, { role: 'player' })).rejects.toMatchObject({
			code: 'room-closed',
		})
	})
})

describe('RoomService.sweep', () => {
	it('closes a room nobody is connected to after the grace period', async () => {
		const services = await setup()
		const { rooms, owner, clock } = services
		clock.advance(LIMITS.emptyRoomGraceMs - 1000)
		expect((await rooms.sweep()).closed).toBe(0)
		clock.advance(2000)
		expect((await rooms.sweep()).closed).toBe(1)
		expect((await rooms.preview(owner.roomCode)).closed).toBe(true)
	})

	it('keeps a room with a connected player, until 2 days without activity', async () => {
		const services = await setup()
		const socket = connect(services, services.ownerSession)
		services.clock.advance(LIMITS.emptyRoomGraceMs * 10)
		expect((await services.rooms.sweep()).closed).toBe(0)
		services.clock.advance(LIMITS.roomInactivityMs)
		expect((await services.rooms.sweep()).closed).toBe(1)
		expect(socket.ofType('room:closed')[0].reason).toBe('inactive')
		expect(socket.closedWith).toBe(CLOSE_CODES.roomClosed)
	})

	it('purges rooms closed for a week', async () => {
		const { rooms, ownerSession, clock, owner } = await setup()
		await rooms.leave(ownerSession)
		clock.advance(8 * 24 * 60 * 60 * 1000)
		expect((await rooms.sweep()).purged).toBe(1)
		await expect(rooms.preview(owner.roomCode)).rejects.toMatchObject({ code: 'not-found' })
	})
})
