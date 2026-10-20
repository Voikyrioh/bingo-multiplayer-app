<script setup lang="ts">
import { LANGUAGES, type LanguageCode } from '@bingo/shared'
import { useId } from 'vue'
import { useI18n } from '../i18n/useI18n'

// Filter of rooms and dictionaries by the language they are written in.
const model = defineModel<LanguageCode | 'all'>({ required: true })
defineProps<{ label?: string }>()
const { t } = useI18n()
const id = useId()
</script>

<template>
	<div class="filter">
		<label :for="id" class="filter__label">{{ label ?? t('filter.label') }}</label>
		<span class="filter__control">
			<select :id="id" v-model="model" class="filter__select">
				<option value="all">{{ t('filter.all') }}</option>
				<option v-for="l in LANGUAGES" :key="l.code" :value="l.code" :lang="l.code">{{ l.name }}</option>
			</select>
		</span>
	</div>
</template>

<style scoped>
.filter {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}
.filter__label {
	font-family: var(--font-display);
	font-weight: 600;
}
.filter__control {
	position: relative;
	display: inline-flex;
}
.filter__control::after {
	content: '';
	position: absolute;
	right: 14px;
	top: 50%;
	width: 8px;
	height: 8px;
	border-right: 2.5px solid currentColor;
	border-bottom: 2.5px solid currentColor;
	transform: translateY(-70%) rotate(45deg);
	pointer-events: none;
}
.filter__select {
	appearance: none;
	min-height: 40px;
	padding: 0 38px 0 14px;
	border: var(--border);
	border-radius: 999px;
	background: var(--surface);
	box-shadow: var(--shadow-s);
	font-family: var(--font-display);
	font-weight: 600;
	cursor: pointer;
}
.filter__select:focus-visible {
	box-shadow: var(--focus);
}
</style>
