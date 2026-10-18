<script setup lang="ts">
import { LIMITS } from '@bingo/shared'
import { computed } from 'vue'
import { type DictionaryDraft, parseEntries } from '../lib/dictionary-draft'
import AppField from './ui/AppField.vue'
import AppToggle from './ui/AppToggle.vue'

const draft = defineModel<DictionaryDraft>({ required: true })
const props = defineProps<{ needed: number; error?: string | null }>()

const count = computed(() => parseEntries(draft.value.entriesText).length)
const min = computed(() => Math.max(props.needed, LIMITS.dictionaryEntriesMin))
const progress = computed(() => Math.min(100, Math.round((count.value / min.value) * 100)))
</script>

<template>
	<div class="editor">
		<AppField v-model="draft.title" label="Titre" :maxlength="LIMITS.dictionaryTitleMax" placeholder="Ex. : Les phrases cultes de tonton" required />
		<AppField v-model="draft.description" label="Description (facultatif)" :maxlength="LIMITS.dictionaryDescriptionMax" placeholder="En une phrase, de quoi parle ce bingo ?" />
		<div class="editor__entries">
			<AppField
				v-model="draft.entriesText"
				label="Expressions, une par ligne"
				multiline
				:rows="10"
				:hint="`Il en faut au moins ${min} pour la grille choisie. Les doublons sont ignorés.`"
				placeholder="C’était mieux avant&#10;Tu as un copain ?&#10;Le fromage arrive enfin&#10;…"
				:error="error"
				required
			/>
			<div class="meter" role="meter" :aria-valuenow="count" aria-valuemin="0" :aria-valuemax="min" :aria-label="`${count} expressions sur ${min} nécessaires`">
				<span class="meter__bar" :class="{ 'meter__bar--ok': count >= min }" :style="{ width: `${progress}%` }" />
				<span class="meter__text">{{ count }} / {{ min }}</span>
			</div>
		</div>
		<AppField v-model="draft.freeSpace" label="Case gratuite du centre (facultatif)" :maxlength="LIMITS.freeSpaceMax" placeholder="Case gratuite ⭐" />
		<AppToggle v-model="draft.isPublic" label="Partager avec la communauté" hint="Les autres pourront le choisir en créant un salon. Sinon, il reste accessible par son lien uniquement." />
	</div>
</template>

<style scoped>
.editor {
	display: grid;
	gap: 16px;
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
