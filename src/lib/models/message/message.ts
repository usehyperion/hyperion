import type { ComponentMessage } from "./component-message";
import type { EventMessage } from "./event-message";
import type { UserMessage } from "./user-message";

export abstract class Message {
	public abstract readonly [Symbol.toStringTag]: string;

	/**
	 * The id (stored as a UUID) of the message.
	 */
	public abstract readonly id: string;

	/**
	 * The timestamp at which the message was sent at.
	 */
	public abstract readonly timestamp: Date;

	public isComponent(): this is ComponentMessage<any> {
		return this[Symbol.toStringTag] === "ComponentMessage";
	}

	public isEvent(): this is EventMessage {
		return this[Symbol.toStringTag] === "EventMessage";
	}

	public isUser(): this is UserMessage {
		return this[Symbol.toStringTag] === "UserMessage";
	}
}
