import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'

// Tab titles are set by each page (usePageTitle), in the active language.
export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', component: HomePage },
		{ path: '/salons', component: () => import('./pages/RoomsPage.vue') },
		{
			path: '/creer',
			component: () => import('./pages/CreateRoomPage.vue'),
			props: { mode: 'multi' },
		},
		{
			path: '/solo',
			component: () => import('./pages/CreateRoomPage.vue'),
			props: { mode: 'solo' },
		},
		{
			path: '/r/:code',
			component: () => import('./pages/RoomPage.vue'),
			props: (route) => ({ code: String(route.params.code).toUpperCase() }),
		},
		{ path: '/d/:code', component: () => import('./pages/DictionaryPage.vue'), props: true },
		{ path: '/:pathMatch(.*)*', component: () => import('./pages/NotFoundPage.vue') },
	],
	scrollBehavior: () => ({ top: 0 }),
})

// Focus moved to the main content after a navigation, for screen readers.
router.afterEach((_to, from) => {
	if (from.matched.length) requestAnimationFrame(() => document.getElementById('main')?.focus())
})
