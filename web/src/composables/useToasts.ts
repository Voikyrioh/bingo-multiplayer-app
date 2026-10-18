import { reactive } from 'vue'

export type ToastTone = 'info' | 'success' | 'error'

export interface Toast {
	id: number
	text: string
	tone: ToastTone
}

const toasts = reactive<Toast[]>([])
let nextId = 1

/** Small notifications at the bottom of the screen, read by screen readers. */
export function useToasts() {
	function show(text: string, tone: ToastTone = 'info', duration = 3500) {
		const id = nextId++
		toasts.push({ id, text, tone })
		setTimeout(() => dismiss(id), duration)
	}
	function dismiss(id: number) {
		const index = toasts.findIndex((t) => t.id === id)
		if (index >= 0) toasts.splice(index, 1)
	}
	return { toasts, show, dismiss }
}
