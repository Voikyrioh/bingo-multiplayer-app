<script setup lang="ts">
import { LIMITS } from '@bingo/shared'
import { ref } from 'vue'
import { api } from '../api/http'
import { useI18n } from '../i18n/useI18n'
import AppField from './ui/AppField.vue'
import AppIcon from './ui/AppIcon.vue'

// Pseudo with a dice that draws a funny name. Empty = the server draws one.
// `room` or `dictionary` themes the names (e.g. the speech has its own list).
const model = defineModel<string>({ default: '' })
const props = defineProps<{ error?: string | null; room?: string; dictionary?: string }>()
const { t } = useI18n()
const rolling = ref(false)

async function roll() {
	rolling.value = true
	try {
		model.value = (await api.randomName({ room: props.room, dictionary: props.dictionary })).name
	} catch {
		// Offline: keep the current value.
	} finally {
		setTimeout(() => (rolling.value = false), 400)
	}
}
</script>

<template>
	<AppField
		v-model="model"
		:label="t('name.label')"
		:maxlength="LIMITS.nameMax"
		:placeholder="t('name.placeholder')"
		:hint="t('name.hint')"
		autocomplete="nickname"
		:error="error"
	>
		<template #action>
			<button type="button" class="dice" :class="{ 'dice--rolling': rolling }" @click="roll">
				<AppIcon name="dice" :size="24" :label="t('name.roll')" />
			</button>
		</template>
	</AppField>
</template>

<style scoped>
.dice {
	flex: none;
	display: grid;
	place-items: center;
	width: 48px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--sun);
	color: #1f1b2e;
	cursor: pointer;
	box-shadow: var(--shadow-s);
}
.dice--rolling :deep(svg) {
	animation: roll 0.4s ease-out;
}
@keyframes roll {
	to {
		transform: rotate(360deg) scale(1.1);
	}
}
</style>
