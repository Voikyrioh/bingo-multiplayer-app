<script setup lang="ts">
import { cellsInLines } from '@bingo/shared'
import { computed } from 'vue'

// Thumbnail of a grid: colored squares only, the full grid opens on click.
const props = defineProps<{
	size: number
	total: number
	checked: number[]
	completedLines: string[]
}>()
const checkedSet = computed(() => new Set(props.checked))
const lineCells = computed(() => cellsInLines(props.size, props.completedLines))
</script>

<template>
	<div class="mini" :style="{ '--size': size }" aria-hidden="true">
		<span
			v-for="index in total"
			:key="index"
			class="mini__cell"
			:class="{
				'mini__cell--checked': checkedSet.has(index - 1),
				'mini__cell--line': lineCells.has(index - 1),
			}"
		/>
	</div>
</template>

<style scoped>
.mini {
	display: grid;
	grid-template-columns: repeat(var(--size), 1fr);
	gap: 2px;
	width: 56px;
	aspect-ratio: 1;
	padding: 3px;
	border: 2px solid var(--line);
	border-radius: 8px;
	background: var(--primary-soft);
}
.mini__cell {
	border-radius: 2px;
	background: var(--cell);
}
.mini__cell--checked {
	background: var(--cell-checked);
}
.mini__cell--line {
	background: var(--cell-line);
}
</style>
