import { watchEffect } from 'vue'

const SITE = 'Bingo Live'

/** Tab title of a page, kept in sync with the language and the data it shows. */
export function usePageTitle(title: () => string | null | undefined): void {
	watchEffect(() => {
		const value = title()
		document.title = value && value !== SITE ? `${value} · ${SITE}` : SITE
	})
}
