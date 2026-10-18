<script setup lang="ts">
import type { Membership, RoomPreview } from '@bingo/shared'
import { onMounted, ref } from 'vue'
import { ApiRequestError, api } from '../api/http'
import JoinForm from '../components/JoinForm.vue'
import RoomLive from '../components/RoomLive.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppIcon from '../components/ui/AppIcon.vue'
import { forgetMembership, membershipFor, saveMembership } from '../lib/identity'

const props = defineProps<{ code: string }>()

const preview = ref<RoomPreview | null>(null)
const membership = ref<Membership | null>(membershipFor(props.code))
const problem = ref<'not-found' | 'error' | null>(null)
const errorText = ref('')
const loading = ref(true)
const liveKey = ref(0)

async function load() {
	loading.value = true
	problem.value = null
	try {
		preview.value = await api.previewRoom(props.code)
		document.title = `${preview.value.name} · Bingo Live`
	} catch (e) {
		problem.value = e instanceof ApiRequestError && e.status === 404 ? 'not-found' : 'error'
		errorText.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

onMounted(load)

function onJoined(m: Membership) {
	saveMembership(m)
	membership.value = m
}

/** The stored token is no longer valid (kicked, room purged...): show the join form again. */
function onForget() {
	forgetMembership(props.code)
	membership.value = null
	void load()
}

function reconnect() {
	liveKey.value++
}
</script>

<template>
	<div v-if="loading && !membership" class="container state" aria-busy="true">
		<span class="state__spinner" aria-hidden="true" />
		<p>Ouverture du salon…</p>
	</div>

	<div v-else-if="problem === 'not-found'" class="container state">
		<p class="state__emoji" aria-hidden="true">🔍</p>
		<h1>Ce salon n’existe pas</h1>
		<p class="muted">Vérifiez le code <strong>{{ code }}</strong>, ou le salon a peut-être été supprimé.</p>
		<div class="state__actions">
			<AppButton to="/salons" icon="globe">Voir les salons</AppButton>
			<AppButton to="/creer" variant="secondary" icon="plus">Créer un salon</AppButton>
		</div>
	</div>

	<div v-else-if="problem === 'error' && !membership" class="container state">
		<p class="state__emoji" aria-hidden="true">📡</p>
		<h1>Impossible d’ouvrir le salon</h1>
		<p class="muted">{{ errorText }}</p>
		<AppButton icon="refresh" @click="load">Réessayer</AppButton>
	</div>

	<RoomLive v-else-if="membership" :key="liveKey" :membership="membership" @forget="onForget" @reconnect="reconnect" />

	<div v-else-if="preview?.closed" class="container state">
		<p class="state__emoji" aria-hidden="true">🌙</p>
		<h1>Ce salon est fermé</h1>
		<p class="muted">Il est resté inactif trop longtemps ou tout le monde est parti.</p>
		<div class="state__actions">
			<AppButton to="/creer" icon="plus">Créer un nouveau salon</AppButton>
		</div>
	</div>

	<div v-else-if="preview?.mode === 'solo'" class="container state">
		<p class="state__emoji" aria-hidden="true">🧘</p>
		<h1>C’est une partie solo</h1>
		<p class="muted">Elle ne se rejoint pas, mais vous pouvez jouer avec le même dictionnaire.</p>
		<AppButton to="/solo" icon="play">Lancer ma partie solo</AppButton>
	</div>

	<div v-else-if="preview" class="container join-page">
		<section class="join-card card" aria-labelledby="join-title">
			<p class="eyebrow">Invitation</p>
			<h1 id="join-title">{{ preview.name }}</h1>
			<ul class="join-card__facts">
				<li><AppIcon name="book" :size="18" /> {{ preview.dictionaryTitle }}</li>
				<li><AppIcon name="users" :size="18" /> {{ preview.players }}/{{ preview.maxPlayers }} joueurs</li>
				<li v-if="preview.spectators"><AppIcon name="eye" :size="18" /> {{ preview.spectators }} spectateurs</li>
				<li><AppIcon name="grid" :size="18" /> Grille {{ preview.gridSize }}×{{ preview.gridSize }}</li>
				<li v-if="preview.hasPassword"><AppIcon name="lock" :size="18" /> Mot de passe requis</li>
			</ul>
			<JoinForm :preview="preview" @joined="onJoined" />
		</section>
	</div>
</template>

<style scoped>
.state {
	display: grid;
	justify-items: center;
	gap: 14px;
	padding-top: 72px;
	text-align: center;
}
.state h1 {
	font-size: clamp(1.8rem, 5vw, 2.4rem);
}
.state__emoji {
	font-size: 3.5rem;
}
.state__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 12px;
}
.state__spinner {
	width: 48px;
	height: 48px;
	border: 5px solid var(--primary);
	border-right-color: transparent;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}
.join-page {
	display: grid;
	place-items: center;
	padding-top: 40px;
}
.join-card {
	display: grid;
	gap: 16px;
	width: min(100%, 520px);
	padding: 24px;
	transform: rotate(-0.5deg);
}
.join-card h1 {
	font-size: clamp(1.8rem, 5vw, 2.3rem);
	overflow-wrap: anywhere;
}
.join-card__facts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
.join-card__facts li {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border: 2px solid var(--line);
	border-radius: 999px;
	background: var(--surface-2);
	font-size: 0.9rem;
	font-weight: 700;
}
@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
