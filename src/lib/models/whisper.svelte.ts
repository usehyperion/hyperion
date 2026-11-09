import type {
	WhisperMessage as ApiWhisperMessage,
	WhisperThread as ApiWhisperThread,
} from "#lib/graphql/twitch.js";
import type { TwitchClient } from "#lib/twitch/client.js";

import { app } from "#lib/app.svelte.js";
import {
	markWhisperReadMutation,
	sendWhisperMutation,
	whisperMessagesQuery,
} from "#lib/graphql/twitch.js";
import { Pager, toPage, type Page } from "#lib/pager.svelte.js";

import type { Badge } from "./badge";
import type { User } from "./user.svelte";

export interface WhisperMessage {
	id: string;
	createdAt: Date;
	badges: Badge[];
	user: User;
	text: string;
}

/**
 * Where a whisper is in loading its message history.
 *
 * - `unloaded`: only the preview is known; live messages update the preview.
 * - `loading`: the history request is in flight; live messages are buffered so
 *   they can be merged in once it resolves.
 * - `loaded`: live messages are appended to the loaded messages.
 */
type HistoryState =
	| { status: "unloaded" }
	| { status: "loading"; request: Promise<void>; buffered: WhisperMessage[] }
	| { status: "loaded" };

export class Whisper {
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

	readonly #pager = new Pager<WhisperMessage>((after) => this.#fetchPage(after));

	#history: HistoryState = { status: "unloaded" };

	// The per-thread sequence number of the newest live message.
	#sequence = 0;

	// The newest message id known to exist on Twitch.
	#lastReadableId: string | null = null;

	public constructor(
		public readonly client: TwitchClient,

		/**
		 * The id of the whisper thread.
		 */
		public readonly id: string,
		public readonly sender: User,
	) {}

	/**
	 * The loaded messages in the whisper, oldest first. Empty until
	 * {@linkcode load} is called.
	 */
	public get messages() {
		return this.#pager.items;
	}

	/**
	 * Whether there are older messages that can be loaded with
	 * {@linkcode loadOlder}.
	 */
	public get hasOlder() {
		return this.#pager.hasOlder;
	}

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

		if (this.#history.status === "loaded") {
			this.#pager.items = [...this.#pager.items, message];
			return;
		}

		// Only buffer while history is in flight; anything earlier is already
		// part of the returned history.
		if (this.#history.status === "loading") {
			this.#history.buffered.push(message);
		}

		this.preview = message;
	}

	/**
	 * Loads the most recent page of messages.
	 */
	public load() {
		if (this.#history.status === "loaded") return Promise.resolve();
		if (this.#history.status === "loading") return this.#history.request;

		// Anything received before the request is sent is already part of the
		// returned history, so only messages that arrive while it's in flight
		// need to be carried over.
		const buffered: WhisperMessage[] = [];
		const request = this.#loadHistory(buffered);

		this.#history = { status: "loading", request, buffered };

		return request;
	}

	/**
	 * Loads the page of messages before the oldest loaded message.
	 */
	public async loadOlder() {
		await this.#pager.older();
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

	async #loadHistory(buffered: WhisperMessage[]) {
		let history: WhisperMessage[];

		try {
			history = await this.#pager.first();
		} catch (error) {
			this.#history = { status: "unloaded" };
			throw error;
		}

		const last = history.at(-1);

		if (last && !buffered.length) {
			this.#lastReadableId = last.id;
		}

		const inFlight = buffered.filter(
			(message) => !history.some((existing) => isSameMessage(existing, message)),
		);

		this.#pager.items = [...history, ...inFlight];
		this.#history = { status: "loaded" };
	}

	async #fetchPage(after: string | null): Promise<Page<WhisperMessage>> {
		const { whisperThread } = await this.client.gql(whisperMessagesQuery, {
			id: this.id,
			after,
		});

		return toPage(whisperThread?.messages, (message) => this.#transform(message));
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
