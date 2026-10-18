<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { IconName } from '../../lib/icons'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
	defineProps<{
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'sun'
		size?: 'sm' | 'md' | 'lg'
		icon?: IconName
		iconRight?: IconName
		to?: string
		type?: 'button' | 'submit'
		loading?: boolean
		disabled?: boolean
		block?: boolean
	}>(),
	{ variant: 'primary', size: 'md', type: 'button' },
)

const classes = computed(() => [
	'btn',
	`btn--${props.variant}`,
	`btn--${props.size}`,
	{ 'btn--block': props.block, 'btn--loading': props.loading },
])
</script>

<template>
	<RouterLink v-if="to" :to="to" :class="classes">
		<AppIcon v-if="icon" :name="icon" />
		<span class="btn__label"><slot /></span>
		<AppIcon v-if="iconRight" :name="iconRight" />
	</RouterLink>
	<button
		v-else
		:type="type"
		:class="classes"
		:disabled="disabled || loading"
		:aria-busy="loading || undefined"
	>
		<span v-if="loading" class="btn__spinner" aria-hidden="true" />
		<AppIcon v-else-if="icon" :name="icon" />
		<span class="btn__label"><slot /></span>
		<AppIcon v-if="iconRight" :name="iconRight" />
	</button>
</template>

<style scoped>
.btn {
	--btn-bg: var(--primary);
	--btn-ink: var(--primary-ink);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 44px;
	padding: 0 18px;
	border: var(--border);
	border-radius: 999px;
	background: var(--btn-bg);
	color: var(--btn-ink);
	box-shadow: var(--shadow-s);
	font-family: var(--font-display);
	font-weight: 600;
	font-size: 1rem;
	text-decoration: none;
	cursor: pointer;
	transition:
		transform 0.15s var(--ease-bounce),
		box-shadow 0.15s ease;
	white-space: nowrap;
	-webkit-tap-highlight-color: transparent;
}
.btn:hover:not(:disabled) {
	transform: translate(-1px, -2px);
	box-shadow: 3px 5px 0 var(--line);
}
.btn:active:not(:disabled) {
	transform: translate(2px, 3px);
	box-shadow: 0 0 0 var(--line);
}
.btn:disabled {
	opacity: 0.55;
	cursor: not-allowed;
}
.btn--secondary {
	--btn-bg: var(--surface);
	--btn-ink: var(--ink);
}
.btn--ghost {
	--btn-bg: transparent;
	--btn-ink: var(--ink);
	border-color: transparent;
	box-shadow: none;
}
.btn--ghost:hover:not(:disabled) {
	background: var(--primary-soft);
	box-shadow: none;
	transform: none;
}
.btn--danger {
	--btn-bg: var(--danger);
	--btn-ink: #fff;
}
.btn--sun {
	--btn-bg: var(--sun);
	--btn-ink: #1f1b2e;
}
.btn--sm {
	min-height: 36px;
	padding: 0 12px;
	font-size: 0.9rem;
	gap: 6px;
}
.btn--lg {
	min-height: 56px;
	padding: 0 26px;
	font-size: 1.15rem;
}
.btn--block {
	width: 100%;
}
.btn__spinner {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 3px solid currentColor;
	border-right-color: transparent;
	animation: spin 0.7s linear infinite;
}
@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
