import type { Channel } from "../channel.svelte";
import type { MessageContext } from "./context";
import { TextualMessage } from "./textual-message.svelte";

export interface SystemMessageData {
	deleted: boolean;
	is_recent: boolean;
	server_timestamp: number;
}

/**
 * System messages are messages constructed internally and sent to relay
 * information to the user.
 */
export class SystemMessage extends TextualMessage {
	public override readonly id = crypto.randomUUID();
	public override text = "";

	public readonly [Symbol.toStringTag] = "SystemMessage";

	/**
	 * The context associated with the message.
	 */
	public context: MessageContext | null = null;

	public constructor(channel: Channel, data?: string | Partial<SystemMessageData>) {
		const args = typeof data === "string" ? undefined : (data ?? {});

		super(channel, {
			deleted: args?.deleted ?? false,
			is_recent: args?.is_recent ?? false,
			server_timestamp: args?.server_timestamp ?? Date.now(),
		});

		if (typeof data === "string") {
			this.text = data;
		}
	}
}
