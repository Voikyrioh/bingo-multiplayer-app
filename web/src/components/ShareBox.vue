<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '../i18n/useI18n'
import { copyText } from '../lib/clipboard'
import AppIcon from './ui/AppIcon.vue'

const props = defineProps<{ link: string; label?: string; title?: string }>()
const { t } = useI18n()
const copied = ref(false)
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

async function copy() {
	copied.value = await copyText(props.link)
	if (copied.value) setTimeout(() => (copied.value = false), 2200)
}

async function share() {
	try {
		await navigator.share({ title: props.title ?? 'Bingo Live', url: props.link })
	} catch {
		// Cancelled by the user.
	}
}
</script>

<template>
	<div class="share">
		<span v-if="label" class="share__label">{{ label }}</span>
		<div class="share__row">
			<input class="share__link" :value="link" readonly :aria-label="label ?? t('share.link')" @focus="($event.target as HTMLInputElement).select()" />
			<button type="button" class="share__btn" :class="{ 'share__btn--ok': copied }" @click="copy">
				<AppIcon :name="copied ? 'check' : 'copy'" />
				<span>{{ copied ? t('share.copied') : t('share.copy') }}</span>
			</button>
			<button v-if="canShare" type="button" class="share__btn share__btn--icon" @click="share">
				<AppIcon name="link" :label="t('share.share')" />
			</button>
		</div>
		<span class="visually-hidden" role="status">{{ copied ? t('share.copiedStatus') : '' }}</span>
	</div>
</template>

<style scoped>
.share {
	display: grid;
	gap: 6px;
}
.share__label {
	font-family: var(--font-display);
	font-weight: 600;
}
.share__row {
	display: flex;
	gap: 8px;
}
.share__link {
	flex: 1;
	min-width: 0;
	min-height: 44px;
	padding: 0 12px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--surface-2);
	font-family: ui-monospace, monospace;
	font-size: 0.9rem;
}
.share__btn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 44px;
	padding: 0 14px;
	border: var(--border);
	border-radius: var(--radius-m);
	background: var(--sun);
	color: #1f1b2e;
	font-family: var(--font-display);
	font-weight: 600;
	cursor: pointer;
	box-shadow: var(--shadow-s);
}
.share__btn--ok {
	background: var(--mint);
}
.share__btn--icon {
	padding: 0 10px;
	background: var(--surface);
	color: var(--ink);
}
</style>
