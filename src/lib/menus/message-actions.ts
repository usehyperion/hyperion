import type { Component } from "svelte";

import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

import { IconBan, IconCopy, IconDelete, IconPin, IconReply, IconTimeout } from "#lib/icons.js";
import { log } from "#lib/log.js";
import { timeoutDuration, timeoutLabel } from "#lib/moderation.js";

export interface MessageAction {
	label: () => string;
	icon: Component;

	/**
	 * Whether the action affects other users.
	 */
	moderation: boolean;
	enabled: (message: UserMessage) => boolean;
	run: (message: UserMessage) => unknown;
}

export const messageActions = {
	copy: {
		label: () => "Copy",
		icon: IconCopy,
		moderation: false,
		enabled: () => true,
		run: (message) => navigator.clipboard.writeText(message.text),
	},
	reply: {
		label: () => "Reply",
		icon: IconReply,
		moderation: false,
		enabled: (message) => !message.deleted,
		run(message) {
			message.channel.chat.replyTarget = message;
			message.channel.chat.input?.focus();
		},
	},
	pin: {
		label: () => "Pin",
		icon: IconPin,
		moderation: true,
		enabled: (message) => !message.deleted && message.actionable && !message.pinned,
		run: (message) => message.channel.chat.pin(message.id),
	},
	delete: {
		label: () => "Delete",
		icon: IconDelete,
		moderation: true,
		enabled: (message) => !message.deleted && message.actionable,
		run: (message) => message.delete(),
	},
	timeout: {
		label: () => `Timeout (${timeoutLabel()})`,
		icon: IconTimeout,
		moderation: true,
		enabled: (message) => message.actionable,
		run: (message) => message.viewer.timeout({ duration: timeoutDuration() }),
	},
	ban: {
		label: () => "Ban",
		icon: IconBan,
		moderation: true,
		enabled: (message) => message.actionable,
		run: (message) => message.viewer.ban(),
	},
} satisfies Record<string, MessageAction>;

export async function runAction(message: UserMessage, action: MessageAction) {
	try {
		await action.run(message);
	} catch (error) {
		log.error(`Failed to ${action.label().toLowerCase()} message`, error);
		message.channel.chat.notice(`Could not ${action.label().toLowerCase()} the message.`);
	}
}
