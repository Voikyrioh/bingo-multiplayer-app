const timeFormats = new Map<string, Intl.DateTimeFormat>()
const relativeFormats = new Map<string, Intl.RelativeTimeFormat>()

/** "20:31" in the conventions of the locale. */
export function formatTime(iso: string, locale: string): string {
	let format = timeFormats.get(locale)
	if (!format) {
		format = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
		timeFormats.set(locale, format)
	}
	return format.format(new Date(iso))
}

/** "il y a 3 minutes", "3 minutes ago", "vor 3 Minuten"... (Intl, no translation file). */
export function timeAgo(iso: string, locale: string, now = Date.now()): string {
	let format = relativeFormats.get(locale)
	if (!format) {
		format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
		relativeFormats.set(locale, format)
	}
	const minutes = Math.round((now - new Date(iso).getTime()) / 60_000)
	if (minutes < 60) return format.format(-Math.max(0, minutes), 'minute')
	const hours = Math.round(minutes / 60)
	if (hours < 24) return format.format(-hours, 'hour')
	return format.format(-Math.round(hours / 24), 'day')
}

export function roomLink(code: string): string {
	return `${location.origin}/r/${code}`
}

export function dictionaryLink(code: string): string {
	return `${location.origin}/d/${code}`
}
