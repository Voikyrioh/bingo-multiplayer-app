import { shallowRef } from 'vue'
import type { BurstOptions, ConfettiEngine } from '../lib/confetti'

/** One confetti canvas for the whole app (mounted by ConfettiCanvas in App.vue). */
const engine = shallowRef<ConfettiEngine | null>(null)

export function registerConfetti(instance: ConfettiEngine | null): void {
	engine.value = instance
}

export function useCelebration() {
	return {
		burst: (options?: BurstOptions) => engine.value?.burst(options),
		/** Small burst from an element (a completed line). */
		burstFrom(element: Element | null, count = 60) {
			if (!element) return engine.value?.burst({ count })
			const rect = element.getBoundingClientRect()
			engine.value?.burst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count })
		},
		celebrate: () => engine.value?.celebrate(),
	}
}
