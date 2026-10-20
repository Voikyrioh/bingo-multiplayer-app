<script setup lang="ts">
import type { DictionaryView } from '@bingo/shared'
import { onMounted, ref } from 'vue'
import { api } from '../api/http'
import ShareBox from '../components/ShareBox.vue'
import AppButton from '../components/ui/AppButton.vue'
import { useI18n } from '../i18n/useI18n'
import { usePageTitle } from '../i18n/usePageTitle'
import { dictionaryLink } from '../lib/format'

const props = defineProps<{ code: string }>()
const { t, tc, errorText, languageName } = useI18n()
const dictionary = ref<DictionaryView | null>(null)
const error = ref<unknown>(null)
usePageTitle(() => dictionary.value?.title ?? t('dictPage.tabTitle'))

onMounted(async () => {
	try {
		dictionary.value = await api.getDictionary(props.code)
	} catch (e) {
		error.value = e
	}
})
</script>

<template>
	<div class="container dict">
		<p v-if="error" class="dict__error">{{ errorText(error) }}</p>
		<p v-else-if="!dictionary" class="muted" aria-busy="true">{{ t('common.loading') }}</p>
		<template v-else>
			<header class="dict__head">
				<p class="eyebrow">
					{{ t('dictPage.eyebrow', { entries: tc('dict.entries', dictionary.entryCount), language: languageName(dictionary.language) }) }}
				</p>
				<h1 :lang="dictionary.language">{{ dictionary.title }}</h1>
				<p v-if="dictionary.description" class="dict__desc" :lang="dictionary.language">{{ dictionary.description }}</p>
				<div class="dict__actions">
					<AppButton :to="`/creer?d=${dictionary.code}`" size="lg" icon="users">{{ t('dictPage.createRoom') }}</AppButton>
					<AppButton :to="`/solo?d=${dictionary.code}`" size="lg" variant="secondary" icon="play">{{ t('home.solo') }}</AppButton>
				</div>
				<div class="dict__share">
					<ShareBox :link="dictionaryLink(dictionary.code)" :label="t('room.shareDictionary')" :title="dictionary.title" />
				</div>
			</header>
			<section aria-labelledby="entries-title">
				<h2 id="entries-title" class="visually-hidden">{{ t('dictPage.entries') }}</h2>
				<ul class="entries" :lang="dictionary.language">
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
