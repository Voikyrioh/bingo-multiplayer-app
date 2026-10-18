<script setup lang="ts">
import type { RoomSummary } from '@bingo/shared'
import { RouterLink } from 'vue-router'
import { timeAgo } from '../lib/format'
import AppIcon from './ui/AppIcon.vue'

defineProps<{ room: RoomSummary }>()
</script>

<template>
	<li class="room">
		<RouterLink :to="`/r/${room.code}`" class="room__link">
			<span class="room__top">
				<span class="room__name">{{ room.name }}</span>
				<span v-if="room.hasPassword" class="room__lock" title="Mot de passe requis">
					<AppIcon name="lock" :size="16" label="Mot de passe requis" />
				</span>
			</span>
			<span class="room__dict"><AppIcon name="book" :size="16" /> {{ room.dictionaryTitle }}</span>
			<span class="room__meta">
				<span class="room__chip"><AppIcon name="users" :size="16" /> {{ room.players }}/{{ room.maxPlayers }}</span>
				<span v-if="room.spectators" class="room__chip"><AppIcon name="eye" :size="16" /> {{ room.spectators }}</span>
				<span class="room__chip">{{ room.gridSize }}×{{ room.gridSize }}</span>
				<span class="room__ago">{{ timeAgo(room.lastActivityAt) }}</span>
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
