import type { Component, ComponentProps } from "svelte";
import { Message } from "./message";

export class ComponentMessage<C extends Component<any>> extends Message {
	public override readonly [Symbol.toStringTag] = "ComponentMessage";

	public override readonly id = crypto.randomUUID();
	public override readonly timestamp = new Date();

	public constructor(
		/**
		 * The component that renders the message.
		 */
		public readonly component: C,

		/**
		 * The props passed to the component.
		 */
		public readonly props: ComponentProps<C>,
	) {
		super();
	}
}
