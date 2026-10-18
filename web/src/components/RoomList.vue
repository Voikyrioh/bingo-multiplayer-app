<script setup lang="ts">
import type { RoomSummary } from '@bingo/shared'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api/http'
import RoomCard from './RoomCard.vue'
import AppButton from './ui/AppButton.vue'

// Public rooms in progress, refreshed every 15 s while the page is visible.
const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 0 })
const rooms = ref<RoomSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

async function load() {
	try {
		const list = await api.listRooms()
		rooms.value = props.limit ? list.slice(0, props.limit) : list
		error.value = null
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

function onVisibility() {
	if (document.visibilityState === 'visible') void load()
}

onMounted(() => {
	void load()
	timer = setInterval(() => document.visibilityState === 'visible' && load(), 15_000)
	document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
	if (timer) clearInterval(timer)
	document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
	<div class="rooms" :aria-busy="loading">
		<p v-if="loading" class="rooms__state">Chargement des salons…</p>
		<div v-else-if="error" class="rooms__state">
			<p>{{ error }}</p>
			<AppButton variant="secondary" size="sm" icon="refresh" @click="load">Réessayer</AppButton>
		</div>
		<div v-else-if="rooms.length === 0" class="rooms__empty card">
			<p class="rooms__empty-emoji" aria-hidden="true">🦗</p>
			<p><strong>Aucun salon public en cours.</strong></p>
			<p class="muted">Lancez le premier, vos amis vous rejoindront avec le lien.</p>
			<AppButton to="/creer" icon="plus">Créer un salon</AppButton>
		</div>
		<ul v-else class="rooms__grid">
			<RoomCard v-for="room in rooms" :key="room.code" :room="room" />
		</ul>
	</div>
</template>

<style scoped>
.rooms__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
	gap: 18px;
}
.rooms__state {
	display: flex;
	align-items: center;
	gap: 12px;
	color: var(--ink-3);
}
.rooms__empty {
	display: grid;
	justify-items: center;
	gap: 8px;
	padding: 28px 20px;
	text-align: center;
}
.rooms__empty-emoji {
	font-size: 2.5rem;
}
</style>
