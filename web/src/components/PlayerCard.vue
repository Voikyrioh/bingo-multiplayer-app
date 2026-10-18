<script setup lang="ts">
import type { ParticipantView } from '@bingo/shared'
import { computed } from 'vue'
import MiniGrid from './MiniGrid.vue'
import AppIcon from './ui/AppIcon.vue'

const props = defineProps<{
	participant: ParticipantView
	size: number
	rank: number
	isMe: boolean
	canKick: boolean
}>()
defineEmits<{ open: []; kick: [] }>()

const lines = computed(() => props.participant.completedLines.length)
const isPlayer = computed(() => props.participant.role === 'player' && props.participant.cells)
const summary = computed(() => {
	if (!isPlayer.value) return 'Spectateur'
	if (props.participant.fullAt) return 'Carton plein !'
	const cells = props.participant.checked.length
	return `${cells}/${props.size * props.size} cases · ${lines.value} ligne${lines.value > 1 ? 's' : ''}`
})
</script>

<template>
	<li class="player" :class="{ 'player--me': isMe, 'player--full': participant.fullAt, 'player--offline': !participant.online }">
		<button
			v-if="isPlayer"
			type="button"
			class="player__main"
			:aria-label="`Voir la grille de ${participant.name} : ${summary}`"
			@click="$emit('open')"
		>
			<MiniGrid :size="size" :total="size * size" :checked="participant.checked" :completed-lines="participant.completedLines" />
			<span class="player__info">
				<span class="player__name">
					<span class="player__rank" aria-hidden="true">{{ rank }}</span>
					<span class="player__label">{{ participant.name }}</span>
					<span v-if="isMe" class="player__tag">vous</span>
				</span>
				<span class="player__summary">{{ summary }}</span>
			</span>
		</button>
		<div v-else class="player__main player__main--static">
			<span class="player__avatar" aria-hidden="true"><AppIcon name="eye" /></span>
			<span class="player__info">
				<span class="player__name">
					<span class="player__label">{{ participant.name }}</span>
					<span v-if="isMe" class="player__tag">vous</span>
				</span>
				<span class="player__summary">{{ summary }}</span>
			</span>
		</div>
		<span class="player__badges">
			<span v-if="participant.isOwner" class="player__badge" title="Hôte du salon">
				<AppIcon name="crown" :size="16" label="Hôte du salon" />
			</span>
			<span
				class="player__dot"
				:class="{ 'player__dot--on': participant.online }"
				role="img"
				:aria-label="participant.online ? 'En ligne' : 'Hors ligne'"
			/>
			<button
				v-if="canKick && !isMe"
				type="button"
				class="player__kick"
				:aria-label="`Exclure ${participant.name}`"
				@click="$emit('kick')"
			>
				<AppIcon name="userX" :size="18" />
			</button>
		</span>
	</li>
</template>

<style scoped>
.player {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px 8px 8px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--surface);
	box-shadow: var(--shadow-s);
	transition: transform 0.2s var(--ease-bounce);
}
.player--me {
	background: var(--sky-soft);
}
.player--full {
	background: var(--sun-soft);
	animation: glow 2s ease-in-out infinite;
}
.player--offline .player__info {
	opacity: 0.6;
}
.player__main {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 0;
	border: 0;
	background: none;
	text-align: left;
	cursor: pointer;
	border-radius: var(--radius-s);
}
.player__main--static {
	cursor: default;
}
.player__avatar {
	display: grid;
	place-items: center;
	width: 56px;
	height: 56px;
	border: 2px dashed var(--ink-3);
	border-radius: 8px;
	color: var(--ink-3);
}
.player__info {
	display: grid;
	min-width: 0;
}
.player__name {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	font-family: var(--font-display);
	font-weight: 600;
}
.player__label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.player__rank {
	flex: none;
	display: grid;
	place-items: center;
	width: 22px;
	height: 22px;
	border: 2px solid var(--line);
	border-radius: 50%;
	background: var(--sun);
	color: #1f1b2e;
	font-size: 0.75rem;
}
.player__tag {
	flex: none;
	padding: 0 6px;
	border-radius: 999px;
	background: var(--primary);
	color: var(--primary-ink);
	font-size: 0.7rem;
}
.player__summary {
	font-size: 0.85rem;
	color: var(--ink-2);
}
.player__badges {
	flex: none;
	display: flex;
	align-items: center;
	gap: 6px;
}
.player__badge {
	display: grid;
	color: #b88300;
}
.player__dot {
	width: 10px;
	height: 10px;
	border: 2px solid var(--line);
	border-radius: 50%;
	background: var(--ink-3);
}
.player__dot--on {
	background: var(--mint);
}
.player__kick {
	display: grid;
	place-items: center;
	width: 34px;
	height: 34px;
	border: 2px solid transparent;
	border-radius: 50%;
	background: none;
	color: var(--danger);
	cursor: pointer;
}
.player__kick:hover {
	border-color: var(--danger);
	background: var(--accent-soft);
}
@keyframes glow {
	50% {
		box-shadow: 2px 3px 0 var(--line), 0 0 0 4px var(--sun);
	}
}
</style>
