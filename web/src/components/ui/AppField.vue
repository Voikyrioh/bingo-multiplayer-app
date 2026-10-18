<script setup lang="ts">
import { useId } from 'vue'

// Labelled text field: the hint and the error are linked with aria-describedby.
const model = defineModel<string>({ default: '' })
const props = withDefaults(
	defineProps<{
		label: string
		type?: 'text' | 'password' | 'search'
		hint?: string
		error?: string | null
		placeholder?: string
		maxlength?: number
		multiline?: boolean
		rows?: number
		autocomplete?: string
		required?: boolean
		hideLabel?: boolean
	}>(),
	{ type: 'text', rows: 8, autocomplete: 'off' },
)
const id = useId()
const describedBy = [props.hint ? `${id}-hint` : '', `${id}-error`].filter(Boolean).join(' ')
</script>

<template>
	<div class="field" :class="{ 'field--error': error }">
		<label :for="id" class="field__label" :class="{ 'visually-hidden': hideLabel }">
			{{ label }}<span v-if="required" aria-hidden="true" class="field__required"> *</span>
		</label>
		<div class="field__control">
			<textarea
				v-if="multiline"
				:id="id"
				v-model="model"
				class="field__input field__input--area"
				:rows="rows"
				:placeholder="placeholder"
				:maxlength="maxlength"
				:required="required"
				:aria-invalid="error ? 'true' : undefined"
				:aria-describedby="describedBy"
			/>
			<input
				v-else
				:id="id"
				v-model="model"
				class="field__input"
				:type="type"
				:placeholder="placeholder"
				:maxlength="maxlength"
				:autocomplete="autocomplete"
				:required="required"
				:aria-invalid="error ? 'true' : undefined"
				:aria-describedby="describedBy"
			/>
			<slot name="action" />
		</div>
		<p v-if="hint" :id="`${id}-hint`" class="field__hint">{{ hint }}</p>
		<p :id="`${id}-error`" class="field__error" role="alert">{{ error ?? '' }}</p>
	</div>
</template>

<style scoped>
.field {
	display: grid;
	gap: 6px;
}
.field__label {
	font-family: var(--font-display);
	font-weight: 600;
}
.field__required {
	color: var(--accent);
}
.field__control {
	display: flex;
	gap: 8px;
	align-items: stretch;
}
.field__input {
	flex: 1;
	min-width: 0;
	min-height: 48px;
	padding: 10px 14px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--surface);
	color: var(--ink);
	font-size: 1rem;
	transition: box-shadow 0.15s ease;
}
.field__input::placeholder {
	color: var(--ink-3);
}
.field__input:focus-visible {
	box-shadow: var(--focus);
}
.field__input--area {
	resize: vertical;
	line-height: 1.55;
}
.field__hint {
	font-size: 0.9rem;
	color: var(--ink-3);
}
.field__error {
	font-size: 0.9rem;
	font-weight: 700;
	color: var(--danger);
}
.field__error:empty {
	display: none;
}
.field--error .field__input {
	border-color: var(--danger);
}
</style>
