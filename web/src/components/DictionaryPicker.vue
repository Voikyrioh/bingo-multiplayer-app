<script setup lang="ts">
import type { DictionarySummary } from '@bingo/shared'
import { computed, onMounted, ref, watchEffect } from 'vue'
import { api } from '../api/http'
import AppIcon from './ui/AppIcon.vue'

/** Selected dictionary code, or 'new' for "I write my own". */
const model = defineModel<string>({ required: true })
/** Title of the selected dictionary (empty for 'new'). */
const title = defineModel<string>('title', { default: '' })
const props = defineProps<{ needed: number; extra?: DictionarySummary | null }>()

const all = ref<DictionarySummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
	try {
		all.value = await api.listDictionaries()
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
})

const featured = computed(() => {
	const list = all.value.filter((d) => d.featured)
	if (props.extra && !all.value.some((d) => d.code === props.extra?.code)) list.unshift(props.extra)
	return list
})
const community = computed(() => all.value.filter((d) => !d.featured))

watchEffect(() => {
	const selected = [...featured.value, ...community.value].find((d) => d.code === model.value)
	title.value = selected?.title ?? ''
})
</script>

<template>
	<fieldset class="picker">
		<legend class="visually-hidden">Choisissez un dictionnaire</legend>
		<p v-if="loading" class="muted">Chargement des dictionnaires…</p>
		<p v-else-if="error" class="muted">{{ error }}</p>
		<div class="picker__grid">
			<label class="option option--new">
				<input v-model="model" type="radio" name="dictionary" value="new" class="option__input" />
				<span class="option__card">
					<span class="option__icon" aria-hidden="true"><AppIcon name="plus" :size="26" /></span>
					<span class="option__title">Créer le mien</span>
					<span class="option__desc">Écrivez vos propres expressions.</span>
				</span>
			</label>
			<label v-for="d in featured" :key="d.code" class="option" :class="{ 'option--disabled': d.entryCount < needed }">
				<input v-model="model" type="radio" name="dictionary" :value="d.code" class="option__input" :disabled="d.entryCount < needed" />
				<span class="option__card">
					<span v-if="d.featured" class="option__badge">Populaire</span>
					<span class="option__title">{{ d.title }}</span>
					<span class="option__desc">{{ d.description }}</span>
					<span class="option__count">{{ d.entryCount }} expressions</span>
				</span>
			</label>
		</div>
		<template v-if="community.length">
			<h3 class="picker__section">De la communauté</h3>
			<div class="picker__grid">
				<label v-for="d in community" :key="d.code" class="option" :class="{ 'option--disabled': d.entryCount < needed }">
					<input v-model="model" type="radio" name="dictionary" :value="d.code" class="option__input" :disabled="d.entryCount < needed" />
					<span class="option__card">
						<span class="option__title">{{ d.title }}</span>
						<span v-if="d.description" class="option__desc">{{ d.description }}</span>
						<span class="option__count">{{ d.entryCount }} expressions</span>
					</span>
				</label>
			</div>
		</template>
	</fieldset>
</template>

<style scoped>
.picker {
	border: 0;
	margin: 0;
	padding: 0;
	min-width: 0;
	display: grid;
	gap: 14px;
}
.picker__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
	gap: 12px;
}
.picker__section {
	font-size: 1rem;
	color: var(--ink-2);
}
.option {
	position: relative;
	cursor: pointer;
}
.option__input {
	position: absolute;
	opacity: 0;
	width: 1px;
	height: 1px;
}
.option__card {
	position: relative;
	display: grid;
	align-content: start;
	gap: 4px;
	height: 100%;
	padding: 14px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--surface);
	transition:
		transform 0.18s var(--ease-bounce),
		background 0.15s ease;
}
.option:hover .option__card {
	transform: translateY(-2px);
}
.option__input:checked + .option__card {
	background: var(--primary-soft);
	box-shadow: var(--shadow-m);
	transform: translateY(-3px) rotate(-0.6deg);
}
.option__input:checked + .option__card::after {
	content: '✓';
	position: absolute;
	top: -12px;
	right: -10px;
	display: grid;
	place-items: center;
	width: 30px;
	height: 30px;
	border: var(--border);
	border-radius: 50%;
	background: var(--mint);
	color: #1f1b2e;
	font-weight: 900;
}
.option__input:focus-visible + .option__card {
	box-shadow: var(--focus);
}
.option--new .option__card {
	border-style: dashed;
	background: var(--sun-soft);
	justify-items: start;
}
.option__icon {
	display: grid;
	place-items: center;
	width: 40px;
	height: 40px;
	border: var(--border);
	border-radius: 50%;
	background: var(--sun);
	color: #1f1b2e;
}
.option__badge {
	justify-self: start;
	padding: 0 8px;
	border: 2px solid var(--line);
	border-radius: 999px;
	background: var(--accent);
	color: #fff;
	font-size: 0.75rem;
	font-weight: 800;
}
.option__title {
	font-family: var(--font-display);
	font-weight: 600;
	font-size: 1.1rem;
}
.option__desc {
	font-size: 0.9rem;
	color: var(--ink-2);
}
.option__count {
	font-size: 0.8rem;
	font-weight: 800;
	color: var(--ink-3);
}
.option--disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
