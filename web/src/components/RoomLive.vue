<script setup lang="ts">
import { CLOSE_CODES, type Membership, type ParticipantView } from '@bingo/shared'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCelebration } from '../composables/useCelebration'
import { useRoom } from '../composables/useRoom'
import { useI18n } from '../i18n/useI18n'
import { dictionaryLink, roomLink } from '../lib/format'
import { forgetMembership } from '../lib/identity'
import { sounds } from '../lib/sound'
import AnnouncementBanner from './AnnouncementBanner.vue'
import BingoGrid from './BingoGrid.vue'
import ChatPanel from './ChatPanel.vue'
import PlayerCard from './PlayerCard.vue'
import ShareBox from './ShareBox.vue'
import AppButton from './ui/AppButton.vue'
import AppIcon from './ui/AppIcon.vue'
import AppModal from './ui/AppModal.vue'

const props = defineProps<{ membership: Membership }>()
const emit = defineEmits<{ forget: []; reconnect: [] }>()
const route = useRoute()
const router = useRouter()
const celebration = useCelebration()
const { t, tc } = useI18n()

const { state, status, endedWith, announcement, me, isOwner, ranked, toggle, chat, kick, leave } =
	useRoom(props.membership)

const room = computed(() => state.room)
const solo = computed(() => room.value?.mode === 'solo')
const link = computed(() => roomLink(props.membership.roomCode))
const totalCells = computed(() => (room.value ? room.value.gridSize ** 2 : 0))
const players = computed(() => state.participants.filter((p) => p.role === 'player').length)
const spectators = computed(() => state.participants.length - players.value)
const others = computed(() => state.participants.filter((p) => p.id !== state.me))
const meFull = computed(() => !!me.value?.cells && me.value.checked.length === totalCells.value)

// ----- Mobile tabs and unread counter -----
type Tab = 'grid' | 'players' | 'chat'
const tab = ref<Tab>('grid')
const seen = ref(0)
const unread = computed(() => Math.max(0, state.messages.length - seen.value))
watch(
	[tab, () => state.messages.length, () => state.ready],
	() => {
		if (tab.value === 'chat' || !state.ready || seen.value === 0) seen.value = state.messages.length
	},
	{ immediate: true },
)

// ----- Modals -----
const shareOpen = ref(false)
const viewing = ref<ParticipantView | null>(null)
const viewingOpen = computed({
	get: () => viewing.value !== null,
	set: (v) => {
		if (!v) viewing.value = null
	},
})
const viewed = computed(() => state.participants.find((p) => p.id === viewing.value?.id) ?? null)
const kickTarget = ref<ParticipantView | null>(null)
const kickOpen = computed({
	get: () => kickTarget.value !== null,
	set: (v) => {
		if (!v) kickTarget.value = null
	},
})
const leaveOpen = ref(false)

// A freshly created multiplayer room opens the invite box once.
watch(
	() => state.ready,
	(ready) => {
		if (!ready || route.query.nouveau !== '1') return
		if (!solo.value) shareOpen.value = true
		void router.replace({ query: {} })
	},
)

// ----- End of session -----
watch(endedWith, (code) => {
	if (code === CLOSE_CODES.unauthorized) emit('forget')
	if (code === CLOSE_CODES.kicked || code === CLOSE_CODES.left || code === CLOSE_CODES.roomClosed) {
		forgetMembership(props.membership.roomCode)
	}
	if (code === CLOSE_CODES.left) void router.push('/')
})

// ----- Actions -----
const grid = ref<InstanceType<typeof BingoGrid> | null>(null)

function onLineCompleted(cell: number) {
	sounds.line()
	celebration.burstFrom(grid.value?.cellElement(cell) ?? null, 70)
}

function confirmKick() {
	if (kickTarget.value) kick(kickTarget.value.id)
	kickTarget.value = null
}

function confirmLeave() {
	leaveOpen.value = false
	leave()
}

const statusText = computed(() => {
	if (status.value === 'reconnecting') return t('room.reconnecting')
	if (status.value === 'connecting') return t('room.connecting')
	return ''
})
</script>

