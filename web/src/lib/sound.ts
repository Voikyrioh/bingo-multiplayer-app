import { readJson, writeJson } from './storage'

/**
 * Tiny synthesizer on the Web Audio API: no audio file to download. The
 * context is created on the first sound, which always follows a user gesture
 * (browsers refuse to start audio before one).
 */
const KEY = 'bingo:sound'
let context: AudioContext | null = null
let enabled = readJson<boolean>(KEY, true)

export function isSoundEnabled(): boolean {
	return enabled
}

export function setSoundEnabled(value: boolean): void {
	enabled = value
	writeJson(KEY, value)
}

function audio(): AudioContext | null {
	if (!enabled) return null
	try {
		context ??= new AudioContext()
		if (context.state === 'suspended') void context.resume()
		return context
	} catch {
		return null
	}
}

function note(
	ctx: AudioContext,
	frequency: number,
	start: number,
	duration: number,
	options: { type?: OscillatorType; volume?: number } = {},
): void {
	const osc = ctx.createOscillator()
	const gain = ctx.createGain()
	osc.type = options.type ?? 'triangle'
	osc.frequency.value = frequency
	const t = ctx.currentTime + start
	gain.gain.setValueAtTime(0.0001, t)
	gain.gain.exponentialRampToValueAtTime(options.volume ?? 0.12, t + 0.015)
	gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
	osc.connect(gain).connect(ctx.destination)
	osc.start(t)
	osc.stop(t + duration + 0.05)
}

export const sounds = {
	check() {
		const ctx = audio()
		if (ctx) note(ctx, 660, 0, 0.12, { type: 'sine', volume: 0.08 })
	},
	uncheck() {
		const ctx = audio()
		if (ctx) note(ctx, 330, 0, 0.1, { type: 'sine', volume: 0.06 })
	},
	line() {
		const ctx = audio()
		if (!ctx) return
		;[523.25, 659.25, 783.99].forEach((f, i) => {
			note(ctx, f, i * 0.09, 0.22)
		})
	},
	fanfare() {
		const ctx = audio()
		if (!ctx) return
		const melody: [number, number, number][] = [
			[523.25, 0, 0.16],
			[523.25, 0.17, 0.16],
			[523.25, 0.34, 0.16],
			[659.25, 0.51, 0.45],
			[587.33, 0.98, 0.16],
			[659.25, 1.15, 0.16],
			[783.99, 1.32, 0.8],
		]
		for (const [f, start, duration] of melody) {
			note(ctx, f, start, duration, { type: 'square', volume: 0.07 })
			note(ctx, f / 2, start, duration, { type: 'triangle', volume: 0.08 })
		}
	},
	otherLine() {
		const ctx = audio()
		if (!ctx) return
		note(ctx, 880, 0, 0.15, { type: 'sine', volume: 0.06 })
		note(ctx, 1174.66, 0.1, 0.2, { type: 'sine', volume: 0.06 })
	},
	message() {
		const ctx = audio()
		if (ctx) note(ctx, 987.77, 0, 0.08, { type: 'sine', volume: 0.04 })
	},
}
