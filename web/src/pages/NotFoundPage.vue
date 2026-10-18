<script setup lang="ts">
import AppButton from '../components/ui/AppButton.vue'
</script>

<template>
	<div class="container lost">
		<p class="lost__emoji" aria-hidden="true">🙈</p>
		<h1>Cette case n’est pas sur la grille</h1>
		<p class="muted">La page demandée n’existe pas (ou plus).</p>
		<AppButton to="/" icon="arrowLeft">Retour à l’accueil</AppButton>
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
