import type { Channel } from "../channel.svelte";

import { Message } from "./message";

export interface TextualMessageInit {
	timestamp: number;
	deleted: boolean;
	recent: boolean;
}

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
		init: TextualMessageInit,
	) {
		super();

		this.timestamp = new Date(init.timestamp);
		this.deleted = init.deleted;
		this.recent = init.recent;
	}
}