<template>
	<!-- Final screens -->
	<div v-if="state.kicked || endedWith === CLOSE_CODES.kicked" class="container ended">
		<p class="ended__emoji" aria-hidden="true">🚪</p>
		<h1>{{ t('room.kickedTitle') }}</h1>
		<p class="muted">{{ t('room.kickedText') }}</p>
		<AppButton to="/salons" icon="globe">{{ t('room.otherRooms') }}</AppButton>
	</div>
	<div v-else-if="state.closed || endedWith === CLOSE_CODES.roomClosed" class="container ended">
		<p class="ended__emoji" aria-hidden="true">🌙</p>
		<h1>{{ t('room.closedTitle') }}</h1>
		<p class="muted">
			{{ state.closed === 'inactive' ? t('room.closedInactive') : t('room.closedEmpty') }}
		</p>
		<AppButton to="/creer" icon="plus">{{ t('room.createNew') }}</AppButton>
	</div>
	<div v-else-if="endedWith === CLOSE_CODES.replaced" class="container ended">
		<p class="ended__emoji" aria-hidden="true">🪟</p>
		<h1>{{ t('room.replacedTitle') }}</h1>
		<p class="muted">{{ t('room.replacedText') }}</p>
		<AppButton icon="refresh" @click="emit('reconnect')">{{ t('room.playHere') }}</AppButton>
	</div>

	<div v-else-if="!state.ready" class="container ended" aria-busy="true">
		<span class="spinner" aria-hidden="true" />
		<p>{{ statusText || t('room.connecting') }}</p>
	</div>

	<!-- Live room -->
	<div v-else-if="room" class="live" :class="{ 'live--solo': solo }" :data-tab="tab">
		<AnnouncementBanner :current="announcement" />

		<div v-if="statusText" class="live__status" role="status">
			<AppIcon name="wifiOff" :size="18" /> {{ statusText }}
		</div>

		<div class="layout container">
			<header class="bar">
				<div class="bar__title">
					<p class="eyebrow">{{ solo ? t('room.solo') : t('room.eyebrow', { code: room.code }) }}</p>
					<h1 class="bar__name">{{ room.name }}</h1>
					<p class="bar__meta">
						<span :lang="room.dictionary.language"><AppIcon name="book" :size="16" /> {{ room.dictionary.title }}</span>
						<span v-if="!solo" :title="tc('rooms.players', players, { max: room.maxPlayers })">
							<AppIcon name="users" :size="16" />
							<span aria-hidden="true">{{ players }}/{{ room.maxPlayers }}</span>
							<span class="visually-hidden">{{ tc('rooms.players', players, { max: room.maxPlayers }) }}</span>
						</span>
						<span v-if="spectators" :title="tc('rooms.spectators', spectators)">
							<AppIcon name="eye" :size="16" />
							<span aria-hidden="true">{{ spectators }}</span>
							<span class="visually-hidden">{{ tc('rooms.spectators', spectators) }}</span>
						</span>
						<span v-if="room.hasPassword"><AppIcon name="lock" :size="16" /> {{ t('room.private') }}</span>
					</p>
				</div>
				<div class="bar__actions">
					<AppButton v-if="!solo" variant="sun" icon="users" @click="shareOpen = true">{{ t('room.invite') }}</AppButton>
					<AppButton variant="secondary" icon="logout" @click="leaveOpen = true">
						<span class="bar__leave">{{ t('room.leave') }}</span>
					</AppButton>
				</div>
			</header>

			<!-- My grid -->
			<section class="pane pane--grid" aria-labelledby="my-grid-title">
				<template v-if="me?.cells">
					<div class="pane__head">
						<h2 id="my-grid-title">{{ t('room.myGrid') }}</h2>
						<p class="progress" aria-live="polite">
							<span class="progress__chip">{{ t('player.cells', { count: me.checked.length, total: totalCells }) }}</span>
							<span class="progress__chip progress__chip--lines">
								{{ tc('player.lines', me.completedLines.length) }}
							</span>
							<span v-if="meFull" class="progress__chip progress__chip--full">{{ t('player.full') }}</span>
						</p>
					</div>
					<BingoGrid
						ref="grid"
						:size="room.gridSize"
						:cells="me.cells"
						:checked="me.checked"
						:completed-lines="me.completedLines"
						interactive
						:content-lang="room.dictionary.language"
						:label="t('room.myGridLabel', { count: me.checked.length, total: totalCells })"
						@toggle="toggle"
						@line-completed="onLineCompleted"
					/>
					<p class="pane__hint muted">{{ t('room.gridHint') }}</p>
				</template>
				<div v-else class="spectator card">
					<p class="spectator__emoji" aria-hidden="true">👀</p>
					<h2 id="my-grid-title">{{ t('room.spectatorTitle') }}</h2>
					<p class="muted">{{ t('room.spectatorText') }}</p>
				</div>
			</section>

			<!-- Players -->
			<section v-if="!solo" class="pane pane--players" aria-labelledby="players-title">
				<div class="pane__head">
					<h2 id="players-title">{{ t('room.ranking') }}</h2>
					<span class="muted">{{ tc('room.present', state.participants.length) }}</span>
				</div>
				<ol class="players">
					<PlayerCard
						v-for="(p, index) in ranked"
						:key="p.id"
						:participant="p"
						:size="room.gridSize"
						:rank="index + 1"
						:is-me="p.id === state.me"
						:can-kick="isOwner"
						@open="viewing = p"
						@kick="kickTarget = p"
					/>
				</ol>
				<p v-if="others.length === 0" class="muted">{{ t('room.alone') }}</p>
			</section>

			<!-- Chat, or share box in solo -->
			<aside class="pane pane--chat" :aria-label="solo ? t('share.share') : t('room.discussion')">
				<ChatPanel v-if="!solo" :messages="state.messages" :me="state.me" :can-write="true" @send="chat" />
				<div v-else class="solo card">
					<h2>{{ t('room.shareDictionary') }}</h2>
					<p class="muted">{{ t('room.shareDictionaryText') }}</p>
					<ShareBox :link="dictionaryLink(room.dictionary.code)" :label="t('room.dictionaryLink')" :title="room.dictionary.title" />
					<AppButton :to="`/creer?d=${room.dictionary.code}`" variant="secondary" icon="users">
						{{ t('room.makeMultiplayer') }}
					</AppButton>
				</div>
			</aside>
		</div>

		<!-- Mobile tab bar -->
		<nav v-if="!solo" class="tabs" :aria-label="t('room.tabs')">
			<button type="button" class="tabs__btn" :aria-current="tab === 'grid' ? 'page' : undefined" @click="tab = 'grid'">
				<AppIcon name="grid" /> <span>{{ t('room.tabGrid') }}</span>
			</button>
			<button type="button" class="tabs__btn" :aria-current="tab === 'players' ? 'page' : undefined" @click="tab = 'players'">
				<AppIcon name="trophy" /> <span>{{ t('room.tabPlayers') }}</span>
			</button>
			<button type="button" class="tabs__btn" :aria-current="tab === 'chat' ? 'page' : undefined" @click="tab = 'chat'">
				<AppIcon name="chat" /> <span>{{ t('room.tabChat') }}</span>
				<span v-if="unread" class="tabs__badge" :aria-label="tc('room.unread', unread)">{{ unread > 99 ? '99+' : unread }}</span>
			</button>
		</nav>

		<!-- Invite -->
		<AppModal v-model:open="shareOpen" :title="t('room.inviteTitle')">
			<div class="invite">
				<ShareBox :link="link" :label="t('room.roomLink')" :title="room.name" />
				<p class="invite__code">
					<span>{{ room.hasPassword ? t('room.orCodeAndPassword') : t('room.orCode') }}</span>
					<strong>{{ room.code }}</strong>
				</p>
				<ShareBox :link="dictionaryLink(room.dictionary.code)" :label="t('room.dictionaryLink')" :title="room.dictionary.title" />
			</div>
		</AppModal>

		<!-- Somebody else's grid (read only) -->
		<AppModal v-model:open="viewingOpen" :title="viewed ? t('room.gridOf', { name: viewed.name }) : t('room.tabGrid')" wide>
			<div v-if="viewed?.cells" class="viewer">
				<BingoGrid
					:size="room.gridSize"
					:cells="viewed.cells"
					:checked="viewed.checked"
					:completed-lines="viewed.completedLines"
					:content-lang="room.dictionary.language"
					:label="t('room.gridOf', { name: viewed.name })"
				/>
				<p class="muted">
					{{ t('player.summary', { cells: t('player.cells', { count: viewed.checked.length, total: totalCells }), lines: tc('player.lines', viewed.completedLines.length) }) }}
					· {{ t('room.liveGrid') }}
				</p>
			</div>
			<p v-else class="muted">{{ t('room.personLeft') }}</p>
		</AppModal>

		<!-- Confirmations -->
		<AppModal v-model:open="kickOpen" :title="t('room.kickTitle')">
			<p>{{ t('room.kickText', { name: kickTarget?.name ?? '' }) }}</p>
			<template #footer>
				<AppButton variant="secondary" @click="kickTarget = null">{{ t('common.cancel') }}</AppButton>
				<AppButton variant="danger" icon="userX" @click="confirmKick">{{ t('room.kickConfirm') }}</AppButton>
			</template>
		</AppModal>
		<AppModal v-model:open="leaveOpen" :title="t('room.leaveTitle')">
			<p>
				{{ t('room.leaveLost') }}
				<template v-if="isOwner && !solo">{{ t('room.leaveHost') }}</template>
				{{ t('room.leaveTip') }}
			</p>
			<template #footer>
				<AppButton variant="secondary" @click="leaveOpen = false">{{ t('room.stay') }}</AppButton>
				<AppButton variant="danger" icon="logout" @click="confirmLeave">{{ t('room.leave') }}</AppButton>
			</template>
		</AppModal>
	</div>
