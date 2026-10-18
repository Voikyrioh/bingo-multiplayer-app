import { CLOSE_CODES, type CloseReason, type ServerMessage } from '@bingo/shared'
import type { RealtimeGateway } from '../../application/ports'

/** The part of a WebSocket the hub needs (easy to fake in tests). */
export interface Socket {
	send(data: string): void
	close(code?: number, reason?: string): void
}

interface Entry {
	roomId: string
	socket: Socket
}

/**
 * Keeps the live connections of every room and fans messages out. One socket
 * per participant: a new tab replaces the previous one.
 */
export class ConnectionHub implements RealtimeGateway {
	private readonly byParticipant = new Map<string, Entry>()
	private readonly byRoom = new Map<string, Set<string>>()

	register(roomId: string, participantId: string, socket: Socket): void {
		const previous = this.byParticipant.get(participantId)
		if (previous && previous.socket !== socket) {
			this.remove(participantId)
			previous.socket.close(CLOSE_CODES.replaced, 'Ouvert dans un autre onglet')
		}
		this.byParticipant.set(participantId, { roomId, socket })
		let members = this.byRoom.get(roomId)
		if (!members) {
			members = new Set()
			this.byRoom.set(roomId, members)
		}
		members.add(participantId)
	}

	/** Removes the socket if it is still the current one. Returns whether it was. */
	unregister(participantId: string, socket: Socket): boolean {
		if (this.byParticipant.get(participantId)?.socket !== socket) return false
		this.remove(participantId)
		return true
	}

	broadcast(roomId: string, message: ServerMessage): void {
		const members = this.byRoom.get(roomId)
		if (!members) return
		const data = JSON.stringify(message)
		for (const participantId of members) this.safeSend(this.byParticipant.get(participantId), data)
	}

	send(participantId: string, message: ServerMessage): void {
		this.safeSend(this.byParticipant.get(participantId), JSON.stringify(message))
	}

	disconnect(participantId: string, closeCode: number, last?: ServerMessage): void {
		const entry = this.byParticipant.get(participantId)
		if (!entry) return
		if (last) this.safeSend(entry, JSON.stringify(last))
		this.remove(participantId)
		entry.socket.close(closeCode)
	}

	closeRoom(roomId: string, reason: CloseReason): void {
		this.broadcast(roomId, { type: 'room:closed', reason })
		for (const participantId of [...(this.byRoom.get(roomId) ?? [])]) {
			const entry = this.byParticipant.get(participantId)
			this.remove(participantId)
			entry?.socket.close(CLOSE_CODES.roomClosed)
		}
	}

	isOnline(participantId: string): boolean {
		return this.byParticipant.has(participantId)
	}

	onlineCount(roomId: string): number {
		return this.byRoom.get(roomId)?.size ?? 0
	}

	closeAll(): void {
		for (const { socket } of this.byParticipant.values()) socket.close(1001, 'Redémarrage')
		this.byParticipant.clear()
		this.byRoom.clear()
	}

	private remove(participantId: string): void {
		const entry = this.byParticipant.get(participantId)
		if (!entry) return
		this.byParticipant.delete(participantId)
		const members = this.byRoom.get(entry.roomId)
		members?.delete(participantId)
		if (members?.size === 0) this.byRoom.delete(entry.roomId)
	}

	private safeSend(entry: Entry | undefined, data: string): void {
		try {
			entry?.socket.send(data)
		} catch {
			// A socket that is closing: its close handler cleans it up.
		}
	}
}
