<script setup lang="ts">
import { LIMITS, type MessageView } from '@bingo/shared'
import { computed, nextTick, ref, watch } from 'vue'
import { feedText } from '../i18n/feed'
import { useI18n } from '../i18n/useI18n'
import { formatTime } from '../lib/format'
import AppIcon from './ui/AppIcon.vue'

const props = defineProps<{ messages: MessageView[]; me: string | null; canWrite: boolean }>()
const emit = defineEmits<{ send: [text: string] }>()

const { t, tc, locale } = useI18n()
const draft = ref('')
const feed = ref<HTMLElement | null>(null)
const stickToBottom = ref(true)
const remaining = computed(() => LIMITS.chatMessageMax - draft.value.length)

function onScroll() {
	const el = feed.value
	if (!el) return
	stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 60
}

watch(
	() => props.messages.length,
	async () => {
		if (!stickToBottom.value) return
		await nextTick()
		feed.value?.scrollTo({ top: feed.value.scrollHeight })
	},
	{ immediate: true, flush: 'post' },
)

function submit() {
	const text = draft.value.trim()
	if (!text) return
	emit('send', text)
	draft.value = ''
	stickToBottom.value = true
}
</script>

<template>
	<section class="chat" aria-labelledby="chat-title">
		<h2 id="chat-title" class="chat__title"><AppIcon name="chat" /> {{ t('chat.title') }}</h2>
		<ol ref="feed" class="chat__feed" role="log" aria-live="polite" aria-relevant="additions" @scroll.passive="onScroll">
			<li
				v-for="message in messages"
				:key="message.id"
				class="msg"
				:class="[`msg--${message.kind}`, { 'msg--mine': message.authorId === me && message.kind === 'chat', [`msg--${message.announcement}`]: message.announcement }]"
			>
				<template v-if="message.kind === 'chat'">
					<span class="msg__meta">
						<strong>{{ message.authorName }}</strong>
						<time :datetime="message.createdAt">{{ formatTime(message.createdAt, locale) }}</time>
					</span>
					<p class="msg__text">{{ message.text }}</p>
				</template>
				<p v-else class="msg__text">{{ feedText(message, t, tc) }}</p>
			</li>
			<li v-if="messages.length === 0" class="chat__empty">{{ t('chat.empty') }}</li>
		</ol>
		<form v-if="canWrite" class="chat__form" @submit.prevent="submit">
			<label for="chat-input" class="visually-hidden">{{ t('chat.label') }}</label>
			<input
				id="chat-input"
				v-model="draft"
				class="chat__input"
				:maxlength="LIMITS.chatMessageMax"
				:placeholder="t('chat.placeholder')"
				autocomplete="off"
				enterkeyhint="send"
			/>
			<span v-if="remaining < 40" class="chat__count" aria-live="polite" :title="tc('chat.remaining', remaining)">
				<span aria-hidden="true">{{ remaining }}</span>
				<span class="visually-hidden">{{ tc('chat.remaining', remaining) }}</span>
			</span>
			<button type="submit" class="chat__send" :disabled="!draft.trim()">
				<AppIcon name="send" :label="t('chat.send')" />
			</button>
		</form>
	</section>
</template>

<style scoped>
.chat {
	display: flex;
	flex-direction: column;
	min-height: 0;
	height: 100%;
	border: var(--border);
	border-radius: var(--radius-l);
	background: var(--surface);
	box-shadow: var(--shadow-m);
	overflow: hidden;
}
.chat__title {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 14px 16px;
	border-bottom: var(--border);
	background: var(--sun-soft);
	font-size: 1.1rem;
}
.chat__feed {
	flex: 1;
	min-height: 200px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
	overscroll-behavior: contain;
}
.chat__empty {
	margin: auto;
	color: var(--ink-3);
	text-align: center;
	font-size: 0.95rem;
}
.msg {
	max-width: 92%;
	padding: 8px 12px;
	border: 2px solid var(--line);
	border-radius: 14px 14px 14px 4px;
	background: var(--surface-2);
	animation: in 0.25s var(--ease-bounce);
	overflow-wrap: anywhere;
}
.msg--mine {
	align-self: flex-end;
	border-radius: 14px 14px 4px 14px;
	background: var(--primary-soft);
}
.msg--system {
	align-self: center;
	max-width: 100%;
	padding: 4px 10px;
	border: 0;
	background: none;
	color: var(--ink-3);
	font-size: 0.85rem;
	text-align: center;
}
.msg--announce {
	align-self: stretch;
	max-width: 100%;
	border-radius: 14px;
	background: var(--mint-soft);
	font-family: var(--font-display);
	font-weight: 600;
	text-align: center;
}
.msg--full {
	background: var(--sun);
	color: #1f1b2e;
	box-shadow: var(--shadow-s);
}
.msg__meta {
	display: flex;
	gap: 8px;
	align-items: baseline;
	font-size: 0.8rem;
	color: var(--ink-3);
}
.msg__meta strong {
	color: var(--primary);
	font-family: var(--font-display);
	font-size: 0.9rem;
}
.chat__form {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px;
	border-top: var(--border);
	background: var(--surface-2);
}
.chat__input {
	flex: 1;
	min-width: 0;
	min-height: 44px;
	padding: 0 14px;
	border: var(--border);
	border-radius: 999px;
	background: var(--surface);
}
.chat__count {
	font-size: 0.8rem;
	color: var(--ink-3);
}
.chat__send {
	display: grid;
	place-items: center;
	flex: none;
	width: 44px;
	height: 44px;
	border: var(--border);
	border-radius: 50%;
	background: var(--primary);
	color: var(--primary-ink);
	cursor: pointer;
	box-shadow: var(--shadow-s);
}
.chat__send:disabled {
	opacity: 0.5;
	cursor: default;
}
@keyframes in {
	from {
		transform: translateY(8px) scale(0.96);
		opacity: 0;
	}
}
</style>
