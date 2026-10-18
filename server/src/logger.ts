/**
 * JSON lines on stdout, collected by Fluent Bit (infra). Never log a client
 * address, a token or a password.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

let threshold: Level = 'info'

export function setLogLevel(level: Level): void {
	threshold = level
}

function write(level: Level, msg: string, fields?: Record<string, unknown>): void {
	if (ORDER[level] < ORDER[threshold]) return
	const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...fields })
	if (ORDER[level] >= ORDER.warn) process.stderr.write(`${line}\n`)
	else process.stdout.write(`${line}\n`)
}

export const logger = {
	debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
	info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
	warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
	error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
}
