<script setup lang="ts">
import { CLOSE_CODES, type Membership, type ParticipantView } from '@bingo/shared'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCelebration } from '../composables/useCelebration'
import { useRoom } from '../composables/useRoom'
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
	if (status.value === 'reconnecting') return 'Connexion perdue, on se reconnecte…'
	if (status.value === 'connecting') return 'Connexion…'
	return ''
})
</script>

<template>
	<!-- Final screens -->
	<div v-if="state.kicked || endedWith === CLOSE_CODES.kicked" class="container ended">
		<p class="ended__emoji" aria-hidden="true">🚪</p>
		<h1>Vous avez été exclu du salon</h1>
		<p class="muted">L’hôte vous a retiré de la partie.</p>
		<AppButton to="/salons" icon="globe">Voir les autres salons</AppButton>
	</div>
	<div v-else-if="state.closed || endedWith === CLOSE_CODES.roomClosed" class="container ended">
		<p class="ended__emoji" aria-hidden="true">🌙</p>
		<h1>Le salon est fermé</h1>
		<p class="muted">
			{{ state.closed === 'inactive' ? 'Aucune activité depuis 2 jours.' : 'Plus personne n’était connecté.' }}
		</p>
		<AppButton to="/creer" icon="plus">Créer un nouveau salon</AppButton>
	</div>
	<div v-else-if="endedWith === CLOSE_CODES.replaced" class="container ended">
		<p class="ended__emoji" aria-hidden="true">🪟</p>
		<h1>Partie ouverte dans un autre onglet</h1>
		<p class="muted">Vous ne pouvez jouer que dans un onglet à la fois.</p>
		<AppButton icon="refresh" @click="emit('reconnect')">Jouer ici</AppButton>
	</div>

	<div v-else-if="!state.ready" class="container ended" aria-busy="true">
		<span class="spinner" aria-hidden="true" />
		<p>{{ statusText || 'Connexion…' }}</p>
	</div>

	<!-- Live room -->
	<div v-else-if="room" class="live" :class="{ 'live--solo': solo }" :data-tab="tab">
		<AnnouncementBanner :current="announcement" />

		<div v-if="statusText" class="live__status" role="status">
			<AppIcon name="wifiOff" :size="18" /> {{ statusText }}
		</div>

		<header class="bar container">
			<div class="bar__title">
				<p class="eyebrow">{{ solo ? 'Partie solo' : `Salon ${room.code}` }}</p>
				<h1 class="bar__name">{{ room.name }}</h1>
				<p class="bar__meta">
					<span><AppIcon name="book" :size="16" /> {{ room.dictionary.title }}</span>
					<span v-if="!solo"><AppIcon name="users" :size="16" /> {{ players }}/{{ room.maxPlayers }}</span>
					<span v-if="spectators"><AppIcon name="eye" :size="16" /> {{ spectators }}</span>
					<span v-if="room.hasPassword"><AppIcon name="lock" :size="16" /> Privé</span>
				</p>
			</div>
			<div class="bar__actions">
				<AppButton v-if="!solo" variant="sun" icon="users" @click="shareOpen = true">Inviter</AppButton>
				<AppButton variant="secondary" icon="logout" @click="leaveOpen = true">
					<span class="bar__leave">Quitter</span>
				</AppButton>
			</div>
		</header>

		<div class="layout container">
			<!-- My grid -->
			<section class="pane pane--grid" aria-labelledby="my-grid-title">
				<template v-if="me?.cells">
					<div class="pane__head">
						<h2 id="my-grid-title">Ma grille</h2>
						<p class="progress" aria-live="polite">
							<span class="progress__chip">{{ me.checked.length }}/{{ totalCells }} cases</span>
							<span class="progress__chip progress__chip--lines">
								{{ me.completedLines.length }} ligne{{ me.completedLines.length > 1 ? 's' : '' }}
							</span>
							<span v-if="meFull" class="progress__chip progress__chip--full">Carton plein !</span>
						</p>
					</div>
					<BingoGrid
						ref="grid"
						:size="room.gridSize"
						:cells="me.cells"
						:checked="me.checked"
						:completed-lines="me.completedLines"
						interactive
						:label="`Ma grille de bingo, ${me.checked.length} cases cochées sur ${totalCells}`"
						@toggle="toggle"
						@line-completed="onLineCompleted"
					/>
					<p class="pane__hint muted">Touchez une case quand l’expression tombe. Touchez-la à nouveau pour la décocher.</p>
				</template>
				<div v-else class="spectator card">
					<p class="spectator__emoji" aria-hidden="true">👀</p>
					<h2 id="my-grid-title">Vous êtes spectateur</h2>
					<p class="muted">Suivez les grilles des joueurs et réagissez dans le fil du salon.</p>
				</div>
			</section>

			<!-- Players -->
			<section v-if="!solo" class="pane pane--players" aria-labelledby="players-title">
				<div class="pane__head">
					<h2 id="players-title">Classement</h2>
					<span class="muted">{{ state.participants.length }} présent{{ state.participants.length > 1 ? 's' : '' }}</span>
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
				<p v-if="others.length === 0" class="muted">Personne d’autre pour l’instant : partagez le lien !</p>
			</section>

			<!-- Chat, or share box in solo -->
			<aside class="pane pane--chat" :aria-label="solo ? 'Partager' : 'Discussion'">
				<ChatPanel v-if="!solo" :messages="state.messages" :me="state.me" :can-write="true" @send="chat" />
				<div v-else class="solo card">
					<h2>Partagez ce dictionnaire</h2>
					<p class="muted">Vos amis pourront créer un salon ou jouer en solo avec les mêmes expressions.</p>
					<ShareBox :link="dictionaryLink(room.dictionary.code)" label="Lien du dictionnaire" :title="room.dictionary.title" />
					<AppButton :to="`/creer?d=${room.dictionary.code}`" variant="secondary" icon="users">
						En faire un salon multijoueur
					</AppButton>
				</div>
			</aside>
		</div>

		<!-- Mobile tab bar -->
		<nav v-if="!solo" class="tabs" aria-label="Sections du salon">
			<button type="button" class="tabs__btn" :aria-current="tab === 'grid' ? 'page' : undefined" @click="tab = 'grid'">
				<AppIcon name="grid" /> <span>Grille</span>
			</button>
			<button type="button" class="tabs__btn" :aria-current="tab === 'players' ? 'page' : undefined" @click="tab = 'players'">
				<AppIcon name="trophy" /> <span>Joueurs</span>
			</button>
			<button type="button" class="tabs__btn" :aria-current="tab === 'chat' ? 'page' : undefined" @click="tab = 'chat'">
				<AppIcon name="chat" /> <span>Chat</span>
				<span v-if="unread" class="tabs__badge" :aria-label="`${unread} non lus`">{{ unread > 99 ? '99+' : unread }}</span>
			</button>
		</nav>

		<!-- Invite -->
		<AppModal v-model:open="shareOpen" title="Invitez vos amis">
			<div class="invite">
				<ShareBox :link="link" label="Lien du salon" :title="room.name" />
				<p class="invite__code">
					Ou donnez le code <strong>{{ room.code }}</strong>
					<template v-if="room.hasPassword"> et le mot de passe</template>.
				</p>
				<ShareBox :link="dictionaryLink(room.dictionary.code)" label="Lien du dictionnaire" :title="room.dictionary.title" />
			</div>
		</AppModal>

		<!-- Somebody else's grid (read only) -->
		<AppModal v-model:open="viewingOpen" :title="viewed ? `Grille de ${viewed.name}` : 'Grille'" wide>
			<div v-if="viewed?.cells" class="viewer">
				<BingoGrid
					:size="room.gridSize"
					:cells="viewed.cells"
					:checked="viewed.checked"
					:completed-lines="viewed.completedLines"
					:label="`Grille de ${viewed.name}`"
				/>
				<p class="muted">{{ viewed.checked.length }}/{{ totalCells }} cases · {{ viewed.completedLines.length }} ligne(s). La grille se met à jour en direct.</p>
			</div>
			<p v-else class="muted">Cette personne a quitté le salon.</p>
		</AppModal>

		<!-- Confirmations -->
		<AppModal v-model:open="kickOpen" title="Exclure du salon ?">
			<p>{{ kickTarget?.name }} sera retiré de la partie et perdra sa grille.</p>
			<template #footer>
				<AppButton variant="secondary" @click="kickTarget = null">Annuler</AppButton>
				<AppButton variant="danger" icon="userX" @click="confirmKick">Exclure</AppButton>
			</template>
		</AppModal>
		<AppModal v-model:open="leaveOpen" title="Quitter le salon ?">
			<p>
				Votre grille sera perdue.
				<template v-if="isOwner && !solo"> Le rôle d’hôte passera au joueur suivant.</template>
				Pour revenir plus tard sans rien perdre, fermez simplement l’onglet.
			</p>
			<template #footer>
				<AppButton variant="secondary" @click="leaveOpen = false">Rester</AppButton>
				<AppButton variant="danger" icon="logout" @click="confirmLeave">Quitter</AppButton>
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
	position: sticky;
	top: 64px;
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
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 14px;
	padding-top: 22px;
	padding-bottom: 18px;
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
.layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
	grid-template-areas:
		'grid chat'
		'players chat';
	align-items: start;
	gap: 24px;
}
.live--solo .layout {
	grid-template-areas: 'grid chat';
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
	top: 84px;
	height: calc(100dvh - 108px);
	min-height: 420px;
}
.live--solo .pane--chat {
	height: auto;
	min-height: 0;
}
.pane--grid > :deep(.grid) {
	max-width: min(100%, 680px, calc(100dvh - 300px));
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
		grid-template-areas: 'grid' 'players' 'chat';
	}
	.live--solo .layout {
		grid-template-areas: 'grid' 'chat';
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
		height: calc(100dvh - 250px);
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
