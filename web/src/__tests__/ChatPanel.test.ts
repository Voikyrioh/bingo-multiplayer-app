import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ChatPanel from '../components/ChatPanel.vue'

const messages = [
	{
		id: '1',
		kind: 'system' as const,
		authorId: null,
		authorName: null,
		text: 'Bob rejoint la partie.',
		createdAt: '2026-10-18T20:00:00.000Z',
	},
	{
		id: '2',
		kind: 'chat' as const,
		authorId: 'alice',
		authorName: 'Alice',
		text: 'Salut !',
		createdAt: '2026-10-18T20:01:00.000Z',
	},
	{
		id: '3',
		kind: 'announce' as const,
		authorId: 'alice',
		authorName: 'Alice',
		text: '🏆 Alice a rempli toute sa grille',
		createdAt: '2026-10-18T20:02:00.000Z',
		announcement: 'full' as const,
	},
]

describe('ChatPanel', () => {
	it('shows chat, system and announcement messages in a live log', () => {
		const wrapper = mount(ChatPanel, { props: { messages, me: 'bob', canWrite: true } })
		expect(wrapper.find('[role="log"]').exists()).toBe(true)
		expect(wrapper.find('.msg--chat').text()).toContain('Alice')
		expect(wrapper.find('.msg--full').text()).toContain('rempli toute sa grille')
	})

	it('sends a trimmed message and clears the field', async () => {
		const wrapper = mount(ChatPanel, { props: { messages, me: 'bob', canWrite: true } })
		const input = wrapper.find('input')
		await input.setValue('  Bien joué  ')
		await wrapper.find('form').trigger('submit')
		expect(wrapper.emitted('send')).toEqual([['Bien joué']])
		expect((input.element as HTMLInputElement).value).toBe('')
	})

	it('does not send an empty message', async () => {
		const wrapper = mount(ChatPanel, { props: { messages: [], me: 'bob', canWrite: true } })
		await wrapper.find('form').trigger('submit')
		expect(wrapper.emitted('send')).toBeUndefined()
		expect(wrapper.text()).toContain('Aucun message')
	})
})
