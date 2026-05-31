import type { Component, ComponentProps } from "svelte";
import type { Channel } from "../channel.svelte";
import { TextualMessage } from "./textual-message.svelte";

export interface EventMessageData {
	deleted: boolean;
	is_recent: boolean;
	server_timestamp: number;
}

/**
 * Event messages are constructed internally to relay channel events (mod
 * actions, stream status, emote changes, notices, etc.) to the user. Each
 * event is rendered by its own component with strongly-typed props.
 */
export class EventMessage<C extends Component<any> = Component<any>> extends TextualMessage {
	public override readonly id = crypto.randomUUID();
	public override text = "";

	public readonly [Symbol.toStringTag] = "EventMessage";

	public constructor(
		channel: Channel,
		/**
		 * The component that renders the event.
		 */
		public readonly component: C,
		/**
		 * The props passed to the rendering component.
		 */
		public readonly props: ComponentProps<C> = {} as never,
		data?: Partial<EventMessageData>,
	) {
		super(channel, {
			deleted: data?.deleted ?? false,
			is_recent: data?.is_recent ?? false,
			server_timestamp: data?.server_timestamp ?? Date.now(),
		});
	}
}
