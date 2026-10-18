<script setup lang="ts">
import { computed } from 'vue'
import { ICON_PATHS, type IconName } from '../../lib/icons'

// Hand-picked stroke icons (24×24 grid). Decorative by default: give a
// `label` when the icon is the only content of a control.

const props = withDefaults(defineProps<{ name: IconName; size?: number; label?: string }>(), {
	size: 20,
})
const d = computed(() => ICON_PATHS[props.name])
</script>

<template>
	<svg
		class="icon"
		:width="size"
		:height="size"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
		:role="label ? 'img' : undefined"
		:aria-label="label"
		:aria-hidden="label ? undefined : 'true'"
		focusable="false"
	>
		<path :d="d" />
	</svg>
</template>

<style scoped>
.icon {
	flex: none;
	display: inline-block;
	vertical-align: middle;
}
</style>
