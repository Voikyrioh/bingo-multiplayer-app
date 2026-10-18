import type {
	ApiError,
	CreateDictionaryRequest,
	CreateRoomRequest,
	DictionarySummary,
	DictionaryView,
	JoinRoomRequest,
	Membership,
	RoomPreview,
	RoomSummary,
} from '@bingo/shared'

export class ApiRequestError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message)
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	let response: Response
	try {
		response = await fetch(`/api${path}`, {
			...init,
			headers: { accept: 'application/json', 'content-type': 'application/json', ...init?.headers },
		})
	} catch {
		throw new ApiRequestError(0, 'network', 'Connexion impossible. Vérifiez votre réseau.')
	}
	const body = (await response.json().catch(() => null)) as T | ApiError | null
	if (!response.ok) {
		const error = body as ApiError | null
		throw new ApiRequestError(
			response.status,
			error?.code ?? 'internal',
			error?.message ?? 'Oups, une erreur inattendue.',
		)
	}
	return body as T
}

const post = <T>(path: string, body: unknown) =>
	request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
	listDictionaries: () => request<DictionarySummary[]>('/dictionaries'),
	getDictionary: (code: string) =>
		request<DictionaryView>(`/dictionaries/${encodeURIComponent(code)}`),
	createDictionary: (body: CreateDictionaryRequest) => post<DictionaryView>('/dictionaries', body),
	listRooms: () => request<RoomSummary[]>('/rooms'),
	previewRoom: (code: string) => request<RoomPreview>(`/rooms/${encodeURIComponent(code)}`),
	createRoom: (body: CreateRoomRequest) => post<Membership>('/rooms', body),
	joinRoom: (code: string, body: JoinRoomRequest) =>
		post<Membership>(`/rooms/${encodeURIComponent(code)}/join`, body),
	/** Funny name, themed by the room's dictionary or by a dictionary code when given. */
	randomName: (context: { room?: string; dictionary?: string } = {}) => {
		const query = new URLSearchParams()
		if (context.room) query.set('room', context.room)
		if (context.dictionary) query.set('dictionary', context.dictionary)
		const search = query.toString()
		return request<{ name: string }>(`/names/random${search ? `?${search}` : ''}`)
	},
}
