import type { Channel } from "../channel.svelte";
import type { EventMessage } from "./event-message";
import type { UserMessage } from "./user-message.svelte";

export interface MessageInit {
	timestamp: number;
	deleted: boolean;
	recent: boolean;
}

export abstract class Message {
	public abstract readonly [Symbol.toStringTag]: string;

	/**
	 * The id of the message; Twitch's for user messages, generated otherwise.
	 */
	public abstract readonly id: string;

	public abstract readonly text: string;

	public readonly timestamp: Date;

	public deleted = $state(false);

	/**
	 * Whether the message was retrieved by the `recent-messages` API.
	 */
	public readonly recent: boolean;

	public constructor(
		public readonly channel: Channel,
		init: MessageInit,
	) {
		this.timestamp = new Date(init.timestamp);
		this.deleted = init.deleted;
		this.recent = init.recent;
	}

	// Tag checks rather than `instanceof` so this file doesn't import its
	// subclasses.
	public isEvent(): this is EventMessage {
		return this[Symbol.toStringTag] === "EventMessage";
	}

	public isUser(): this is UserMessage {
		return this[Symbol.toStringTag] === "UserMessage";
	}
}
