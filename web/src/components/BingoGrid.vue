<script setup lang="ts">
import { cellsInLines, type GridCellView, linesOf } from '@bingo/shared'
import { computed, nextTick, ref, watch } from 'vue'

const props = withDefaults(
	defineProps<{
		size: number
		cells: GridCellView[]
		checked: number[]
		completedLines: string[]
		/** Only the owner of the grid can click it. */
		interactive?: boolean
		label: string
	}>(),
	{ interactive: false },
)
const emit = defineEmits<{ toggle: [cell: number]; lineCompleted: [cell: number] }>()

const checkedSet = computed(() => new Set(props.checked))
const lineCells = computed(() => cellsInLines(props.size, props.completedLines))
const focusIndex = ref(0)
const buttons = ref<HTMLButtonElement[]>([])

// Cells of newly completed lines play a wave, cell after cell.
const wave = ref(new Map<number, number>())
watch(
	() => props.completedLines,
	(now, before) => {
		const old = new Set(before ?? [])
		const fresh = now.filter((id) => !old.has(id))
		if (!before || fresh.length === 0) return
		const delays = new Map<number, number>()
		for (const line of linesOf(props.size)) {
			if (!fresh.includes(line.id)) continue
			line.cells.forEach((cell, i) => {
				delays.set(cell, Math.min(delays.get(cell) ?? Number.POSITIVE_INFINITY, i))
			})
		}
		wave.value = delays
		const middle = linesOf(props.size).find((l) => l.id === fresh[0])?.cells[
			Math.floor(props.size / 2)
		]
		if (middle !== undefined) emit('lineCompleted', middle)
		setTimeout(() => {
			if (wave.value === delays) wave.value = new Map()
		}, 1400)
	},
)

function cellLabel(cell: GridCellView, index: number): string {
	const row = Math.floor(index / props.size) + 1
	const col = (index % props.size) + 1
	const state = cell.free ? 'case gratuite' : checkedSet.value.has(index) ? 'cochée' : 'non cochée'
	return `Ligne ${row}, colonne ${col} : ${cell.text}, ${state}`
}

function move(event: KeyboardEvent, index: number) {
	const n = props.size
	const moves: Record<string, number> = {
		ArrowRight: index % n < n - 1 ? 1 : 0,
		ArrowLeft: index % n > 0 ? -1 : 0,
		ArrowDown: index + n < n * n ? n : 0,
		ArrowUp: index - n >= 0 ? -n : 0,
		Home: -(index % n),
		End: n - 1 - (index % n),
	}
	const delta = moves[event.key]
	if (delta === undefined) return
	event.preventDefault()
	focusIndex.value = index + delta
	void nextTick(() => buttons.value[focusIndex.value]?.focus())
}

function onClick(index: number) {
	focusIndex.value = index
	if (props.interactive && !props.cells[index]?.free) emit('toggle', index)
}

defineExpose({ cellElement: (index: number) => buttons.value[index] ?? null })
</script>

<template>
	<div
		class="grid"
		:class="[`grid--${size}`, { 'grid--interactive': interactive }]"
		:style="{ '--size': size }"
		role="group"
		:aria-label="label"
	>
		<template v-for="(cell, index) in cells" :key="index">
			<button
				v-if="interactive"
				ref="buttons"
				type="button"
				class="cell"
				:class="{
					'cell--checked': checkedSet.has(index),
					'cell--line': lineCells.has(index),
					'cell--free': cell.free,
					'cell--wave': wave.has(index),
				}"
				:style="wave.has(index) ? { '--delay': `${(wave.get(index) ?? 0) * 70}ms` } : undefined"
				:tabindex="index === focusIndex ? 0 : -1"
				:aria-pressed="checkedSet.has(index)"
				:aria-disabled="cell.free || undefined"
				:aria-label="cellLabel(cell, index)"
				@click="onClick(index)"
				@keydown="move($event, index)"
			>
				<span class="cell__text">{{ cell.text }}</span>
				<span v-if="checkedSet.has(index) && !cell.free" class="cell__stamp" aria-hidden="true" />
				<span v-if="cell.free" class="cell__star" aria-hidden="true">★</span>
			</button>
			<div
				v-else
				class="cell"
				:class="{
					'cell--checked': checkedSet.has(index),
					'cell--line': lineCells.has(index),
					'cell--free': cell.free,
				}"
				:aria-label="cellLabel(cell, index)"
				role="img"
			>
				<span class="cell__text" aria-hidden="true">{{ cell.text }}</span>
				<span v-if="checkedSet.has(index) && !cell.free" class="cell__stamp" aria-hidden="true" />
				<span v-if="cell.free" class="cell__star" aria-hidden="true">★</span>
			</div>
		</template>
	</div>
</template>

<style scoped>
.grid {
	container-type: inline-size;
	display: grid;
	grid-template-columns: repeat(var(--size), minmax(0, 1fr));
	gap: clamp(4px, 1.1vw, 10px);
	width: 100%;
	aspect-ratio: 1;
	padding: clamp(6px, 1.6vw, 14px);
	border: var(--border);
	border-radius: var(--radius-l);
	background: var(--primary-soft);
	box-shadow: var(--shadow-m);
}
.cell {
	--fs: calc(12.5cqi / var(--size));
	position: relative;
	display: grid;
	place-items: center;
	min-width: 0;
	padding: 4px;
	border: var(--border);
	border-radius: clamp(6px, 2cqi, 14px);
	background: var(--cell);
	color: var(--ink);
	font-family: var(--font-display);
	font-weight: 500;
	font-size: clamp(0.55rem, var(--fs), 1.15rem);
	line-height: 1.12;
	text-align: center;
	overflow: hidden;
	overflow-wrap: anywhere;
	hyphens: auto;
	user-select: none;
	-webkit-tap-highlight-color: transparent;
	transition:
		transform 0.18s var(--ease-bounce),
		background 0.2s ease,
		color 0.2s ease;
}
.grid--interactive .cell {
	cursor: pointer;
	box-shadow: var(--shadow-s);
}
.grid--interactive .cell:hover:not(.cell--free) {
	transform: translateY(-2px) rotate(-1deg);
}
.grid--interactive .cell:active:not(.cell--free) {
	transform: scale(0.94);
}
.cell__text {
	position: relative;
	z-index: 1;
	display: -webkit-box;
	-webkit-line-clamp: 5;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.cell--checked {
	background: var(--cell-checked);
	color: var(--cell-checked-ink);
}
.cell--line {
	background: var(--cell-line);
	color: var(--cell-line-ink);
}
.cell--free {
	background: var(--cell-free);
	color: var(--ink);
	cursor: default;
}
.cell--free.cell--line {
	background: var(--cell-line);
	color: var(--cell-line-ink);
}
.cell__stamp {
	position: absolute;
	inset: 12%;
	border-radius: 50%;
	border: 3px solid currentColor;
	opacity: 0.22;
	animation: stamp 0.32s var(--ease-bounce);
}
.cell__star {
	position: absolute;
	top: 3px;
	right: 6px;
	font-size: 0.9em;
	color: var(--accent);
}
.cell--wave {
	animation: wave 0.6s var(--ease-bounce) both;
	animation-delay: var(--delay, 0ms);
}
@keyframes stamp {
	from {
		transform: scale(1.8) rotate(-20deg);
		opacity: 0;
	}
}
@keyframes wave {
	40% {
		transform: translateY(-10%) scale(1.08) rotate(-3deg);
	}
}
</style>
