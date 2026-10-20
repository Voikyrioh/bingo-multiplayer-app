<script setup lang="ts">
import { LANGUAGES, LIMITS } from '@bingo/shared'
import { computed, useId } from 'vue'
import { useI18n } from '../i18n/useI18n'
import { type DictionaryDraft, parseEntries } from '../lib/dictionary-draft'
import AppField from './ui/AppField.vue'
import AppToggle from './ui/AppToggle.vue'

const draft = defineModel<DictionaryDraft>({ required: true })
const props = defineProps<{ needed: number; error?: string | null }>()
const { t } = useI18n()
const languageId = useId()

const count = computed(() => parseEntries(draft.value.entriesText).length)
const min = computed(() => Math.max(props.needed, LIMITS.dictionaryEntriesMin))
const progress = computed(() => Math.min(100, Math.round((count.value / min.value) * 100)))
</script>

<template>
	<div class="editor">
		<AppField v-model="draft.title" :label="t('editor.title')" :maxlength="LIMITS.dictionaryTitleMax" :placeholder="t('editor.titlePlaceholder')" required />
		<div class="editor__language">
			<label :for="languageId" class="editor__label">{{ t('editor.language') }}</label>
			<span class="editor__select">
				<select :id="languageId" v-model="draft.language" :aria-describedby="`${languageId}-hint`">
					<option v-for="l in LANGUAGES" :key="l.code" :value="l.code" :lang="l.code">{{ l.name }}</option>
				</select>
			</span>
			<p :id="`${languageId}-hint`" class="editor__hint">{{ t('editor.languageHint') }}</p>
		</div>
		<AppField v-model="draft.description" :label="t('editor.description')" :maxlength="LIMITS.dictionaryDescriptionMax" :placeholder="t('editor.descriptionPlaceholder')" />
		<div class="editor__entries">
			<AppField
				v-model="draft.entriesText"
				:label="t('editor.entries')"
				multiline
				:rows="10"
				:hint="t('editor.entriesHint', { min })"
				:placeholder="t('editor.entriesPlaceholder')"
				:error="error"
				required
			/>
			<div class="meter" role="meter" :aria-valuenow="count" aria-valuemin="0" :aria-valuemax="min" :aria-label="t('editor.meter', { count, min })">
				<span class="meter__bar" :class="{ 'meter__bar--ok': count >= min }" :style="{ width: `${progress}%` }" />
				<span class="meter__text">{{ count }} / {{ min }}</span>
			</div>
		</div>
		<AppField v-model="draft.freeSpace" :label="t('editor.freeSpace')" :maxlength="LIMITS.freeSpaceMax" :placeholder="t('grid.freeSpace')" />
		<AppToggle v-model="draft.isPublic" :label="t('editor.public')" :hint="t('editor.publicHint')" />
	</div>
</template>

<style scoped>
.editor {
	display: grid;
	gap: 16px;
}
.editor__language {
	display: grid;
	gap: 6px;
}
.editor__label {
	font-family: var(--font-display);
	font-weight: 600;
}
.editor__hint {
	font-size: 0.9rem;
	color: var(--ink-3);
}
.editor__select {
	position: relative;
	display: block;
}
.editor__select::after {
	content: '';
	position: absolute;
	right: 18px;
	top: 50%;
	width: 9px;
	height: 9px;
	border-right: 2.5px solid currentColor;
	border-bottom: 2.5px solid currentColor;
	transform: translateY(-70%) rotate(45deg);
	pointer-events: none;
}
.editor__select select {
	appearance: none;
	width: 100%;
	min-height: 48px;
	padding: 0 44px 0 14px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--surface);
	cursor: pointer;
}
.editor__select select:focus-visible {
	box-shadow: var(--focus);
}
.editor__entries {
	display: grid;
	gap: 8px;
}
.meter {
	position: relative;
	height: 26px;
	border: var(--border);
	border-radius: 999px;
	background: var(--surface-2);
	overflow: hidden;
}
.meter__bar {
	position: absolute;
	inset: 0 auto 0 0;
	background: var(--accent);
	transition: width 0.3s var(--ease-bounce);
}
.meter__bar--ok {
	background: var(--mint);
}
.meter__text {
	position: relative;
	display: block;
	text-align: center;
	font-family: var(--font-display);
	font-weight: 600;
	font-size: 0.85rem;
	line-height: 21px;
}
</style>
