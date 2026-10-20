<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterView } from 'vue-router'
import ConfettiCanvas from './components/ConfettiCanvas.vue'
import SiteHeader from './components/SiteHeader.vue'
import ToastHost from './components/ToastHost.vue'
import { useI18n } from './i18n/useI18n'

const { t, ready, language } = useI18n()

// Screen readers and hyphenation follow the active language.
watchEffect(() => {
	document.documentElement.lang = language.value.code
})
</script>

<template>
	<!-- Nothing is shown before the language file is loaded: no flash of raw keys. -->
	<template v-if="ready">
		<a href="#main" class="skip">{{ t('app.skipToContent') }}</a>
		<SiteHeader />
		<main id="main" tabindex="-1" class="main">
			<RouterView />
		</main>
		<ToastHost />
	</template>
	<div v-else class="boot" aria-busy="true">
		<span class="boot__ball" aria-hidden="true">B</span>
	</div>
	<ConfettiCanvas />
</template>

<style scoped>
.skip {
	position: absolute;
	z-index: 100;
	top: 8px;
	left: 8px;
	padding: 8px 14px;
	border: var(--border);
	border-radius: var(--radius-s);
	background: var(--sun);
	color: #1f1b2e;
	transform: translateY(-200%);
}
.skip:focus {
	transform: none;
}
.main {
	outline: none;
	padding-bottom: 48px;
}
.boot {
	display: grid;
	place-items: center;
	min-height: 100dvh;
}
.boot__ball {
	display: grid;
	place-items: center;
	width: 64px;
	height: 64px;
	border: var(--border);
	border-radius: 50%;
	background: var(--accent);
	color: #fff;
	font-family: var(--font-display);
	font-weight: 700;
	font-size: 2rem;
	box-shadow: var(--shadow-s);
	animation: bounce 0.9s ease-in-out infinite;
}
@keyframes bounce {
	50% {
		transform: translateY(-10px) rotate(-8deg);
	}
}
</style>
