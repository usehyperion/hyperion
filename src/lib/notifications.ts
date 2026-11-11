import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { page } from "$app/state";

import type { UserMessage } from "./models/message/user-message.svelte";
import type { Whisper, WhisperMessage } from "./models/whisper.svelte";

import { app } from "./app.svelte";
import { log } from "./log";

export interface NotificationAction {
	/**
	 * Reported back in the response when the action is clicked.
	 */
	id: string;
	label: string;
}

export type NotificationUrgency = "low" | "normal" | "critical";

export interface NotificationOptions {
	title: string;

	/**
	 * Shown below the title on macOS and Windows.
	 */
	subtitle?: string;
	body?: string;
	actions?: NotificationAction[];

	/**
	 * Placeholder of an inline reply field.
	 */
	reply?: string;
	urgency?: NotificationUrgency;

	/**
	 * How long the notification stays up in milliseconds, `0` keeps it until
	 * dismissed. Platforms may round it or ignore it.
	 */
	timeout?: number;
}

/**
 * How the user responded to a notification. The app is brought to the front
 * for everything but `closed` and replies with text.
 */
export type NotificationResponse =
	| { type: "default" }
	| { type: "action"; id: string }
	| { type: "reply"; text: string | null }
	| { type: "closed" };

export async function notifyWhisper(whisper: Whisper, message: WhisperMessage) {
	const { sender } = whisper;

	const viewing =
		document.hasFocus() &&
		page.route.id === "/(main)/whispers/[id]" &&
		page.params.id === sender.id;

	if (viewing) return;

	const response = await app.notify({
		title: sender.displayName,
		subtitle: "Whisper",
		body: message.text,
		actions: [{ id: "view", label: "View" }],
		reply: `Reply to ${sender.displayName}`,
	});

	if (response?.type === "reply" && response.text) {
		try {
			await whisper.send(response.text);
			await whisper.markRead();
		} catch (error) {
			log.error("Failed to send whisper reply", error);

			void app.notify({
				title: "Whisper not sent",
				body: `Your reply to ${sender.displayName} could not be sent.`,
			});
		}

		return;
	}

	if (response && response.type !== "closed") {
		await goto(resolve("/(main)/whispers/[id]", { id: sender.id }));
	}
}

export async function notifyMention(message: UserMessage) {
	const { channel, author } = message;

	if (document.hasFocus() && app.focused === channel) return;

	const response = await app.notify({
		title: author.displayName,
		subtitle: `Mentioned you in ${channel.user.displayName}`,
		body: message.text,
		reply: `Reply to ${author.displayName}`,
	});

	if (response?.type === "reply" && response.text) {
		try {
			await channel.chat.send(response.text, message);
		} catch (error) {
			log.error("Failed to send mention reply", error);

			void app.notify({
				title: "Reply not sent",
				body: `Your reply in ${channel.user.displayName} could not be sent.`,
			});
		}

		return;
	}

	if (!response || response.type === "closed") return;

	await app.open(channel);

	// Without an inline reply field, pick the reply in the chat input instead.
	if (response.type === "reply") {
		channel.chat.replyTarget = message;
	}
}
