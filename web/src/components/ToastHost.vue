<script setup lang="ts">
import { useToasts } from '../composables/useToasts'
import AppIcon from './ui/AppIcon.vue'

const { toasts, dismiss } = useToasts()
</script>

<template>
	<div class="toasts" role="status" aria-live="polite">
		<TransitionGroup name="toast">
			<div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast--${toast.tone}`">
				<span>{{ toast.text }}</span>
				<button type="button" class="toast__close" @click="dismiss(toast.id)">
					<AppIcon name="x" :size="16" label="Fermer la notification" />
				</button>
			</div>
		</TransitionGroup>
	</div>
</template>

<style scoped>
.toasts {
	position: fixed;
	z-index: 80;
	bottom: calc(16px + env(safe-area-inset-bottom));
	left: 50%;
	transform: translateX(-50%);
	display: grid;
	gap: 8px;
	width: min(440px, calc(100vw - 2 * var(--gutter)));
}
.toast {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 10px 10px 16px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--ink);
	color: var(--bg);
	font-weight: 700;
	box-shadow: var(--shadow-m);
}
.toast--success {
	background: var(--mint);
	color: #1f1b2e;
}
.toast--error {
	background: var(--danger);
	color: #fff;
}
.toast__close {
	display: grid;
	place-items: center;
	width: 30px;
	height: 30px;
	border: 0;
	border-radius: 50%;
	background: rgb(255 255 255 / 0.2);
	color: inherit;
	cursor: pointer;
}
.toast-enter-active,
.toast-leave-active {
	transition: all 0.3s var(--ease-bounce);
}
.toast-enter-from,
.toast-leave-to {
	transform: translateY(20px);
	opacity: 0;
}
</style>
