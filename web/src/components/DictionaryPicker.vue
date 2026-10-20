<script setup lang="ts">
import type { DictionarySummary, LanguageCode } from '@bingo/shared'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { api } from '../api/http'
import { useI18n } from '../i18n/useI18n'
import LanguageFilter from './LanguageFilter.vue'
import AppButton from './ui/AppButton.vue'
import AppIcon from './ui/AppIcon.vue'

/** Selected dictionary code, or 'new' for "I write my own". */
const model = defineModel<string>({ required: true })
/** Title of the selected dictionary (empty for 'new'). */
const title = defineModel<string>('title', { default: '' })
const props = defineProps<{ needed: number; extra?: DictionarySummary | null }>()
const { t, tc, errorText, language } = useI18n()

const all = ref<DictionarySummary[]>([])
const loading = ref(true)
const error = ref<unknown>(null)
// Dictionaries are never translated: they are filtered by the language they are written in.
const filter = ref<LanguageCode | 'all'>(props.extra?.language ?? language.value.code)

onMounted(async () => {
	try {
		all.value = await api.listDictionaries()
	} catch (e) {
		error.value = e
	} finally {
		loading.value = false
	}
})

// A dictionary shared by link (/d/<code>) brings its language.
watch(
	() => props.extra,
	(extra) => {
		if (extra) filter.value = extra.language
	},
)

const known = computed(() => {
	const list = [...all.value]
	if (props.extra && !list.some((d) => d.code === props.extra?.code)) list.unshift(props.extra)
	return list
})
const visible = computed(() =>
	known.value.filter((d) => filter.value === 'all' || d.language === filter.value),
)
const featured = computed(() =>
	visible.value.filter((d) => d.featured || d.code === props.extra?.code),
)
const community = computed(() => visible.value.filter((d) => !featured.value.includes(d)))

// The selection always stays visible: when the filter hides it, the first
// usable dictionary of the filter is picked, or "write my own".
watch(
	[visible, loading],
	() => {
		if (loading.value || model.value === 'new') return
		if (visible.value.some((d) => d.code === model.value)) return
		model.value = visible.value.find((d) => d.entryCount >= props.needed)?.code ?? 'new'
	},
	{ immediate: true },
)

watchEffect(() => {
	title.value = known.value.find((d) => d.code === model.value)?.title ?? ''
})
</script>

<template>
	<fieldset class="picker">
		<legend class="visually-hidden">{{ t('dict.choose') }}</legend>
		<LanguageFilter v-model="filter" :label="t('dict.filterLabel')" class="picker__filter" />
		<p v-if="loading" class="muted">{{ t('dict.loading') }}</p>
		<p v-else-if="error" class="muted">{{ errorText(error) }}</p>
		<div v-else-if="visible.length === 0" class="picker__empty">
			<p>{{ t('dict.emptyInLanguage') }}</p>
			<AppButton variant="secondary" size="sm" icon="globe" @click="filter = 'all'">{{ t('filter.showAll') }}</AppButton>
		</div>
		<div class="picker__grid">
			<label class="option option--new">
				<input v-model="model" type="radio" name="dictionary" value="new" class="option__input" />
				<span class="option__card">
					<span class="option__icon" aria-hidden="true"><AppIcon name="plus" :size="26" /></span>
					<span class="option__title">{{ t('dict.createOwn') }}</span>
					<span class="option__desc">{{ t('dict.createOwnHint') }}</span>
				</span>
			</label>
			<label v-for="d in featured" :key="d.code" class="option" :class="{ 'option--disabled': d.entryCount < needed }">
				<input v-model="model" type="radio" name="dictionary" :value="d.code" class="option__input" :disabled="d.entryCount < needed" />
				<span class="option__card" :lang="d.language">
					<span class="option__badges">
						<span v-if="d.featured" class="option__badge">{{ t('dict.featured') }}</span>
						<span class="option__lang" :title="d.language">{{ d.language }}</span>
					</span>
					<span class="option__title">{{ d.title }}</span>
					<span v-if="d.description" class="option__desc">{{ d.description }}</span>
					<span class="option__count">{{ tc('dict.entries', d.entryCount) }}</span>
				</span>
			</label>
		</div>
		<template v-if="community.length">
			<h3 class="picker__section">{{ t('dict.community') }}</h3>
			<div class="picker__grid">
				<label v-for="d in community" :key="d.code" class="option" :class="{ 'option--disabled': d.entryCount < needed }">
					<input v-model="model" type="radio" name="dictionary" :value="d.code" class="option__input" :disabled="d.entryCount < needed" />
					<span class="option__card" :lang="d.language">
						<span class="option__badges">
							<span class="option__lang" :title="d.language">{{ d.language }}</span>
						</span>
						<span class="option__title">{{ d.title }}</span>
						<span v-if="d.description" class="option__desc">{{ d.description }}</span>
						<span class="option__count">{{ tc('dict.entries', d.entryCount) }}</span>
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
.option__badges {
	display: flex;
	align-items: center;
	gap: 6px;
}
.option__lang {
	padding: 0 6px;
	border: 2px solid var(--line);
	border-radius: 6px;
	background: var(--sky-soft);
	font-family: var(--font-display);
	font-size: 0.72rem;
	font-weight: 600;
	text-transform: uppercase;
}
.picker__filter {
	justify-self: start;
}
.picker__empty {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
	padding: 12px 14px;
	border: 2px dashed var(--ink-3);
	border-radius: var(--radius-m);
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
