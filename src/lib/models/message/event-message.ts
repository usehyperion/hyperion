import type { Component, ComponentProps } from "svelte";
import type { Channel } from "../channel.svelte";
import { TextualMessage } from "./textual-message.svelte";

export interface EventMessageData {
	deleted: boolean;
	is_recent: boolean;
	server_timestamp: number;
}

/**
 * Event messages are constructed internally to relay channel events.
 */
export class EventMessage<C extends Component = Component> extends TextualMessage {
	public override readonly [Symbol.toStringTag] = "EventMessage";

	public override readonly id = crypto.randomUUID();
	public override text = "";

	public constructor(
		channel: Channel,

		/**
		 * The component that renders the event.
		 */
		public readonly component: C,

		/**
		 * The props passed to the component.
		 */
		public readonly props: ComponentProps<C>,
		data?: Partial<EventMessageData>,
	) {
		super(channel, {
			deleted: data?.deleted ?? false,
			is_recent: data?.is_recent ?? false,
			server_timestamp: data?.server_timestamp ?? Date.now(),
		});
	}
}
