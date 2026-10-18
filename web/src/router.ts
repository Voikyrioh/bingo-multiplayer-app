import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', component: HomePage, meta: { title: 'Bingo Live' } },
		{
			path: '/salons',
			component: () => import('./pages/RoomsPage.vue'),
			meta: { title: 'Salons en cours' },
		},
		{
			path: '/creer',
			component: () => import('./pages/CreateRoomPage.vue'),
			props: { mode: 'multi' },
			meta: { title: 'Créer un salon' },
		},
		{
			path: '/solo',
			component: () => import('./pages/CreateRoomPage.vue'),
			props: { mode: 'solo' },
			meta: { title: 'Partie solo' },
		},
		{
			path: '/r/:code',
			component: () => import('./pages/RoomPage.vue'),
			props: (route) => ({ code: String(route.params.code).toUpperCase() }),
			meta: { title: 'Salon' },
		},
		{
			path: '/d/:code',
			component: () => import('./pages/DictionaryPage.vue'),
			props: true,
			meta: { title: 'Dictionnaire' },
		},
		{
			path: '/:pathMatch(.*)*',
			component: () => import('./pages/NotFoundPage.vue'),
			meta: { title: 'Page introuvable' },
		},
	],
	scrollBehavior: () => ({ top: 0 }),
})

// Title of the tab, and focus moved to the main content for screen readers.
router.afterEach((to, from) => {
	document.title =
		to.meta.title === 'Bingo Live' ? 'Bingo Live' : `${String(to.meta.title)} · Bingo Live`
	if (from.matched.length) requestAnimationFrame(() => document.getElementById('main')?.focus())
})
