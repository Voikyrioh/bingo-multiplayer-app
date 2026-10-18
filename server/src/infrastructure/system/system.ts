import { randomInt, randomUUID } from 'node:crypto'
import type { Clock, IdGenerator } from '../../application/ports'
import type { Random } from '../../domain/random'

export const systemClock: Clock = { now: () => new Date() }

/** Cryptographic randomness: room codes and grids must not be guessable. */
export const cryptoRandom: Random = { int: (maxExclusive) => randomInt(maxExclusive) }

export const cryptoIds: IdGenerator = { uuid: () => randomUUID() }
