<script setup lang="ts">
import {
	type DictionarySummary,
	entriesNeeded,
	type GridSize,
	hasCenter,
	LIMITS,
	type RoomMode,
} from '@bingo/shared'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiRequestError, api } from '../api/http'
import DictionaryEditor from '../components/DictionaryEditor.vue'
import DictionaryPicker from '../components/DictionaryPicker.vue'
import NameField from '../components/NameField.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppField from '../components/ui/AppField.vue'
import AppSegmented from '../components/ui/AppSegmented.vue'
import AppToggle from '../components/ui/AppToggle.vue'
import { useI18n } from '../i18n/useI18n'
import { usePageTitle } from '../i18n/usePageTitle'
import { type DraftProblem, draftProblem, emptyDraft, parseEntries } from '../lib/dictionary-draft'
import { lastName, rememberName, saveMembership } from '../lib/identity'

const props = defineProps<{ mode: RoomMode }>()
const route = useRoute()
const router = useRouter()
const solo = computed(() => props.mode === 'solo')
const { t, tc, errorText, language } = useI18n()
usePageTitle(() => (solo.value ? t('create.soloTitle') : t('rooms.create')))

const dictionaryCode = ref(typeof route.query.d === 'string' ? route.query.d : 'discours-macron')
const extraDictionary = ref<DictionarySummary | null>(null)
// A new dictionary is in the interface language unless the author says otherwise.
const draft = ref(emptyDraft(language.value.code))
const gridSize = ref<GridSize>(LIMITS.defaultGridSize)
const freeCenter = ref(true)
const roomName = ref('')
const password = ref('')
const listed = ref(true)
const ownerName = ref(lastName())

const submitting = ref(false)
// Kept as received, translated when shown (the language may change meanwhile).
const error = ref<unknown>(null)
const draftError = ref<DraftProblem | null>(null)
const draftErrorText = computed(() => {
	const problem = draftError.value
	if (!problem) return null
	const key = `draft.${problem.key}`
	return problem.count === undefined
		? t(key, problem.params)
		: tc(key, problem.count, problem.params)
})

const needed = computed(() => entriesNeeded(gridSize.value, freeCenter.value))
const sizes = computed(() => [
	{ value: 3 as const, label: '3×3', hint: t('create.size3') },
	{ value: 4 as const, label: '4×4', hint: t('create.size4') },
	{ value: 5 as const, label: '5×5', hint: t('create.size5') },
])

// A dictionary shared by link (/d/<code> → "Jouer avec") may be unlisted.
onMounted(async () => {
	const code = route.query.d
	if (typeof code !== 'string') return
	try {
		const d = await api.getDictionary(code)
		extraDictionary.value = d
		if (d.entryCount < entriesNeeded(5, true)) gridSize.value = d.entryCount >= 16 ? 4 : 3
	} catch {
		dictionaryCode.value = 'discours-macron'
	}
})

watch(
	() => draft.value.entriesText,
	() => {
		draftError.value = null
	},
)

const pickedTitle = ref('')
const dictionaryTitle = computed(() =>
	dictionaryCode.value === 'new' ? draft.value.title.trim() : pickedTitle.value,
)

async function submit() {
	error.value = draftError.value = null
	let code = dictionaryCode.value
	if (code === 'new') {
		const problem = draftProblem(draft.value, needed.value)
		if (problem) {
			draftError.value = problem
			document.getElementById('step-dictionary')?.scrollIntoView({ behavior: 'smooth' })
			return
		}
	}
	const name = solo.value
		? t('create.soloRoomName', { title: dictionaryTitle.value || 'Bingo' }).slice(
				0,
				LIMITS.roomNameMax,
			)
		: roomName.value.trim()
	if (!solo.value && name.length < LIMITS.roomNameMin) {
		error.value = new ApiRequestError(0, 'validation', 'roomNameLength', {
			min: LIMITS.roomNameMin,
			max: LIMITS.roomNameMax,
		})
		return
	}
	submitting.value = true
	try {
		if (code === 'new') {
			const created = await api.createDictionary({
				language: draft.value.language,
				title: draft.value.title,
				description: draft.value.description,
				entries: parseEntries(draft.value.entriesText),
				freeSpace: draft.value.freeSpace || null,
				isPublic: draft.value.isPublic,
			})
			code = created.code
			dictionaryCode.value = code
			extraDictionary.value = created
		}
		const membership = await api.createRoom({
			name,
			mode: props.mode,
			visibility: listed.value ? 'public' : 'unlisted',
			password: solo.value ? null : password.value || null,
			dictionaryCode: code,
			gridSize: gridSize.value,
			freeCenter: freeCenter.value,
			ownerName: ownerName.value.trim() || null,
		})
		if (ownerName.value.trim()) rememberName(ownerName.value.trim())
		saveMembership(membership)
		await router.push({ path: `/r/${membership.roomCode}`, query: { nouveau: '1' } })
	} catch (e) {
		error.value = e
	} finally {
		submitting.value = false
	}
}
</script>

