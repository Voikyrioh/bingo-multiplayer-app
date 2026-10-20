<script setup lang="ts">
import type { Membership, RoomPreview } from '@bingo/shared'
import { onMounted, ref } from 'vue'
import { ApiRequestError, api } from '../api/http'
import JoinForm from '../components/JoinForm.vue'
import RoomLive from '../components/RoomLive.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppIcon from '../components/ui/AppIcon.vue'
import { useI18n } from '../i18n/useI18n'
import { usePageTitle } from '../i18n/usePageTitle'
import { forgetMembership, membershipFor, saveMembership } from '../lib/identity'

const props = defineProps<{ code: string }>()
const { t, tc, errorText, languageName } = useI18n()

const preview = ref<RoomPreview | null>(null)
const membership = ref<Membership | null>(membershipFor(props.code))
const problem = ref<'not-found' | 'error' | null>(null)
const failure = ref<unknown>(null)
const loading = ref(true)
const liveKey = ref(0)

async function load() {
	loading.value = true
	problem.value = null
	try {
		preview.value = await api.previewRoom(props.code)
	} catch (e) {
		problem.value = e instanceof ApiRequestError && e.status === 404 ? 'not-found' : 'error'
		failure.value = e
	} finally {
		loading.value = false
	}
}

onMounted(load)
usePageTitle(() => preview.value?.name ?? t('roomPage.tabTitle'))

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
		<p>{{ t('roomPage.opening') }}</p>
	</div>

	<div v-else-if="problem === 'not-found'" class="container state">
		<p class="state__emoji" aria-hidden="true">🔍</p>
		<h1>{{ t('roomPage.notFoundTitle') }}</h1>
		<p class="muted">{{ t('roomPage.notFoundText', { code }) }}</p>
		<div class="state__actions">
			<AppButton to="/salons" icon="globe">{{ t('roomPage.seeRooms') }}</AppButton>
			<AppButton to="/creer" variant="secondary" icon="plus">{{ t('rooms.create') }}</AppButton>
		</div>
	</div>

	<div v-else-if="problem === 'error' && !membership" class="container state">
		<p class="state__emoji" aria-hidden="true">📡</p>
		<h1>{{ t('roomPage.errorTitle') }}</h1>
		<p class="muted">{{ errorText(failure) }}</p>
		<AppButton icon="refresh" @click="load">{{ t('common.retry') }}</AppButton>
	</div>

	<RoomLive v-else-if="membership" :key="liveKey" :membership="membership" @forget="onForget" @reconnect="reconnect" />

	<div v-else-if="preview?.closed" class="container state">
		<p class="state__emoji" aria-hidden="true">🌙</p>
		<h1>{{ t('roomPage.closedTitle') }}</h1>
		<p class="muted">{{ t('roomPage.closedText') }}</p>
		<div class="state__actions">
			<AppButton to="/creer" icon="plus">{{ t('room.createNew') }}</AppButton>
		</div>
	</div>

	<div v-else-if="preview?.mode === 'solo'" class="container state">
		<p class="state__emoji" aria-hidden="true">🧘</p>
		<h1>{{ t('roomPage.soloTitle') }}</h1>
		<p class="muted">{{ t('roomPage.soloText') }}</p>
		<AppButton to="/solo" icon="play">{{ t('roomPage.soloStart') }}</AppButton>
	</div>

	<div v-else-if="preview" class="container join-page">
		<section class="join-card card" aria-labelledby="join-title">
			<p class="eyebrow">{{ t('roomPage.invitation') }}</p>
			<h1 id="join-title">{{ preview.name }}</h1>
			<ul class="join-card__facts">
				<li :lang="preview.language"><AppIcon name="book" :size="18" /> {{ preview.dictionaryTitle }}</li>
				<li><AppIcon name="language" :size="18" /> {{ languageName(preview.language) }}</li>
				<li><AppIcon name="users" :size="18" /> {{ tc('rooms.players', preview.players, { max: preview.maxPlayers }) }}</li>
				<li v-if="preview.spectators"><AppIcon name="eye" :size="18" /> {{ tc('rooms.spectators', preview.spectators) }}</li>
				<li><AppIcon name="grid" :size="18" /> {{ t('rooms.gridSize', { size: preview.gridSize }) }}</li>
				<li v-if="preview.hasPassword"><AppIcon name="lock" :size="18" /> {{ t('rooms.passwordRequired') }}</li>
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
