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
import { draftProblem, emptyDraft, parseEntries } from '../lib/dictionary-draft'
import { lastName, rememberName, saveMembership } from '../lib/identity'

const props = defineProps<{ mode: RoomMode }>()
const route = useRoute()
const router = useRouter()
const solo = computed(() => props.mode === 'solo')

const dictionaryCode = ref(typeof route.query.d === 'string' ? route.query.d : 'discours-macron')
const extraDictionary = ref<DictionarySummary | null>(null)
const draft = ref(emptyDraft())
const gridSize = ref<GridSize>(LIMITS.defaultGridSize)
const freeCenter = ref(true)
const roomName = ref('')
const password = ref('')
const listed = ref(true)
const ownerName = ref(lastName())

const submitting = ref(false)
const error = ref<string | null>(null)
const draftError = ref<string | null>(null)
const nameError = ref<string | null>(null)

const needed = computed(() => entriesNeeded(gridSize.value, freeCenter.value))
const sizes = [
	{ value: 3 as const, label: '3×3', hint: 'Express' },
	{ value: 4 as const, label: '4×4', hint: 'Classique' },
	{ value: 5 as const, label: '5×5', hint: 'Marathon' },
]

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
	error.value = draftError.value = nameError.value = null
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
		? `Solo · ${dictionaryTitle.value || 'Bingo'}`.slice(0, LIMITS.roomNameMax)
		: roomName.value.trim()
	if (!solo.value && name.length < LIMITS.roomNameMin) {
		error.value = 'Donnez un nom à votre salon (3 caractères minimum).'
		return
	}
	submitting.value = true
	try {
		if (code === 'new') {
			const created = await api.createDictionary({
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
		const err = e as ApiRequestError
		error.value = err instanceof ApiRequestError ? err.message : 'Oups, une erreur inattendue.'
	} finally {
		submitting.value = false
	}
}
</script>

<template>
	<div class="container create">
		<header class="create__head">
			<p class="eyebrow">{{ solo ? 'Partie solo' : 'Nouveau salon' }}</p>
			<h1>{{ solo ? 'Jouer en solo' : 'Créer un salon' }}</h1>
			<p class="muted">
				{{
					solo
						? 'Une grille rien que pour vous. Si vous écrivez votre dictionnaire, vous pourrez partager son lien.'
						: 'Trois choix et c’est parti : vous recevez un lien à envoyer à vos amis.'
				}}
			</p>
		</header>

		<form class="create__form" novalidate @submit.prevent="submit">
			<section id="step-dictionary" class="step card" aria-labelledby="step-1">
				<h2 id="step-1" class="step__title"><span class="step__num">1</span> Le dictionnaire</h2>
				<DictionaryPicker v-model="dictionaryCode" v-model:title="pickedTitle" :needed="needed" :extra="extraDictionary" />
				<Transition name="unfold">
					<div v-if="dictionaryCode === 'new'" class="step__editor">
						<DictionaryEditor v-model="draft" :needed="needed" :error="draftError" />
					</div>
				</Transition>
			</section>

			<section class="step card" aria-labelledby="step-2">
				<h2 id="step-2" class="step__title"><span class="step__num">2</span> La grille</h2>
				<AppSegmented v-model="gridSize" label="Taille" :options="sizes" />
				<AppToggle
					v-model="freeCenter"
					label="Case gratuite au centre"
					:hint="hasCenter(gridSize) ? 'Elle est cochée d’office.' : 'Seulement pour les grilles 3×3 et 5×5.'"
					:disabled="!hasCenter(gridSize)"
				/>
				<p class="muted">Chaque joueur reçoit une grille différente tirée du même dictionnaire ({{ needed }} expressions par grille).</p>
			</section>

			<section v-if="!solo" class="step card" aria-labelledby="step-3">
				<h2 id="step-3" class="step__title"><span class="step__num">3</span> Le salon</h2>
				<AppField v-model="roomName" label="Nom du salon" :maxlength="LIMITS.roomNameMax" placeholder="Ex. : Allocution du 20 h" required />
				<AppField
					v-model="password"
					type="password"
					label="Mot de passe (facultatif)"
					:maxlength="LIMITS.passwordMax"
					hint="Demandé aux joueurs comme aux spectateurs."
					autocomplete="new-password"
				/>
				<AppToggle v-model="listed" label="Afficher dans la liste des salons" hint="Sinon, seules les personnes qui ont le lien pourront entrer." />
			</section>

			<section class="step card" aria-labelledby="step-4">
				<h2 id="step-4" class="step__title"><span class="step__num">{{ solo ? 3 : 4 }}</span> Vous</h2>
				<NameField v-model="ownerName" :error="nameError" />
			</section>

			<p v-if="error" class="create__error" role="alert">{{ error }}</p>
			<div class="create__submit">
				<AppButton type="submit" size="lg" :loading="submitting" icon-right="arrowRight">
					{{ solo ? 'Lancer ma partie' : 'Créer le salon' }}
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
