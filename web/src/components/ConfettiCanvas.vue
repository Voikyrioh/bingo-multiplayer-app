<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { registerConfetti } from '../composables/useCelebration'
import { ConfettiEngine } from '../lib/confetti'
import { prefersReducedMotion } from '../lib/motion'

const canvas = ref<HTMLCanvasElement | null>(null)
let engine: ConfettiEngine | null = null
const onResize = () => engine?.resize()

onMounted(() => {
	if (!canvas.value) return
	engine = new ConfettiEngine(canvas.value, prefersReducedMotion)
	registerConfetti(engine)
	window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', onResize)
	engine?.destroy()
	registerConfetti(null)
})
</script>

<template>
	<canvas ref="canvas" class="confetti" aria-hidden="true" />
</template>

<style scoped>
.confetti {
	position: fixed;
	inset: 0;
	z-index: 70;
	width: 100vw;
	height: 100dvh;
	pointer-events: none;
}
</style>
