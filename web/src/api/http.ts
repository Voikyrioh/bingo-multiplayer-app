import type {
	ApiError,
	CreateDictionaryRequest,
	CreateRoomRequest,
	DictionarySummary,
	DictionaryView,
	JoinRoomRequest,
	LanguageCode,
	Membership,
	RoomPreview,
	RoomSummary,
	TextParams,
} from '@bingo/shared'

/** `key` (+ `params`) is translated in the `error.` namespace (useI18n().errorText). */
export class ApiRequestError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		readonly key: string,
		readonly params: TextParams = {},
	) {
		super(key)
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
		throw new ApiRequestError(0, 'network', 'network')
	}
	const body = (await response.json().catch(() => null)) as T | ApiError | null
	if (!response.ok) {
		const error = body as ApiError | null
		throw new ApiRequestError(
			response.status,
			error?.code ?? 'internal',
			error?.key ?? 'internal',
			error?.params,
		)
	}
	return body as T
}

const post = <T>(path: string, body: unknown) =>
	request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
	/** Without language: every language. */
	listDictionaries: (language?: LanguageCode) =>
		request<DictionarySummary[]>(`/dictionaries${language ? `?language=${language}` : ''}`),
	getDictionary: (code: string) =>
		request<DictionaryView>(`/dictionaries/${encodeURIComponent(code)}`),
	createDictionary: (body: CreateDictionaryRequest) => post<DictionaryView>('/dictionaries', body),
	listRooms: (language?: LanguageCode) =>
		request<RoomSummary[]>(`/rooms${language ? `?language=${language}` : ''}`),
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
