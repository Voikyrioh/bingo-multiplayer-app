import type { Random } from './random'

// No 0/O, 1/I/L: codes are read aloud and typed by hand.
const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const DICTIONARY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export const ROOM_CODE_LENGTH = 6
export const DICTIONARY_CODE_LENGTH = 8

function randomCode(alphabet: string, length: number, random: Random): string {
	let code = ''
	for (let i = 0; i < length; i++) code += alphabet[random.int(alphabet.length)]
	return code
}

export const roomCode = (random: Random) => randomCode(ROOM_ALPHABET, ROOM_CODE_LENGTH, random)
export const dictionaryCode = (random: Random) =>
	randomCode(DICTIONARY_ALPHABET, DICTIONARY_CODE_LENGTH, random)

export const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_ALPHABET}]{${ROOM_CODE_LENGTH}}$`)
export const DICTIONARY_CODE_PATTERN = /^[a-z0-9-]{3,40}$/

export function normalizeRoomCode(raw: string): string {
	return raw.trim().toUpperCase()
}
