<script setup lang="ts">
import { LANGUAGES, type Locale } from '@bingo/shared'
import { ref } from 'vue'
import { useI18n } from '../i18n/useI18n'
import AppIcon from './ui/AppIcon.vue'
import AppModal from './ui/AppModal.vue'

// Interface language. Each language is written in itself (endonym): someone
// who does not read the current language still finds theirs.
const { t, locale, language, setLocale } = useI18n()
const open = ref(false)

function choose(next: Locale) {
	setLocale(next)
	open.value = false
}
</script>

<template>
	<button
		type="button"
		class="lang"
		:aria-label="t('language.change', { language: language.name })"
		:title="t('language.change', { language: language.name })"
		@click="open = true"
	>
		<AppIcon name="language" />
		<span class="lang__code" aria-hidden="true">{{ language.code }}</span>
	</button>
	<AppModal v-model:open="open" :title="t('language.title')" wide>
		<p class="muted">{{ t('language.hint') }}</p>
		<ul class="langs">
			<li v-for="l in LANGUAGES" :key="l.locale">
				<button
					type="button"
					class="langs__item"
					:lang="l.code"
					:aria-current="l.locale === locale ? 'true' : undefined"
					@click="choose(l.locale)"
				>
					<span class="langs__code" aria-hidden="true">{{ l.code }}</span>
					<span>{{ l.name }}</span>
					<AppIcon v-if="l.locale === locale" name="check" class="langs__check" />
				</button>
			</li>
		</ul>
	</AppModal>
</template>

<style scoped>
.lang {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	height: 42px;
	padding: 0 10px;
	border: var(--border);
	border-radius: 999px;
	background: var(--surface);
	font-family: var(--font-display);
	font-weight: 600;
	cursor: pointer;
}
.lang__code {
	text-transform: uppercase;
	font-size: 0.85rem;
}
.langs {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr));
	gap: 8px;
}
.langs__item {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	min-height: 48px;
	padding: 0 12px;
	border: 2px solid var(--line);
	border-radius: var(--radius-m);
	background: var(--surface);
	font-weight: 700;
	text-align: left;
	cursor: pointer;
	transition: transform 0.15s var(--ease-bounce);
}
.langs__item:hover {
	transform: translateY(-2px);
}
.langs__item[aria-current='true'] {
	background: var(--sun);
	color: #1f1b2e;
	box-shadow: var(--shadow-s);
}
.langs__code {
	flex: none;
	display: grid;
	place-items: center;
	width: 34px;
	height: 26px;
	border: 2px solid var(--line);
	border-radius: 8px;
	background: var(--surface-2);
	color: var(--ink);
	font-family: var(--font-display);
	font-size: 0.8rem;
	text-transform: uppercase;
}
.langs__check {
	margin-left: auto;
}
</style>
