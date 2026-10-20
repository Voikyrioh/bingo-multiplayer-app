<script setup lang="ts">
import AppButton from '../components/ui/AppButton.vue'
import { useI18n } from '../i18n/useI18n'
import { usePageTitle } from '../i18n/usePageTitle'

const { t } = useI18n()
usePageTitle(() => t('notFound.tabTitle'))
</script>

<template>
	<div class="container lost">
		<p class="lost__emoji" aria-hidden="true">🙈</p>
		<h1>{{ t('notFound.title') }}</h1>
		<p class="muted">{{ t('notFound.text') }}</p>
		<AppButton to="/" icon="arrowLeft">{{ t('notFound.home') }}</AppButton>
	</div>
</template>

<style scoped>
.lost {
	display: grid;
	justify-items: center;
	gap: 14px;
	padding-top: 72px;
	text-align: center;
}
.lost__emoji {
	font-size: 4rem;
}
</style>
