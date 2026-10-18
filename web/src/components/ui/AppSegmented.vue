<script setup lang="ts" generic="T extends string | number">
import { useId } from 'vue'

// Radio group styled as a segmented control.
const model = defineModel<T>({ required: true })
defineProps<{
	label: string
	options: { value: T; label: string; hint?: string; disabled?: boolean }[]
}>()
const name = useId()
</script>

<template>
	<fieldset class="segmented">
		<legend class="segmented__legend">{{ label }}</legend>
		<div class="segmented__options">
			<label
				v-for="option in options"
				:key="String(option.value)"
				class="segmented__option"
				:class="{ 'segmented__option--disabled': option.disabled }"
			>
				<input
					v-model="model"
					class="segmented__input"
					type="radio"
					:name="name"
					:value="option.value"
					:disabled="option.disabled"
				/>
				<span class="segmented__pill">
					<span>{{ option.label }}</span>
					<small v-if="option.hint">{{ option.hint }}</small>
				</span>
			</label>
		</div>
	</fieldset>
</template>

<style scoped>
.segmented {
	border: 0;
	margin: 0;
	padding: 0;
	min-width: 0;
}
.segmented__legend {
	padding: 0;
	margin-bottom: 6px;
	font-family: var(--font-display);
	font-weight: 600;
}
.segmented__options {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
.segmented__option {
	position: relative;
	cursor: pointer;
}
.segmented__input {
	position: absolute;
	opacity: 0;
	width: 1px;
	height: 1px;
}
.segmented__pill {
	display: grid;
	justify-items: center;
	min-width: 64px;
	padding: 8px 16px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--surface);
	font-family: var(--font-display);
	font-weight: 600;
	transition:
		transform 0.15s var(--ease-bounce),
		background 0.15s ease;
}
.segmented__pill small {
	font-family: var(--font-body);
	font-weight: 600;
	font-size: 0.75rem;
	color: var(--ink-3);
}
.segmented__input:checked + .segmented__pill {
	background: var(--sun);
	color: #1f1b2e;
	box-shadow: var(--shadow-s);
	transform: translateY(-2px);
}
.segmented__input:checked + .segmented__pill small {
	color: #4a4458;
}
.segmented__input:focus-visible + .segmented__pill {
	box-shadow: var(--focus);
}
.segmented__option--disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
</style>
