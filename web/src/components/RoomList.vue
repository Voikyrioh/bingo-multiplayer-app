<script setup lang="ts">
import type { LanguageCode, RoomSummary } from '@bingo/shared'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '../api/http'
import { useI18n } from '../i18n/useI18n'
import LanguageFilter from './LanguageFilter.vue'
import RoomCard from './RoomCard.vue'
import AppButton from './ui/AppButton.vue'

// Public rooms in progress, refreshed every 15 s while the page is visible.
// Filtered by the language of their dictionary, the interface language first.
const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 0 })
const { t, errorText, language } = useI18n()
const filter = ref<LanguageCode | 'all'>(language.value.code)
const rooms = ref<RoomSummary[]>([])
const loading = ref(true)
const error = ref<unknown>(null)
let timer: ReturnType<typeof setInterval> | null = null

async function load() {
	try {
		const list = await api.listRooms(filter.value === 'all' ? undefined : filter.value)
		rooms.value = props.limit ? list.slice(0, props.limit) : list
		error.value = null
	} catch (e) {
		error.value = e
	} finally {
		loading.value = false
	}
}

watch(filter, () => {
	loading.value = true
	void load()
})

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
		<LanguageFilter v-model="filter" class="rooms__filter" />
		<p v-if="loading" class="rooms__state">{{ t('rooms.loading') }}</p>
		<div v-else-if="error" class="rooms__state">
			<p>{{ errorText(error) }}</p>
			<AppButton variant="secondary" size="sm" icon="refresh" @click="load">{{ t('common.retry') }}</AppButton>
		</div>
		<div v-else-if="rooms.length === 0" class="rooms__empty card">
			<p class="rooms__empty-emoji" aria-hidden="true">🦗</p>
			<p><strong>{{ filter === 'all' ? t('rooms.empty') : t('rooms.emptyInLanguage') }}</strong></p>
			<p class="muted">{{ t('rooms.emptyHint') }}</p>
			<div class="rooms__actions">
				<AppButton to="/creer" icon="plus">{{ t('rooms.create') }}</AppButton>
				<AppButton v-if="filter !== 'all'" variant="secondary" icon="globe" @click="filter = 'all'">
					{{ t('filter.showAll') }}
				</AppButton>
			</div>
		</div>
		<ul v-else class="rooms__grid">
			<RoomCard v-for="room in rooms" :key="room.code" :room="room" />
		</ul>
	</div>
</template>

<style scoped>
.rooms {
	display: grid;
	gap: 18px;
}
.rooms__filter {
	justify-self: start;
}
.rooms__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
}
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
