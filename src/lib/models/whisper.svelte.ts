import { app } from "$lib/app.svelte";
import { nodes } from "$lib/graphql";
import type {
	WhisperMessage as ApiWhisperMessage,
	WhisperThread as ApiWhisperThread,
} from "$lib/graphql/twitch";
import {
	markWhisperReadMutation,
	sendWhisperMutation,
	whisperMessagesQuery,
} from "$lib/graphql/twitch";
import type { TwitchClient } from "$lib/twitch/client";

import type { Badge } from "./badge";
import type { User } from "./user.svelte";

export interface WhisperMessage {
	id: string;
	createdAt: Date;
	badges: Badge[];
	user: User;
	text: string;
}

interface MessagePage {
	messages: WhisperMessage[];
	cursor: string | null;
	hasNext: boolean;
}

export class Whisper {
	// Live messages received while the history request is in flight.
	#pending: WhisperMessage[] = [];

	// The per-thread sequence number of the newest live message.
	#sequence = 0;

	#loaded = false;
	#history: Promise<void> | null = null;
	#older: Promise<void> | null = null;
	#cursor: string | null = null;

	// The newest message id known to exist on Twitch.
	#lastReadableId: string | null = null;

	/**
	 * The loaded messages in the whisper, oldest first. Empty until
	 * {@linkcode load} is called.
	 */
	public messages = $state<WhisperMessage[]>([]);

	/**
	 * The most recent message reported by the thread list.
	 */
	public preview = $state<WhisperMessage | null>(null);

	/**
	 * The most recently sent message in the whisper.
	 */
	public readonly latest = $derived.by(() => {
		const last = this.messages.at(-1);

		if (!last || !this.preview) {
			return last ?? this.preview;
		}

		return last.createdAt >= this.preview.createdAt ? last : this.preview;
	});

	/**
	 * The number of unread messages in the whisper.
	 */
	public unread = $state(0);

	/**
	 * Whether there are older messages that can be loaded with
	 * {@linkcode loadOlder}.
	 */
	public hasOlder = $state(false);

	public constructor(
		public readonly client: TwitchClient,

		/**
		 * The id of the whisper thread.
		 */
		public readonly id: string,
		public readonly sender: User,
	) {}

	/**
	 * Updates the whisper with the latest state from the thread list.
	 */
	public sync(thread: ApiWhisperThread) {
		this.unread = thread.unreadMessagesCount;
		this.preview = thread.lastMessage && this.#transform(thread.lastMessage);
		this.#lastReadableId = thread.lastMessage?.id ?? null;
	}

	/**
	 * Adds a live message to the whisper.
	 */
	public add(message: WhisperMessage, sequence: number) {
		this.#sequence = Math.max(this.#sequence, sequence);
		this.#lastReadableId = message.id;

		if (this.#loaded) {
			this.messages.push(message);
		} else {
			// Only buffer while history is in flight; anything earlier is
			// already part of the returned history.
			if (this.#history) {
				this.#pending.push(message);
			}

			this.preview = message;
		}
	}

	/**
	 * Loads the most recent page of messages.
	 */
	public load() {
		return (this.#history ??= this.#loadHistory());
	}

	/**
	 * Loads the page of messages before the oldest loaded message.
	 */
	public loadOlder() {
		if (!this.hasOlder) return Promise.resolve();

		this.#older ??= this.#fetchPage(this.#cursor)
			.then((page) => {
				this.#paginate(page);

				// Pages can overlap if messages arrive between requests.
				const known = new Set(this.messages.map((message) => message.id));

				this.messages.unshift(...page.messages.filter((message) => !known.has(message.id)));
			})
			.finally(() => {
				this.#older = null;
			});

		return this.#older;
	}

	/**
	 * Clears the unread count if the thread was read up to its newest message,
	 * such as from another client.
	 */
	public read(sequence: number) {
		if (sequence >= this.#sequence) this.unread = 0;
	}

	public async markRead() {
		if (!this.unread) return;
		this.unread = 0;

		if (!this.#lastReadableId) return;

		await this.client.gql(markWhisperReadMutation, {
			thread: this.id,
			message: this.#lastReadableId,
		});
	}

	/**
	 * Sends a message in the whisper thread.
	 */
	public async send(message: string) {
		if (!message) return;

		await this.client.gql(sendWhisperMutation, {
			input: {
				message,
				recipientUserID: this.sender.id,
				nonce: crypto.randomUUID(),
			},
		});
	}

	async #loadHistory() {
		// Anything received before the request is sent is already part of the
		// returned history, so only messages that arrive while it's in flight
		// need to be carried over.
		this.#pending = [];

		try {
			const page = await this.#fetchPage(null);

			this.#paginate(page);

			const history = page.messages;
			const last = history.at(-1);

			if (last && !this.#pending.length) {
				this.#lastReadableId = last.id;
			}

			const inFlight = this.#pending.filter(
				(message) => !history.some((existing) => isSameMessage(existing, message)),
			);

			this.messages = [...history, ...inFlight];
			this.#pending = [];
			this.#loaded = true;
		} catch (error) {
			this.#pending = [];
			this.#history = null;

			throw error;
		}
	}

	#paginate(page: MessagePage) {
		this.#cursor = page.cursor;
		this.hasOlder = page.hasNext && !!page.cursor;
	}

	async #fetchPage(after: string | null): Promise<MessagePage> {
		const { whisperThread } = await this.client.gql(whisperMessagesQuery, {
			id: this.id,
			after,
		});

		const connection = whisperThread?.messages;

		return {
			// Pages are returned newest first
			messages: nodes(connection)
				.toReversed()
				.map((message) => this.#transform(message)),
			cursor: connection?.edges.at(-1)?.cursor ?? null,
			hasNext: connection?.pageInfo.hasNextPage ?? false,
		};
	}

	#transform(message: ApiWhisperMessage): WhisperMessage {
		return {
			id: message.id,
			createdAt: new Date(message.sentAt),
			badges: [],
			user: message.from.id === this.sender.id ? this.sender : (app.user ?? this.sender),
			text: message.content.content ?? "",
		};
	}
}

function isSameMessage(a: WhisperMessage, b: WhisperMessage) {
	if (a.id === b.id) return true;

	// Live timestamps only have second precision, so allow a small window
	// rather than treating every repeated message as a duplicate.
	return (
		a.user.id === b.user.id &&
		a.text === b.text &&
		Math.abs(a.createdAt.getTime() - b.createdAt.getTime()) < 2000
	);
}
