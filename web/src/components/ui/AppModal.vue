<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import AppIcon from './AppIcon.vue'

// Native <dialog>: focus trapping, Esc and the backdrop come from the browser.
const open = defineModel<boolean>('open', { default: false })
withDefaults(defineProps<{ title: string; wide?: boolean }>(), { wide: false })
const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()

watch(
	[open, dialog],
	([isOpen, el]) => {
		if (!el) return
		if (isOpen && !el.open) el.showModal?.()
		if (!isOpen && el.open) el.close()
	},
	{ immediate: true },
)

function onClose() {
	open.value = false
}

function onBackdrop(event: MouseEvent) {
	if (event.target === dialog.value) open.value = false
}

onBeforeUnmount(() => dialog.value?.close?.())
</script>

<template>
	<dialog
		ref="dialog"
		class="modal"
		:class="{ 'modal--wide': wide }"
		:aria-labelledby="titleId"
		@close="onClose"
		@click="onBackdrop"
	>
		<div v-if="open" class="modal__box">
			<header class="modal__header">
				<h2 :id="titleId" class="modal__title">{{ title }}</h2>
				<button type="button" class="modal__close" @click="open = false">
					<AppIcon name="x" label="Fermer" />
				</button>
			</header>
			<div class="modal__body"><slot /></div>
			<footer v-if="$slots.footer" class="modal__footer"><slot name="footer" /></footer>
		</div>
	</dialog>
</template>

<style scoped>
.modal {
	width: min(480px, calc(100vw - 2 * var(--gutter)));
	max-height: calc(100dvh - 32px);
	padding: 0;
	border: var(--border);
	border-radius: var(--radius-l);
	background: var(--surface);
	color: var(--ink);
	box-shadow: var(--shadow-l);
	overflow: auto;
}
.modal--wide {
	width: min(720px, calc(100vw - 2 * var(--gutter)));
}
.modal[open] {
	animation: pop 0.25s var(--ease-bounce);
}
.modal::backdrop {
	background: rgb(20 14 40 / 0.55);
	backdrop-filter: blur(3px);
}
.modal__box {
	display: grid;
	gap: 16px;
	padding: 20px;
}
.modal__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}
.modal__title {
	font-size: 1.35rem;
}
.modal__close {
	display: grid;
	place-items: center;
	width: 40px;
	height: 40px;
	border: var(--border);
	border-radius: 50%;
	background: var(--surface-2);
	cursor: pointer;
}
.modal__footer {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 10px;
}
@keyframes pop {
	from {
		transform: scale(0.9);
		opacity: 0;
	}
}
</style>
