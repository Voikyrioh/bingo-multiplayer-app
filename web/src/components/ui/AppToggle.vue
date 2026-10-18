<script setup lang="ts">
import { useId } from 'vue'

// Switch built on a real checkbox (keyboard and screen readers for free).
const model = defineModel<boolean>({ default: false })
defineProps<{ label: string; hint?: string; disabled?: boolean }>()
const id = useId()
</script>

<template>
	<div class="toggle" :class="{ 'toggle--disabled': disabled }">
		<input
			:id="id"
			v-model="model"
			class="toggle__input"
			type="checkbox"
			role="switch"
			:disabled="disabled"
			:aria-describedby="hint ? `${id}-hint` : undefined"
		/>
		<label :for="id" class="toggle__label">
			<span class="toggle__track" aria-hidden="true"><span class="toggle__thumb" /></span>
			<span class="toggle__text">
				<span class="toggle__title">{{ label }}</span>
				<span v-if="hint" :id="`${id}-hint`" class="toggle__hint">{{ hint }}</span>
			</span>
		</label>
	</div>
</template>

<style scoped>
.toggle {
	position: relative;
}
.toggle__input {
	position: absolute;
	opacity: 0;
	width: 1px;
	height: 1px;
}
.toggle__label {
	display: flex;
	align-items: center;
	gap: 12px;
	cursor: pointer;
}
.toggle__track {
	flex: none;
	position: relative;
	width: 54px;
	height: 32px;
	border: var(--border);
	border-radius: 999px;
	background: var(--surface-2);
	transition: background 0.2s ease;
}
.toggle__thumb {
	position: absolute;
	top: 3px;
	left: 3px;
	width: 21px;
	height: 21px;
	border: var(--border);
	border-radius: 50%;
	background: var(--surface);
	transition: transform 0.25s var(--ease-bounce);
}
.toggle__input:checked + .toggle__label .toggle__track {
	background: var(--mint);
}
.toggle__input:checked + .toggle__label .toggle__thumb {
	transform: translateX(22px);
}
.toggle__input:focus-visible + .toggle__label .toggle__track {
	box-shadow: var(--focus);
}
.toggle__text {
	display: grid;
}
.toggle__title {
	font-family: var(--font-display);
	font-weight: 600;
}
.toggle__hint {
	font-size: 0.9rem;
	color: var(--ink-3);
}
.toggle--disabled {
	opacity: 0.5;
}
.toggle--disabled .toggle__label {
	cursor: not-allowed;
}
</style>
