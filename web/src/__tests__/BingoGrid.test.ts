import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BingoGrid from '../components/BingoGrid.vue'
import { cells } from './fixtures'

function mountGrid(props: Partial<InstanceType<typeof BingoGrid>['$props']> = {}) {
	return mount(BingoGrid, {
		props: {
			size: 3,
			cells,
			checked: [4],
			completedLines: [],
			interactive: true,
			label: 'Ma grille',
			...props,
		},
		attachTo: document.body,
	})
}

describe('BingoGrid', () => {
	it('renders one pressed-state button per cell', () => {
		const wrapper = mountGrid({ checked: [0, 4] })
		const buttons = wrapper.findAll('button')
		expect(buttons).toHaveLength(9)
		expect(buttons[0]?.attributes('aria-pressed')).toBe('true')
		expect(buttons[1]?.attributes('aria-pressed')).toBe('false')
		expect(buttons[0]?.attributes('aria-label')).toBe('Ligne 1, colonne 1 : Expression 0, cochée')
	})

	it('emits toggle on click, except on the free cell', async () => {
		const wrapper = mountGrid()
		await wrapper.findAll('button')[2]?.trigger('click')
		await wrapper.findAll('button')[4]?.trigger('click')
		expect(wrapper.emitted('toggle')).toEqual([[2]])
	})

	it('moves the focus with the arrow keys (roving tabindex)', async () => {
		const wrapper = mountGrid()
		const buttons = wrapper.findAll('button')
		expect(buttons.filter((b) => b.attributes('tabindex') === '0')).toHaveLength(1)
		await buttons[0]?.trigger('keydown', { key: 'ArrowDown' })
		await new Promise((r) => setTimeout(r))
		expect(document.activeElement).toBe(buttons[3]?.element)
		wrapper.unmount()
	})

	it('highlights completed lines and announces a new one', async () => {
		const wrapper = mountGrid({ checked: [0, 1, 2, 4] })
		await wrapper.setProps({ completedLines: ['r0'] })
		expect(wrapper.findAll('.cell--line')).toHaveLength(3)
		expect(wrapper.emitted('lineCompleted')).toEqual([[1]])
	})

	it('is read only for the grid of somebody else', () => {
		const wrapper = mountGrid({ interactive: false })
		expect(wrapper.findAll('button')).toHaveLength(0)
		expect(wrapper.findAll('[role="img"]')).toHaveLength(9)
	})
})
