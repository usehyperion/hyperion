import type { BaseUserMessage } from "$lib/twitch/irc";
import type { Channel } from "../channel.svelte";
import type { EventMessageData } from "./event-message";
import { Message } from "./message";

export type MessageData = BaseUserMessage | EventMessageData;

export abstract class TextualMessage extends Message {
	public abstract readonly id: string;

	/**
	 * The text content of the message.
	 */
	public abstract text: string;

	public readonly timestamp: Date;

	/**
	 * Whether the message has been deleted.
	 */
	public deleted = $state(false);

	/**
	 * Whether the message was retreived by the `recent-messages` API.
	 */
	public recent: boolean;

	public constructor(
		/**
		 * The channel the message was sent in.
		 */
		public readonly channel: Channel,
		public readonly data: MessageData,
	) {
		super();

		this.timestamp = new Date(this.data.server_timestamp);
		this.deleted = data.deleted;
		this.recent = data.is_recent;
	}
}
