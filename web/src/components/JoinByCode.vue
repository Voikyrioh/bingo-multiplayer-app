<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../i18n/useI18n'
import AppIcon from './ui/AppIcon.vue'

const { t } = useI18n()
const router = useRouter()
const code = ref('')
const invalid = ref(false)

function submit() {
	// Accepts a code or a full link (https://…/r/ABC123).
	const value = code.value.trim().split('/').pop()?.toUpperCase() ?? ''
	invalid.value = !/^[A-Z0-9]{6}$/.test(value)
	if (invalid.value) return
	void router.push(`/r/${value}`)
}
</script>

<template>
	<form class="code" @submit.prevent="submit">
		<label for="room-code" class="code__label">{{ t('joinCode.label') }}</label>
		<div class="code__row">
			<input
				id="room-code"
				v-model="code"
				class="code__input"
				placeholder="K7PQ2M"
				autocomplete="off"
				autocapitalize="characters"
				spellcheck="false"
				:aria-invalid="invalid ? 'true' : undefined"
				aria-describedby="room-code-error"
			/>
			<button type="submit" class="code__go">
				<AppIcon name="arrowRight" :label="t('joinCode.submit')" />
			</button>
		</div>
		<p id="room-code-error" class="code__error" role="alert">{{ invalid ? t('joinCode.invalid', { example: 'K7PQ2M' }) : '' }}</p>
	</form>
</template>

<style scoped>
.code {
	display: grid;
	gap: 6px;
}
.code__label {
	font-family: var(--font-display);
	font-weight: 600;
}
.code__row {
	display: flex;
	gap: 8px;
}
.code__input {
	flex: 1;
	min-width: 0;
	min-height: 52px;
	padding: 0 16px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--surface);
	font-family: var(--font-display);
	font-size: 1.3rem;
	letter-spacing: 0.15em;
	text-transform: uppercase;
}
.code__input::placeholder {
	color: var(--ink-3);
	opacity: 0.6;
}
.code__go {
	display: grid;
	place-items: center;
	width: 52px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--accent);
	color: #fff;
	cursor: pointer;
	box-shadow: var(--shadow-s);
}
.code__error {
	min-height: 1.2em;
	font-size: 0.9rem;
	font-weight: 700;
	color: var(--danger);
}
.code__error:empty {
	min-height: 0;
}
</style>