</template>

<style scoped>
.ended {
	display: grid;
	justify-items: center;
	gap: 14px;
	padding-top: 72px;
	text-align: center;
}
.ended h1 {
	font-size: clamp(1.7rem, 5vw, 2.3rem);
}
.ended__emoji {
	font-size: 3.5rem;
}
.spinner {
	width: 48px;
	height: 48px;
	border: 5px solid var(--primary);
	border-right-color: transparent;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}
.live__status {
	position: fixed;
	top: 66px;
	left: 0;
	right: 0;
	z-index: 30;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 6px 12px;
	border-bottom: var(--border);
	background: var(--accent);
	color: #fff;
	font-weight: 700;
}
.bar {
	grid-area: bar;
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 14px;
}
.bar__title {
	display: grid;
	gap: 4px;
	min-width: 0;
}
.bar__name {
	font-size: clamp(1.6rem, 4vw, 2.3rem);
	overflow-wrap: anywhere;
}
.bar__meta {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 14px;
	color: var(--ink-2);
	font-weight: 700;
	font-size: 0.95rem;
}
.bar__meta span {
	display: inline-flex;
	align-items: center;
	gap: 5px;
}
.bar__actions {
	display: flex;
	gap: 10px;
}
/*
 * The room title sits in the left column, so the chat column starts right
 * under the site header and, being exactly one viewport tall, shows its input
 * without scrolling. It stays sticky while the left column scrolls.
 */
.layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
	grid-template-rows: auto auto 1fr;
	grid-template-areas:
		'bar chat'
		'grid chat'
		'players chat';
	align-items: start;
	column-gap: 24px;
	row-gap: 20px;
	padding-top: 20px;
}
.live--solo .layout {
	grid-template-rows: auto 1fr;
	grid-template-areas:
		'bar chat'
		'grid chat';
}
.pane {
	display: grid;
	gap: 12px;
	min-width: 0;
}
.pane--grid {
	grid-area: grid;
}
.pane--players {
	grid-area: players;
}
.pane--chat {
	grid-area: chat;
	position: sticky;
	/* site header (66px) + layout padding (20px) */
	top: 86px;
	height: calc(100dvh - 86px - 16px);
	min-height: 360px;
}
.live--solo .pane--chat {
	height: auto;
	min-height: 0;
}
@media (min-width: 901px) {
	/*
	 * The sticky chat is held by its grid area: the page must end right under
	 * the layout, otherwise scrolling to the bottom pushes the chat under the
	 * site header. Cancels the bottom padding of <main> (App.vue).
	 */
	.live {
		margin-bottom: -48px;
	}
	.layout {
		padding-bottom: 16px;
	}
}
.pane--grid > :deep(.grid) {
	max-width: min(100%, 680px, calc(100dvh - 320px));
	min-width: min(100%, 300px);
	justify-self: center;
}
.pane__head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}
.pane__head h2 {
	font-size: 1.4rem;
}
.pane__hint {
	text-align: center;
	font-size: 0.9rem;
}
.progress {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}
.progress__chip {
	padding: 2px 10px;
	border: 2px solid var(--line);
	border-radius: 999px;
	background: var(--surface);
	font-family: var(--font-display);
	font-weight: 600;
	font-size: 0.9rem;
}
.progress__chip--lines {
	background: var(--sun);
	color: #1f1b2e;
}
.progress__chip--full {
	background: var(--accent);
	color: #fff;
	animation: pulse 1s ease-in-out infinite;
}
.players {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
	gap: 10px;
}
.spectator,
.solo {
	display: grid;
	justify-items: center;
	gap: 10px;
	padding: 28px 20px;
	text-align: center;
}
.solo {
	justify-items: stretch;
	text-align: left;
}
.spectator__emoji {
	font-size: 3rem;
}
.invite {
	display: grid;
	gap: 16px;
}
.invite__code {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}
.invite__code strong {
	padding: 2px 10px;
	border: 2px solid var(--line);
	border-radius: 8px;
	background: var(--sun);
	color: #1f1b2e;
	font-family: var(--font-display);
	letter-spacing: 0.12em;
}
.viewer {
	display: grid;
	gap: 12px;
}
.viewer :deep(.grid) {
	max-width: min(100%, 560px, calc(100dvh - 220px));
	justify-self: center;
}
.tabs {
	display: none;
}
@media (max-width: 900px) {
	.layout {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: none;
		grid-template-areas: 'bar' 'grid' 'players' 'chat';
		/* Hidden tabs leave empty rows: no gap between them, spacing on the bar. */
		row-gap: 0;
	}
	.bar {
		margin-bottom: 16px;
	}
	.live--solo .layout {
		grid-template-rows: none;
		grid-template-areas: 'bar' 'grid' 'chat';
	}
	.live:not(.live--solo) .pane {
		display: none;
	}
	.live[data-tab='grid'] .pane--grid,
	.live[data-tab='players'] .pane--players,
	.live[data-tab='chat'] .pane--chat {
		display: grid;
	}
	.live--solo .pane {
		display: grid;
	}
	.pane--chat {
		position: static;
		/* site header + layout padding + tab bar */
		height: calc(100dvh - 180px);
		min-height: 300px;
	}
	/* The chat tab gets the whole screen: the room title is on the other tabs. */
	.live[data-tab='chat'] .bar {
		display: none;
	}
	.live:not(.live--solo) {
		padding-bottom: 76px;
	}
	.tabs {
		position: fixed;
		z-index: 45;
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
		border-top: var(--border);
		background: var(--surface);
	}
	.tabs__btn {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 48px;
		border: 2px solid transparent;
		border-radius: var(--radius-m);
		background: none;
		font-family: var(--font-display);
		font-weight: 600;
		cursor: pointer;
	}
	.tabs__btn[aria-current='page'] {
		border-color: var(--line);
		background: var(--sun);
		color: #1f1b2e;
		box-shadow: var(--shadow-s);
	}
	.tabs__badge {
		position: absolute;
		top: 2px;
		right: 12%;
		min-width: 22px;
		padding: 0 6px;
		border: 2px solid var(--line);
		border-radius: 999px;
		background: var(--accent);
		color: #fff;
		font-size: 0.75rem;
		line-height: 18px;
	}
	.bar__leave {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
	}
}
@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
@keyframes pulse {
	50% {
		transform: scale(1.06);
	}
}
</style>