<template>
	<div class="container create">
		<header class="create__head">
			<p class="eyebrow">{{ solo ? t('room.solo') : t('create.eyebrow') }}</p>
			<h1>{{ solo ? t('create.soloTitle') : t('rooms.create') }}</h1>
			<p class="muted">{{ solo ? t('create.soloLead') : t('create.lead') }}</p>
		</header>

		<form class="create__form" novalidate @submit.prevent="submit">
			<section id="step-dictionary" class="step card" aria-labelledby="step-1">
				<h2 id="step-1" class="step__title"><span class="step__num">1</span> {{ t('create.stepDictionary') }}</h2>
				<DictionaryPicker v-model="dictionaryCode" v-model:title="pickedTitle" :needed="needed" :extra="extraDictionary" />
				<Transition name="unfold">
					<div v-if="dictionaryCode === 'new'" class="step__editor">
						<DictionaryEditor v-model="draft" :needed="needed" :error="draftErrorText" />
					</div>
				</Transition>
			</section>

			<section class="step card" aria-labelledby="step-2">
				<h2 id="step-2" class="step__title"><span class="step__num">2</span> {{ t('create.stepGrid') }}</h2>
				<AppSegmented v-model="gridSize" :label="t('create.size')" :options="sizes" />
				<AppToggle
					v-model="freeCenter"
					:label="t('create.freeCenter')"
					:hint="hasCenter(gridSize) ? t('create.freeCenterHint') : t('create.freeCenterOdd')"
					:disabled="!hasCenter(gridSize)"
				/>
				<p class="muted">{{ tc('create.gridHint', needed) }}</p>
			</section>

			<section v-if="!solo" class="step card" aria-labelledby="step-3">
				<h2 id="step-3" class="step__title"><span class="step__num">3</span> {{ t('create.stepRoom') }}</h2>
				<AppField v-model="roomName" :label="t('create.roomName')" :maxlength="LIMITS.roomNameMax" :placeholder="t('create.roomNamePlaceholder')" required />
				<AppField
					v-model="password"
					type="password"
					:label="t('create.password')"
					:maxlength="LIMITS.passwordMax"
					:hint="t('create.passwordHint')"
					autocomplete="new-password"
				/>
				<AppToggle v-model="listed" :label="t('create.listed')" :hint="t('create.listedHint')" />
			</section>

			<section class="step card" aria-labelledby="step-4">
				<h2 id="step-4" class="step__title"><span class="step__num">{{ solo ? 3 : 4 }}</span> {{ t('create.stepYou') }}</h2>
				<NameField
					v-model="ownerName"
					:dictionary="dictionaryCode === 'new' ? undefined : dictionaryCode"
				/>
			</section>

			<p v-if="error" class="create__error" role="alert">{{ errorText(error) }}</p>
			<div class="create__submit">
				<AppButton type="submit" size="lg" :loading="submitting" icon-right="arrowRight">
					{{ solo ? t('create.submitSolo') : t('create.submit') }}
				</AppButton>
			</div>
		</form>
	</div>
</template>

<style scoped>
.create {
	display: grid;
	gap: 24px;
	max-width: 900px;
	padding-top: 32px;
}
.create__head {
	display: grid;
	gap: 8px;
}
.create__head h1 {
	font-size: clamp(2rem, 5vw, 2.8rem);
}
.create__form {
	display: grid;
	gap: 22px;
}
.step {
	display: grid;
	gap: 18px;
	padding: 20px;
}
.step__title {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 1.4rem;
}
.step__num {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border: var(--border);
	border-radius: 50%;
	background: var(--sun);
	color: #1f1b2e;
	font-size: 1.1rem;
}
.step__editor {
	padding-top: 18px;
	border-top: 2px dashed var(--ink-3);
}
.create__error {
	padding: 12px 16px;
	border: 2px solid var(--danger);
	border-radius: var(--radius-m);
	background: var(--accent-soft);
	font-weight: 700;
}
.create__submit {
	position: sticky;
	bottom: 12px;
	display: flex;
	justify-content: flex-end;
}
.unfold-enter-active {
	transition: all 0.3s ease;
}
.unfold-enter-from {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
