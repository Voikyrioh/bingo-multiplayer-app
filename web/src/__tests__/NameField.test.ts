import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/http'
import NameField from '../components/NameField.vue'

afterEach(() => vi.restoreAllMocks())

describe('NameField', () => {
	it('draws a name themed by the room when the dice is rolled', async () => {
		vi.spyOn(api, 'randomName').mockResolvedValue({ name: 'ManuDu92' })
		const wrapper = mount(NameField, { props: { modelValue: '', room: 'ABC234' } })
		await wrapper.find('button').trigger('click')
		await flushPromises()
		expect(api.randomName).toHaveBeenCalledWith({ room: 'ABC234', dictionary: undefined })
		expect(wrapper.emitted('update:modelValue')).toEqual([['ManuDu92']])
	})

	it('accepts names up to 30 characters', () => {
		const wrapper = mount(NameField, { props: { modelValue: '' } })
		expect(wrapper.find('input').attributes('maxlength')).toBe('30')
	})
})
