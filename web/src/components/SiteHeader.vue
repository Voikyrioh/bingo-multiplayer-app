<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { isSoundEnabled, setSoundEnabled, sounds } from '../lib/sound'
import AppIcon from './ui/AppIcon.vue'

const sound = ref(isSoundEnabled())

function toggleSound() {
	sound.value = !sound.value
	setSoundEnabled(sound.value)
	if (sound.value) sounds.check()
}
</script>

<template>
	<header class="header">
		<div class="container header__inner">
			<RouterLink to="/" class="logo" aria-label="Bingo Live, accueil">
				<span class="logo__ball" aria-hidden="true">B</span>
				<span class="logo__text">Bingo<span class="logo__live">Live</span></span>
			</RouterLink>
			<nav class="nav" aria-label="Navigation principale">
				<RouterLink to="/salons" class="nav__link"><AppIcon name="globe" /><span>Salons</span></RouterLink>
				<RouterLink to="/creer" class="nav__link nav__link--cta"><AppIcon name="plus" /><span>Créer</span></RouterLink>
				<button
					type="button"
					class="nav__sound"
					:aria-pressed="sound"
					:title="sound ? 'Couper le son' : 'Activer le son'"
					@click="toggleSound"
				>
					<AppIcon :name="sound ? 'volume' : 'volumeOff'" :label="sound ? 'Son activé' : 'Son coupé'" />
				</button>
			</nav>
		</div>
	</header>
</template>

<style scoped>
.header {
	position: sticky;
	top: 0;
	z-index: 40;
	border-bottom: var(--border);
	background: color-mix(in srgb, var(--bg) 88%, transparent);
	backdrop-filter: blur(8px);
}
.header__inner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	min-height: 64px;
}
.logo {
	display: flex;
	align-items: center;
	gap: 10px;
	color: var(--ink);
	text-decoration: none;
	border-radius: var(--radius-s);
}
.logo__ball {
	display: grid;
	place-items: center;
	width: 40px;
	height: 40px;
	border: var(--border);
	border-radius: 50%;
	background: var(--accent);
	color: #fff;
	font-family: var(--font-display);
	font-weight: 700;
	font-size: 1.3rem;
	box-shadow: var(--shadow-s);
	transform: rotate(-8deg);
	transition: transform 0.3s var(--ease-bounce);
}
.logo:hover .logo__ball {
	transform: rotate(350deg);
}
.logo__text {
	font-family: var(--font-display);
	font-weight: 700;
	font-size: 1.45rem;
	letter-spacing: -0.02em;
}
.logo__live {
	margin-left: 4px;
	padding: 0 8px;
	border: 2px solid var(--line);
	border-radius: 8px;
	background: var(--sun);
	color: #1f1b2e;
	font-size: 0.95rem;
	vertical-align: 4px;
}
.nav {
	display: flex;
	align-items: center;
	gap: 6px;
}
.nav__link {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 40px;
	padding: 0 12px;
	border: 2px solid transparent;
	border-radius: 999px;
	color: var(--ink);
	font-family: var(--font-display);
	font-weight: 600;
	text-decoration: none;
}
.nav__link:hover,
.nav__link.router-link-active {
	border-color: var(--line);
	background: var(--surface);
}
.nav__link--cta {
	border-color: var(--line);
	background: var(--primary);
	color: var(--primary-ink);
	box-shadow: var(--shadow-s);
}
.nav__link--cta:hover,
.nav__link--cta.router-link-active {
	background: var(--primary);
}
.nav__sound {
	display: grid;
	place-items: center;
	width: 42px;
	height: 42px;
	border: var(--border);
	border-radius: 50%;
	background: var(--surface);
	cursor: pointer;
}
@media (max-width: 520px) {
	.nav__link span {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}
	.nav__link {
		padding: 0 10px;
	}
	.logo__text {
		font-size: 1.25rem;
	}
}
</style>
