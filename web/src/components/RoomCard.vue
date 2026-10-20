<script setup lang="ts">
import type { RoomSummary } from '@bingo/shared'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from '../i18n/useI18n'
import { timeAgo } from '../lib/format'
import AppIcon from './ui/AppIcon.vue'

const props = defineProps<{ room: RoomSummary }>()
const { t, tc, locale, languageName: nameOf } = useI18n()
const languageName = computed(() => nameOf(props.room.language))
</script>

<template>
	<li class="room">
		<RouterLink :to="`/r/${room.code}`" class="room__link">
			<span class="room__top">
				<span class="room__name">{{ room.name }}</span>
				<span class="room__badges">
					<span class="room__lang" :title="languageName" :lang="room.language">
						<span aria-hidden="true">{{ room.language }}</span>
						<span class="visually-hidden">{{ t('rooms.language', { language: languageName }) }}</span>
					</span>
					<span v-if="room.hasPassword" class="room__lock" :title="t('rooms.passwordRequired')">
						<AppIcon name="lock" :size="16" :label="t('rooms.passwordRequired')" />
					</span>
				</span>
			</span>
			<span class="room__dict" :lang="room.language"><AppIcon name="book" :size="16" /> {{ room.dictionaryTitle }}</span>
			<span class="room__meta">
				<span class="room__chip" :title="tc('rooms.players', room.players, { max: room.maxPlayers })">
					<AppIcon name="users" :size="16" />
					<span aria-hidden="true">{{ room.players }}/{{ room.maxPlayers }}</span>
					<span class="visually-hidden">{{ tc('rooms.players', room.players, { max: room.maxPlayers }) }}</span>
				</span>
				<span v-if="room.spectators" class="room__chip" :title="tc('rooms.spectators', room.spectators)">
					<AppIcon name="eye" :size="16" />
					<span aria-hidden="true">{{ room.spectators }}</span>
					<span class="visually-hidden">{{ tc('rooms.spectators', room.spectators) }}</span>
				</span>
				<span class="room__chip">
					<span aria-hidden="true">{{ room.gridSize }}×{{ room.gridSize }}</span>
					<span class="visually-hidden">{{ t('rooms.gridSize', { size: room.gridSize }) }}</span>
				</span>
				<span class="room__ago">{{ timeAgo(room.lastActivityAt, locale) }}</span>
			</span>
		</RouterLink>
	</li>
</template>

<style scoped>
.room__link {
	display: grid;
	gap: 8px;
	height: 100%;
	padding: 16px;
	border: var(--border);
	border-radius: var(--radius-l);
	background: var(--surface);
	color: var(--ink);
	text-decoration: none;
	font-weight: 400;
	box-shadow: var(--shadow-m);
	transition: transform 0.2s var(--ease-bounce);
}
.room:nth-child(3n + 1) .room__link:hover {
	transform: translateY(-3px) rotate(-1deg);
}
.room:nth-child(3n + 2) .room__link:hover {
	transform: translateY(-3px) rotate(1deg);
}
.room:nth-child(3n) .room__link:hover {
	transform: translateY(-3px);
}
.room__top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 8px;
}
.room__name {
	font-family: var(--font-display);
	font-weight: 600;
	font-size: 1.2rem;
	overflow-wrap: anywhere;
}
.room__badges {
	flex: none;
	display: flex;
	gap: 6px;
}
.room__lang {
	display: grid;
	place-items: center;
	min-width: 34px;
	height: 30px;
	padding: 0 6px;
	border: 2px solid var(--line);
	border-radius: 8px;
	background: var(--sky-soft);
	font-family: var(--font-display);
	font-weight: 600;
	font-size: 0.8rem;
	text-transform: uppercase;
}
.room__lock {
	flex: none;
	display: grid;
	place-items: center;
	width: 30px;
	height: 30px;
	border: 2px solid var(--line);
	border-radius: 50%;
	background: var(--accent-soft);
}
.room__dict {
	display: flex;
	align-items: center;
	gap: 6px;
	color: var(--ink-2);
	font-size: 0.95rem;
}
.room__meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
}
.room__chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px;
	border: 2px solid var(--line);
	border-radius: 999px;
	background: var(--surface-2);
	font-size: 0.85rem;
	font-weight: 700;
}
.room__ago {
	margin-left: auto;
	font-size: 0.85rem;
	color: var(--ink-3);
}
</style>
