import type { Component } from "svelte";

import ArrowBendUpLeft from "~icons/ph/arrow-bend-up-left";
import Clipboard from "~icons/ph/clipboard";
import Clock from "~icons/ph/clock";
import Gavel from "~icons/ph/gavel";
import PushPin from "~icons/ph/push-pin";
import Trash from "~icons/ph/trash";

import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

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
		icon: Clipboard,
		moderation: false,
		enabled: () => true,
		run: (message) => navigator.clipboard.writeText(message.text),
	},
	reply: {
		label: () => "Reply",
		icon: ArrowBendUpLeft,
		moderation: false,
		enabled: (message) => !message.deleted,
		run(message) {
			message.channel.chat.replyTarget = message;
			message.channel.chat.input?.focus();
		},
	},
	pin: {
		label: () => "Pin",
		icon: PushPin,
		moderation: true,
		enabled: (message) => !message.deleted && message.actionable && !message.pinned,
		run: (message) => message.channel.chat.pin(message.id),
	},
	delete: {
		label: () => "Delete",
		icon: Trash,
		moderation: true,
		enabled: (message) => !message.deleted && message.actionable,
		run: (message) => message.delete(),
	},
	timeout: {
		label: () => `Timeout (${timeoutLabel()})`,
		icon: Clock,
		moderation: true,
		enabled: (message) => message.actionable,
		run: (message) => message.viewer.timeout({ duration: timeoutDuration() }),
	},
	ban: {
		label: () => "Ban",
		icon: Gavel,
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
