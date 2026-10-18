<script setup lang="ts">
import JoinByCode from '../components/JoinByCode.vue'
import RoomList from '../components/RoomList.vue'
import AppButton from '../components/ui/AppButton.vue'
</script>

<template>
	<div class="container page">
		<header class="page__head">
			<div>
				<h1>Salons en cours</h1>
				<p class="muted">Les salons publics, mis à jour en direct. Le cadenas indique un mot de passe.</p>
			</div>
			<AppButton to="/creer" icon="plus">Créer un salon</AppButton>
		</header>
		<div class="page__code"><JoinByCode /></div>
		<RoomList />
	</div>
</template>

<style scoped>
.page {
	display: grid;
	gap: 24px;
	padding-top: 32px;
}
.page__head {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 16px;
}
.page__head h1 {
	font-size: clamp(2rem, 5vw, 2.8rem);
}
.page__code {
	max-width: 360px;
}
</style>
