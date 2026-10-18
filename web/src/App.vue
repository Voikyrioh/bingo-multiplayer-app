<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConfettiCanvas from './components/ConfettiCanvas.vue'
import SiteHeader from './components/SiteHeader.vue'
import ToastHost from './components/ToastHost.vue'
</script>

<template>
	<a href="#main" class="skip">Aller au contenu</a>
	<SiteHeader />
	<main id="main" tabindex="-1" class="main">
		<RouterView />
	</main>
	<ToastHost />
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
</style>
