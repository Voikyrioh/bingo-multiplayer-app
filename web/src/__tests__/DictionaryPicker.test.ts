import type { DictionarySummary } from '@bingo/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/http'
import DictionaryPicker from '../components/DictionaryPicker.vue'

const dictionary = (code: string, language: DictionarySummary['language'], featured = false) => ({
	code,
	language,
	title: code,
	description: '',
	entryCount: 30,
	featured,
})

afterEach(() => vi.restoreAllMocks())

async function mountPicker(selected = 'discours-macron') {
	vi.spyOn(api, 'listDictionaries').mockResolvedValue([
		dictionary('discours-macron', 'fr', true),
		dictionary('weihnachten', 'de'),
		dictionary('repas', 'fr'),
	])
	const wrapper = mount(DictionaryPicker, {
		props: {
			modelValue: selected,
			'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
			needed: 24,
		},
	})
	await flushPromises()
	return wrapper
}

const shown = (wrapper: Awaited<ReturnType<typeof mountPicker>>) =>
	wrapper
		.findAll('input[type="radio"]')
		.map((input) => (input.element as HTMLInputElement).value)
		.filter((value) => value !== 'new')

describe('DictionaryPicker', () => {
	it('shows the dictionaries of the interface language first', async () => {
		const wrapper = await mountPicker()
		expect(shown(wrapper)).toEqual(['discours-macron', 'repas'])
		expect(wrapper.text()).toContain('Populaire')
	})

	it('shows every language on demand', async () => {
		const wrapper = await mountPicker()
		await wrapper.find('select').setValue('all')
		expect(shown(wrapper)).toEqual(['discours-macron', 'weihnachten', 'repas'])
	})

	it('never keeps a selection hidden by the filter', async () => {
		const wrapper = await mountPicker()
		await wrapper.find('select').setValue('de')
		await flushPromises()
		expect(shown(wrapper)).toEqual(['weihnachten'])
		expect(wrapper.props('modelValue')).toBe('weihnachten')

		await wrapper.find('select').setValue('it')
		await flushPromises()
		expect(wrapper.props('modelValue')).toBe('new')
		expect(wrapper.text()).toContain('Aucun dictionnaire dans cette langue')
	})
})
