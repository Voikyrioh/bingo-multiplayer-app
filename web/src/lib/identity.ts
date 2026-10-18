import type { Membership } from '@bingo/shared'
import { readJson, writeJson } from './storage'

/**
 * Memberships are kept per room code so that a reload, or reopening the
 * link, puts the player back in their seat with the same grid.
 */
const MEMBERSHIPS = 'bingo:memberships'
const LAST_NAME = 'bingo:last-name'

type Store = Record<string, Membership>

export function membershipFor(code: string): Membership | null {
	return readJson<Store>(MEMBERSHIPS, {})[code.toUpperCase()] ?? null
}

export function saveMembership(membership: Membership): void {
	const store = readJson<Store>(MEMBERSHIPS, {})
	store[membership.roomCode] = membership
	// Only the 30 most recent rooms are remembered.
	const kept = Object.fromEntries(Object.entries(store).slice(-30))
	writeJson(MEMBERSHIPS, kept)
}

export function forgetMembership(code: string): void {
	const store = readJson<Store>(MEMBERSHIPS, {})
	delete store[code.toUpperCase()]
	writeJson(MEMBERSHIPS, store)
}

export function lastName(): string {
	return readJson<string>(LAST_NAME, '')
}

export function rememberName(name: string): void {
	writeJson(LAST_NAME, name)
}
