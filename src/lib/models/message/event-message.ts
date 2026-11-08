import type { Component, ComponentProps } from "svelte";

import type { Channel } from "../channel.svelte";

import { Message } from "./message.svelte";

export interface EventMeta {
	deleted: boolean;
	recent: boolean;
	timestamp: number;
}

/**
 * A channel event, rendered by the component that represents its kind.
 */
export class EventMessage<C extends Component<any> = Component<any>> extends Message {
	public override readonly [Symbol.toStringTag] = "EventMessage";

	public override readonly id = crypto.randomUUID();
	public override readonly text = "";

	public constructor(
		channel: Channel,
		public readonly component: C,
		public readonly props: ComponentProps<C>,
		meta?: Partial<EventMeta>,
	) {
		super(channel, {
			timestamp: meta?.timestamp ?? Date.now(),
			deleted: meta?.deleted ?? false,
			recent: meta?.recent ?? false,
		});
	}
}
