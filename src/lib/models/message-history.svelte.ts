import type { ResultOf } from "gql.tada";

import type { NonNullableDeep } from "#lib/graphql/index.js";

import { modLogMessagesQuery, toMessageFragments } from "#lib/graphql/twitch.js";
import { Pager, prependUnique, toPage, type Page } from "#lib/pager.svelte.js";

import type { Viewer } from "./viewer.svelte";

import { UserMessage } from "./message/user-message.svelte";

type ModLogsResult = NonNullableDeep<
	ResultOf<typeof modLogMessagesQuery>,
	"viewerCardModLogs.messages"
>;

type ModLogMessage = NonNullable<
	Extract<
		ModLogsResult,
		{ __typename: "ViewerCardModLogsMessagesConnection" }
	>["edges"][number]["node"]
>;

/**
 * The messages a viewer has sent in a channel.
 */
export class MessageHistory {
	readonly #pager = new Pager<UserMessage>((after) => this.#fetchPage(after));

	#history: Promise<void> | null = null;

	// Messages loaded from the mod logs, oldest first.
	#logged = $state.raw<UserMessage[]>([]);

	/**
	 * The messages sent by the viewer, oldest first. Only includes messages
	 * received in chat until {@linkcode load} is called.
	 */
	public readonly messages = $derived.by(() => {
		const received = this.viewer.channel.chat.messages.filter(
			(m): m is UserMessage => m.isUser() && m.author.id === this.viewer.id,
		);

		if (!this.#logged.length) return received;

		// Prefer messages received in chat since they're kept up to date.
		const ids = new Set(received.map((message) => message.id));

		return merge(
			this.#logged.filter((message) => !ids.has(message.id)),
			received,
		);
	});

	public constructor(public readonly viewer: Viewer) {}

	/**
	 * Whether there are older messages that can be loaded with
	 * {@linkcode loadOlder}.
	 */
	public get hasOlder() {
		return this.#pager.hasOlder;
	}

	/**
	 * Loads the most recent page of messages from the mod logs if the current
	 * user is a moderator in the channel.
	 */
	public load() {
		if (!this.viewer.channel.isMod) {
			return Promise.resolve();
		}

		return (this.#history ??= this.#loadHistory());
	}

	/**
	 * Loads the page of messages before the oldest loaded message.
	 */
	public async loadOlder() {
		const older = await this.#pager.older();

		this.#logged = prependUnique(this.#logged, older);
	}

	async #loadHistory() {
		try {
			this.#logged = await this.#pager.first();
		} catch (error) {
			this.#history = null;

			throw error;
		}
	}

	async #fetchPage(after: string | null): Promise<Page<UserMessage>> {
		const { channel } = this.viewer;

		const { viewerCardModLogs } = await channel.client.gql(modLogMessagesQuery, {
			channel: channel.id,
			target: this.viewer.id,
			after,
		});

		const result = viewerCardModLogs?.messages;

		if (result?.__typename === "ViewerCardModLogsMessagesError") {
			throw new Error(`viewerCardModLogs failed: ${result.code}`);
		}

		return toPage(result, (message) => this.#transform(message));
	}

	#transform(data: ModLogMessage) {
		if (data.__typename !== "ViewerCardModLogsChatMessage") return null;

		const message = UserMessage.from(this.viewer.channel, {
			id: data.id,
			text: data.content.text,
			fragments: toMessageFragments(data.content),
			sender: data.sender ?? {
				id: this.viewer.id,
				login: this.viewer.username,
				name: this.viewer.displayName,
			},
			color: data.sender?.chatColor ?? "",
			badges: data.senderBadges ?? [],
			timestamp: new Date(data.sentAt).getTime(),
		});

		message.deleted = data.isDeleted;

		return message;
	}
}

function merge(a: UserMessage[], b: UserMessage[]) {
	const merged: UserMessage[] = [];

	let i = 0;
	let j = 0;

	while (i < a.length && j < b.length) {
		if (a[i].timestamp <= b[j].timestamp) {
			merged.push(a[i++]);
		} else {
			merged.push(b[j++]);
		}
	}

	return merged.concat(a.slice(i), b.slice(j));
}
