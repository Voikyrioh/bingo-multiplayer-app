import { LIMITS } from '@bingo/shared'
import { z } from 'zod'

/**
 * Shape checks of everything that comes from a client. Business rules
 * (lengths after cleaning, capacity...) stay in the domain and use cases.
 */

const shortText = (max: number) => z.string().max(max * 2)

export const createDictionarySchema = z.object({
	title: shortText(LIMITS.dictionaryTitleMax),
	description: shortText(LIMITS.dictionaryDescriptionMax).optional(),
	entries: z.array(shortText(LIMITS.entryMax)).max(LIMITS.dictionaryEntriesMax * 2),
	freeSpace: shortText(LIMITS.freeSpaceMax).nullish(),
	isPublic: z.boolean(),
})

export const createRoomSchema = z.object({
	name: shortText(LIMITS.roomNameMax),
	mode: z.enum(['multi', 'solo']),
	visibility: z.enum(['public', 'unlisted']),
	password: z.string().max(LIMITS.passwordMax).nullish(),
	dictionaryCode: z.string().min(1).max(40),
	gridSize: z.number().int(),
	freeCenter: z.boolean(),
	ownerName: shortText(LIMITS.nameMax).nullish(),
})

export const joinRoomSchema = z.object({
	name: shortText(LIMITS.nameMax).nullish(),
	password: z.string().max(LIMITS.passwordMax).nullish(),
	role: z.enum(['player', 'spectator']),
})

export const clientMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('auth'), token: z.string().min(1).max(200) }),
	z.object({ type: z.literal('toggle'), cell: z.number().int().min(0).max(24) }),
	z.object({ type: z.literal('chat'), text: z.string().max(LIMITS.chatMessageMax * 2) }),
	z.object({ type: z.literal('kick'), participantId: z.uuid() }),
	z.object({ type: z.literal('leave') }),
	z.object({ type: z.literal('sync') }),
	z.object({ type: z.literal('ping') }),
])
