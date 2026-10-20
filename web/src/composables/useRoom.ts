import type { Announcement, Membership, ServerMessage } from '@bingo/shared'
import { computed, onScopeDispose, reactive, ref, shallowRef } from 'vue'
import { RoomSocket, type SocketStatus } from '../api/room-socket'
import { useI18n } from '../i18n/useI18n'
import { applyServerMessage, emptyRoomState, ranking, toggleLocally } from '../lib/room-state'
import { sounds } from '../lib/sound'
import { useCelebration } from './useCelebration'
import { useToasts } from './useToasts'

export type LiveAnnouncement = Announcement & { mine: boolean }

const BANNER_MS = { line: 3200, diagonal: 3200, full: 5500 }

/**
 * Live state of a room for the current participant: connects the socket,
 * applies server events and plays the celebrations.
 */
export function useRoom(membership: Membership, factory?: (url: string) => WebSocket) {
	const state = reactive(emptyRoomState())
	const status = ref<SocketStatus>('connecting')
	const endedWith = ref<number | null>(null)
	const announcement = shallowRef<LiveAnnouncement | null>(null)
	const { show } = useToasts()
	const { t } = useI18n()
	const celebration = useCelebration()

	const queue: LiveAnnouncement[] = []
	let bannerTimer: ReturnType<typeof setTimeout> | null = null

	function nextBanner() {
		bannerTimer = null
		const next = queue.shift() ?? null
		announcement.value = next
		if (next) bannerTimer = setTimeout(nextBanner, BANNER_MS[next.kind])
	}

	function onAnnounce(a: Announcement) {
		const mine = a.participantId === state.me
		if (a.kind === 'full') {
			celebration.celebrate()
			sounds.fanfare()
		} else if (!mine) {
			sounds.otherLine()
		}
		// Several lines at once from the same player: only keep the latest.
		const index = queue.findIndex((q) => q.participantId === a.participantId && q.kind !== 'full')
		if (index >= 0) queue.splice(index, 1)
		queue.push({ ...a, mine })
		// A full grid replaces the line banner of the same player still on screen.
		const current = announcement.value
		const supersedes =
			a.kind === 'full' && current?.participantId === a.participantId && current.kind !== 'full'
		if (supersedes && bannerTimer) {
			clearTimeout(bannerTimer)
			bannerTimer = null
		}
		if (!bannerTimer) nextBanner()
	}

	function onMessage(message: ServerMessage) {
		applyServerMessage(state, message)
		switch (message.type) {
			case 'announce':
				onAnnounce(message.announcement)
				break
			case 'message':
				if (
					message.message.kind === 'chat' &&
					message.message.authorId !== state.me &&
					state.ready
				) {
					sounds.message()
				}
				break
			case 'error':
				show(t(`error.${message.key}`, message.params), 'error')
				// Drop optimistic changes: ask for the real state.
				socket.send({ type: 'sync' })
				break
		}
	}

	const socket = new RoomSocket(
		membership.roomCode,
		membership.token,
		{
			onMessage,
			onStatus: (s) => {
				status.value = s
			},
			onEnded: (code) => {
				endedWith.value = code
			},
		},
		factory,
	)
	socket.connect()

	const nudge = () => socket.nudge()
	const onVisible = () => document.visibilityState === 'visible' && nudge()
	window.addEventListener('online', nudge)
	document.addEventListener('visibilitychange', onVisible)

	onScopeDispose(() => {
		socket.dispose()
		if (bannerTimer) clearTimeout(bannerTimer)
		window.removeEventListener('online', nudge)
		document.removeEventListener('visibilitychange', onVisible)
	})

	const me = computed(() => state.participants.find((p) => p.id === state.me) ?? null)
	const isOwner = computed(() => !!state.room && state.room.ownerId === state.me)
	const ranked = computed(() => ranking(state.participants))

	function toggle(cell: number) {
		const before = me.value?.checked.includes(cell)
		if (!socket.send({ type: 'toggle', cell })) {
			show(t('room.offlineAction'), 'error')
			return
		}
		if (toggleLocally(state, cell)) {
			if (before) sounds.uncheck()
			else sounds.check()
		}
	}

	return {
		state,
		status,
		endedWith,
		announcement,
		me,
		isOwner,
		ranked,
		toggle,
		chat: (text: string) => socket.send({ type: 'chat', text }),
		kick: (participantId: string) => socket.send({ type: 'kick', participantId }),
		leave: () => socket.send({ type: 'leave' }),
	}
}
