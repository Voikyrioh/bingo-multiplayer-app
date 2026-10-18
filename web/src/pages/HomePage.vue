<script setup lang="ts">
import { RouterLink } from 'vue-router'
import JoinByCode from '../components/JoinByCode.vue'
import RoomList from '../components/RoomList.vue'
import AppButton from '../components/ui/AppButton.vue'

// Decorative grid of the hero: checked cells and one winning diagonal.
const demo = [
	'En même temps',
	'Tu m’entends ?',
	'Penalty !',
	'De mon temps…',
	'Synergie',
	'Café froid',
	'Mes chers compatriotes',
	'Ola',
	'Le fromage !',
]
const demoChecked = new Set([0, 4, 8, 2])
const demoLine = new Set([0, 4, 8])
</script>

<template>
	<section class="hero container">
		<div class="hero__text">
			<p class="hero__eyebrow">Discours, réunions, repas de famille, matchs…</p>
			<h1 class="hero__title">Le bingo <span class="hero__mark">en direct</span>, à plusieurs.</h1>
			<p class="hero__lead">
				Choisissez un dictionnaire d’expressions, partagez le lien : chacun reçoit sa propre grille et
				tout le monde voit qui s’approche du carton plein.
			</p>
			<div class="hero__cta">
				<AppButton to="/creer" size="lg" icon="users">Créer un salon</AppButton>
				<AppButton to="/solo" size="lg" variant="secondary" icon="play">Jouer en solo</AppButton>
			</div>
			<div class="hero__code"><JoinByCode /></div>
		</div>
		<div class="hero__art" aria-hidden="true">
			<div class="demo">
				<span
					v-for="(text, i) in demo"
					:key="text"
					class="demo__cell"
					:class="{ 'demo__cell--checked': demoChecked.has(i), 'demo__cell--line': demoLine.has(i) }"
					:style="{ '--i': i }"
				>{{ text }}</span>
			</div>
			<span class="demo__sticker">BINGO !</span>
		</div>
	</section>

	<section class="container section" aria-labelledby="live-title">
		<div class="section__head">
			<h2 id="live-title">Salons en cours</h2>
			<RouterLink to="/salons">Tous les salons →</RouterLink>
		</div>
		<RoomList :limit="6" />
	</section>

	<section class="container section" aria-labelledby="how-title">
		<h2 id="how-title" class="section__title">Comment ça marche ?</h2>
		<ol class="steps">
			<li class="step card">
				<span class="step__num">1</span>
				<h3>Choisissez les expressions</h3>
				<p>Un dictionnaire tout prêt, ou le vôtre en une minute (une expression par ligne).</p>
			</li>
			<li class="step card">
				<span class="step__num">2</span>
				<h3>Partagez le lien</h3>
				<p>Jusqu’à 50 joueurs par salon, avec ou sans mot de passe. Les curieux peuvent regarder.</p>
			</li>
			<li class="step card">
				<span class="step__num">3</span>
				<h3>Cochez en direct</h3>
				<p>Chaque ligne, diagonale ou carton plein est annoncé à tout le salon. Confettis garantis.</p>
			</li>
		</ol>
	</section>
</template>

<style scoped>
.hero {
	display: grid;
	grid-template-columns: 1.15fr 0.85fr;
	align-items: center;
	gap: 40px;
	padding-top: 48px;
	padding-bottom: 32px;
}
.hero__text {
	display: grid;
	gap: 18px;
}
.hero__eyebrow {
	font-family: var(--font-display);
	font-weight: 600;
	color: var(--accent);
}
.hero__title {
	font-size: clamp(2.3rem, 6vw, 4rem);
	font-weight: 700;
}
.hero__mark {
	display: inline-block;
	padding: 0 12px;
	border: var(--border);
	border-radius: 14px;
	background: var(--sun);
	color: #1f1b2e;
	box-shadow: var(--shadow-s);
	transform: rotate(-2deg);
}
.hero__lead {
	max-width: 52ch;
	font-size: 1.15rem;
	color: var(--ink-2);
}
.hero__cta {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}
.hero__code {
	max-width: 360px;
}
.hero__art {
	position: relative;
	justify-self: center;
	width: min(100%, 400px);
}
.demo {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 10px;
	padding: 14px;
	border: var(--border);
	border-radius: var(--radius-l);
	background: var(--primary-soft);
	box-shadow: var(--shadow-l);
	transform: rotate(3deg);
}
.demo__cell {
	display: grid;
	place-items: center;
	aspect-ratio: 1;
	padding: 6px;
	border: var(--border);
	border-radius: 14px;
	background: var(--cell);
	font-family: var(--font-display);
	font-weight: 500;
	font-size: clamp(0.75rem, 2.2vw, 1rem);
	text-align: center;
	animation: pop-in 0.5s var(--ease-bounce) both;
	animation-delay: calc(var(--i) * 70ms);
}
.demo__cell--checked {
	background: var(--cell-checked);
	color: var(--cell-checked-ink);
}
.demo__cell--line {
	background: var(--cell-line);
	color: var(--cell-line-ink);
}
.demo__sticker {
	position: absolute;
	right: -14px;
	bottom: -18px;
	padding: 8px 16px;
	border: var(--border);
	border-radius: 999px;
	background: var(--accent);
	color: #fff;
	font-family: var(--font-display);
	font-weight: 700;
	font-size: 1.4rem;
	box-shadow: var(--shadow-m);
	transform: rotate(-8deg);
	animation: bounce 2.4s ease-in-out infinite;
}
.section {
	display: grid;
	gap: 18px;
	padding-top: 40px;
}
.section__head {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	justify-content: space-between;
	gap: 8px;
}
.section__head h2,
.section__title {
	font-size: 1.8rem;
}
.steps {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
	gap: 18px;
}
.step {
	display: grid;
	gap: 8px;
	padding: 20px;
}
.step:nth-child(2) {
	background: var(--sky-soft);
}
.step:nth-child(3) {
	background: var(--mint-soft);
}
.step__num {
	display: grid;
	place-items: center;
	width: 42px;
	height: 42px;
	border: var(--border);
	border-radius: 50%;
	background: var(--sun);
	color: #1f1b2e;
	font-family: var(--font-display);
	font-weight: 700;
	font-size: 1.3rem;
}
.step p {
	color: var(--ink-2);
}
@keyframes pop-in {
	from {
		transform: scale(0.4);
		opacity: 0;
	}
}
@keyframes bounce {
	50% {
		transform: rotate(-4deg) translateY(-8px);
	}
}
@media (max-width: 820px) {
	.hero {
		grid-template-columns: 1fr;
		padding-top: 28px;
	}
	.hero__art {
		width: min(80%, 320px);
		order: -1;
	}
}
</style>
