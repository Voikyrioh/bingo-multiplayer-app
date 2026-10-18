import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, api } from '../api/http'
import JoinForm from '../components/JoinForm.vue'

const preview = {
	code: 'ABC234',
	name: 'Salon',
	dictionaryTitle: 'Discours',
	gridSize: 5,
	hasPassword: true,
	players: 3,
	spectators: 0,
	maxPlayers: 50,
	createdAt: '2026-10-18T20:00:00.000Z',
	lastActivityAt: '2026-10-18T20:00:00.000Z',
	mode: 'multi' as const,
	visibility: 'public' as const,
	closed: false,
}

afterEach(() => vi.restoreAllMocks())

describe('JoinForm', () => {
	it('asks for the password and shows a wrong password next to the field', async () => {
		vi.spyOn(api, 'joinRoom').mockRejectedValue(
			new ApiRequestError(403, 'wrong-password', 'Mot de passe incorrect.'),
		)
		const wrapper = mount(JoinForm, { props: { preview } })
		await wrapper.find('input[type="password"]').setValue('nope')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(api.joinRoom).toHaveBeenCalledWith('ABC234', {
			name: null,
			password: 'nope',
			role: 'player',
		})
		expect(wrapper.text()).toContain('Mot de passe incorrect.')
	})

	it('emits the membership once joined', async () => {
		const membership = {
			roomCode: 'ABC234',
			participantId: 'p1',
			name: 'Bob',
			role: 'spectator' as const,
			token: 't',
		}
		vi.spyOn(api, 'joinRoom').mockResolvedValue(membership)
		const wrapper = mount(JoinForm, {
			props: { preview: { ...preview, hasPassword: false, players: 50 } },
		})
		// Room full of players: spectator is preselected.
		expect((wrapper.find('input[value="spectator"]').element as HTMLInputElement).checked).toBe(
			true,
		)
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(wrapper.emitted('joined')).toEqual([[membership]])
	})
})
