<script setup lang="ts">
import type { Announcement } from '@bingo/shared'
import { computed } from 'vue'
import { useI18n } from '../i18n/useI18n'

// Big banner for the announcement in progress. The live region is always in
// the DOM so that screen readers announce each new text.
const props = defineProps<{ current: (Announcement & { mine: boolean }) | null }>()
const { t } = useI18n()

// "You" and "Bob" sentences are separate keys: many languages conjugate differently.
const text = computed(() => {
	const a = props.current
	if (!a) return ''
	return t(`banner.${a.kind}.${a.mine ? 'me' : 'someone'}`, { name: a.name })
})
const title = computed(() => {
	const a = props.current
	if (!a) return ''
	if (a.kind === 'full') {
		return a.rank && a.rank > 1 ? t('banner.fullTitleNth', { rank: a.rank }) : t('banner.fullTitle')
	}
	return t('banner.bingo')
})
</script>

<template>
	<div class="announce-region" aria-live="assertive" aria-atomic="true">
		<Transition name="banner">
			<div v-if="current" :key="`${current.participantId}-${current.kind}-${current.lineCount}`" class="banner" :class="[`banner--${current.kind}`, { 'banner--mine': current.mine }]">
				<span class="banner__emoji" aria-hidden="true">{{ current.kind === 'full' ? '🏆' : current.kind === 'diagonal' ? '↘️' : '🎯' }}</span>
				<span class="banner__body">
					<strong class="banner__title">{{ title }}</strong>
					<span class="banner__text">{{ text }}</span>
				</span>
			</div>
		</Transition>
	</div>
</template>

<style scoped>
.announce-region {
	position: fixed;
	z-index: 60;
	top: 76px;
	left: 50%;
	transform: translateX(-50%);
	width: min(560px, calc(100vw - 2 * var(--gutter)));
	pointer-events: none;
}
.banner {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px 18px;
	border: var(--border);
	border-radius: var(--radius-l);
	background: var(--mint);
	color: #1f1b2e;
	box-shadow: var(--shadow-l);
}
.banner--diagonal {
	background: var(--sky);
}
.banner--full {
	padding: 22px 22px;
	background: var(--sun);
	animation: wobble 0.9s ease-in-out 2;
}
.banner__emoji {
	font-size: 2.2rem;
	line-height: 1;
}
.banner--full .banner__emoji {
	font-size: 3rem;
}
.banner__body {
	display: grid;
}
.banner__title {
	font-family: var(--font-display);
	font-size: 1.6rem;
	line-height: 1;
	letter-spacing: 0.02em;
}
.banner--full .banner__title {
	font-size: 2.1rem;
}
.banner__text {
	font-weight: 700;
}
.banner-enter-active {
	transition: all 0.45s var(--ease-bounce);
}
.banner-leave-active {
	transition: all 0.25s ease-in;
}
.banner-enter-from {
	transform: translateY(-40px) scale(0.7) rotate(-4deg);
	opacity: 0;
}
.banner-leave-to {
	transform: translateY(-20px);
	opacity: 0;
}
@keyframes wobble {
	25% {
		transform: rotate(-2deg) scale(1.03);
	}
	75% {
		transform: rotate(2deg) scale(1.03);
	}
}
</style>
