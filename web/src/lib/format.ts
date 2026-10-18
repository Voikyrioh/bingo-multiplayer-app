const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function formatTime(iso: string): string {
	return timeFormat.format(new Date(iso))
}

/** "il y a 3 min", "il y a 2 h"... */
export function timeAgo(iso: string, now = Date.now()): string {
	const minutes = Math.round((now - new Date(iso).getTime()) / 60_000)
	if (minutes < 1) return 'à l’instant'
	if (minutes < 60) return `il y a ${minutes} min`
	const hours = Math.round(minutes / 60)
	if (hours < 24) return `il y a ${hours} h`
	return `il y a ${Math.round(hours / 24)} j`
}

export function plural(count: number, one: string, many: string): string {
	return `${count} ${count > 1 ? many : one}`
}

export function roomLink(code: string): string {
	return `${location.origin}/r/${code}`
}

export function dictionaryLink(code: string): string {
	return `${location.origin}/d/${code}`
}
