<script setup lang="ts">
import type { Membership, ParticipantRole, RoomPreview } from '@bingo/shared'
import { computed, ref } from 'vue'
import { ApiRequestError, api } from '../api/http'
import { useI18n } from '../i18n/useI18n'
import { lastName, rememberName } from '../lib/identity'
import NameField from './NameField.vue'
import AppButton from './ui/AppButton.vue'
import AppField from './ui/AppField.vue'
import AppSegmented from './ui/AppSegmented.vue'

const props = defineProps<{ preview: RoomPreview }>()
const emit = defineEmits<{ joined: [membership: Membership] }>()

const { t, errorText } = useI18n()
const name = ref(lastName())
const password = ref('')
const playersFull = computed(() => props.preview.players >= props.preview.maxPlayers)
const role = ref<ParticipantRole>(playersFull.value ? 'spectator' : 'player')
const submitting = ref(false)
// Errors are kept as received and translated when shown (language switch).
const error = ref<unknown>(null)
const passwordError = ref<unknown>(null)
const nameError = ref<unknown>(null)

const roles = computed(() => [
	{
		value: 'player' as const,
		label: t('join.play'),
		hint: playersFull.value ? t('join.full') : t('join.playHint'),
		disabled: playersFull.value,
	},
	{ value: 'spectator' as const, label: t('join.watch'), hint: t('join.watchHint') },
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
		if (e instanceof ApiRequestError && e.code === 'wrong-password') passwordError.value = e
		else if (e instanceof ApiRequestError && e.code === 'validation') nameError.value = e
		else error.value = e
	} finally {
		submitting.value = false
	}
}
</script>

<template>
	<form class="join" @submit.prevent="submit">
		<NameField v-model="name" :error="nameError ? errorText(nameError) : null" :room="preview.code" />
		<AppField
			v-if="preview.hasPassword"
			v-model="password"
			type="password"
			:label="t('join.password')"
			autocomplete="current-password"
			:error="passwordError ? errorText(passwordError) : null"
			required
		/>
		<AppSegmented v-model="role" :label="t('join.how')" :options="roles" />
		<p v-if="error" class="join__error" role="alert">{{ errorText(error) }}</p>
		<AppButton type="submit" size="lg" block :loading="submitting" icon-right="arrowRight">
			{{ role === 'player' ? t('join.submitPlayer') : t('join.submitSpectator') }}
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
