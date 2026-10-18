<script setup lang="ts">
import type { DictionaryView } from '@bingo/shared'
import { onMounted, ref } from 'vue'
import { ApiRequestError, api } from '../api/http'
import ShareBox from '../components/ShareBox.vue'
import AppButton from '../components/ui/AppButton.vue'
import { dictionaryLink } from '../lib/format'

const props = defineProps<{ code: string }>()
const dictionary = ref<DictionaryView | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
	try {
		dictionary.value = await api.getDictionary(props.code)
		document.title = `${dictionary.value.title} · Bingo Live`
	} catch (e) {
		error.value =
			e instanceof ApiRequestError && e.status === 404
				? 'Ce dictionnaire n’existe pas.'
				: (e as Error).message
	}
})
</script>

<template>
	<div class="container dict">
		<p v-if="error" class="dict__error">{{ error }}</p>
		<p v-else-if="!dictionary" class="muted" aria-busy="true">Chargement…</p>
		<template v-else>
			<header class="dict__head">
				<p class="eyebrow">Dictionnaire · {{ dictionary.entryCount }} expressions</p>
				<h1>{{ dictionary.title }}</h1>
				<p v-if="dictionary.description" class="dict__desc">{{ dictionary.description }}</p>
				<div class="dict__actions">
					<AppButton :to="`/creer?d=${dictionary.code}`" size="lg" icon="users">Créer un salon avec</AppButton>
					<AppButton :to="`/solo?d=${dictionary.code}`" size="lg" variant="secondary" icon="play">Jouer en solo</AppButton>
				</div>
				<div class="dict__share">
					<ShareBox :link="dictionaryLink(dictionary.code)" label="Partager ce dictionnaire" :title="dictionary.title" />
				</div>
			</header>
			<section aria-labelledby="entries-title">
				<h2 id="entries-title" class="visually-hidden">Les expressions</h2>
				<ul class="entries">
					<li v-for="(entry, i) in dictionary.entries" :key="entry" class="entry" :style="{ '--r': `${((i * 37) % 7) - 3}deg` }">
						{{ entry }}
					</li>
					<li v-if="dictionary.freeSpace" class="entry entry--free">★ {{ dictionary.freeSpace }}</li>
				</ul>
			</section>
		</template>
	</div>
</template>

<style scoped>
.dict {
	display: grid;
	gap: 28px;
	padding-top: 32px;
}
.dict__head {
	display: grid;
	gap: 12px;
}
.dict__head h1 {
	font-size: clamp(2rem, 5vw, 2.8rem);
}
.dict__desc {
	max-width: 60ch;
	font-size: 1.1rem;
	color: var(--ink-2);
}
.dict__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}
.dict__share {
	max-width: 560px;
}
.dict__error {
	font-weight: 700;
}
.entries {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}
.entry {
	padding: 8px 14px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--surface);
	font-family: var(--font-display);
	font-weight: 500;
	box-shadow: var(--shadow-s);
	transform: rotate(var(--r));
}
.entry:nth-child(4n + 2) {
	background: var(--sky-soft);
}
.entry:nth-child(4n + 3) {
	background: var(--mint-soft);
}
.entry--free {
	background: var(--sun) !important;
	color: #1f1b2e;
}
</style>
