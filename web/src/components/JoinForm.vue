<script setup lang="ts">
import type { Membership, ParticipantRole, RoomPreview } from '@bingo/shared'
import { computed, ref } from 'vue'
import { ApiRequestError, api } from '../api/http'
import { lastName, rememberName } from '../lib/identity'
import NameField from './NameField.vue'
import AppButton from './ui/AppButton.vue'
import AppField from './ui/AppField.vue'
import AppSegmented from './ui/AppSegmented.vue'

const props = defineProps<{ preview: RoomPreview }>()
const emit = defineEmits<{ joined: [membership: Membership] }>()

const name = ref(lastName())
const password = ref('')
const playersFull = computed(() => props.preview.players >= props.preview.maxPlayers)
const role = ref<ParticipantRole>(playersFull.value ? 'spectator' : 'player')
const submitting = ref(false)
const error = ref<string | null>(null)
const passwordError = ref<string | null>(null)
const nameError = ref<string | null>(null)

const roles = computed(() => [
	{
		value: 'player' as const,
		label: '🎲 Jouer',
		hint: playersFull.value ? 'Complet' : 'Ma propre grille',
		disabled: playersFull.value,
	},
	{ value: 'spectator' as const, label: '👀 Regarder', hint: 'Spectateur' },
])

async function submit() {
	error.value = passwordError.value = nameError.value = null
	submitting.value = true
	try {
		const membership = await api.joinRoom(props.preview.code, {
			name: name.value.trim() || null,
			password: props.preview.hasPassword ? password.value : null,
			role: role.value,
		})
		if (name.value.trim()) rememberName(name.value.trim())
		emit('joined', membership)
	} catch (e) {
		const err = e as ApiRequestError
		if (err instanceof ApiRequestError && err.code === 'wrong-password')
			passwordError.value = err.message
		else if (err instanceof ApiRequestError && err.code === 'validation')
			nameError.value = err.message
		else error.value = err.message
	} finally {
		submitting.value = false
	}
}
</script>

<template>
	<form class="join" @submit.prevent="submit">
		<NameField v-model="name" :error="nameError" :room="preview.code" />
		<AppField
			v-if="preview.hasPassword"
			v-model="password"
			type="password"
			label="Mot de passe du salon"
			autocomplete="current-password"
			:error="passwordError"
			required
		/>
		<AppSegmented v-model="role" label="Comment voulez-vous participer ?" :options="roles" />
		<p v-if="error" class="join__error" role="alert">{{ error }}</p>
		<AppButton type="submit" size="lg" block :loading="submitting" icon-right="arrowRight">
			{{ role === 'player' ? 'C’est parti !' : 'Entrer en spectateur' }}
		</AppButton>
	</form>
</template>

<style scoped>
.join {
	display: grid;
	gap: 18px;
}
.join__error {
	padding: 10px 14px;
	border: 2px solid var(--danger);
	border-radius: var(--radius-m);
	background: var(--accent-soft);
	color: var(--ink);
	font-weight: 700;
}
</style>
