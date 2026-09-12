import { app } from "$lib/app.svelte";
import AutoMod from "$lib/components/message/events/AutoMod.svelte";
import { UserMessage } from "$lib/models/message/user-message.svelte";
import type { StructuredMessage } from "$lib/twitch/api";
import type { AutoModCaughtMessage, AutoModFragment } from "$lib/twitch/pubsub";

import { defineHandler } from "../helper";

function fragments(list: AutoModFragment[]): StructuredMessage["fragments"] {
	return list.map((fragment) =>
		fragment.emoticon
			? {
					type: "emote" as const,
					text: fragment.text,
					emote: {
						id: fragment.emoticon.emoticonID,
						emote_set_id: fragment.emoticon.emoticonSetID,
					},
				}
			: { type: "text" as const, text: fragment.text },
	);
}

function category(data: AutoModCaughtMessage) {
	if (data.reason_code === "BlockedTermCaughtMessageReason") {
		return "for using blocked terms";
	}

	const { category } = data.caught_message_reason.automod_failure;

	return category === "smartdetection" ? "by smart detection" : `for ${category}`;
}

export default defineHandler({
	name: "automod-queue",
	async handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		// todo: not receiving events on this path
		// Non-moderators only receive the message id and its status
		if (!("message" in payload.data)) {
			const { message_id, status } = payload.data;

			if (status === "PENDING") {
				channel.chat.notice(
					"Your message is being held for review by the moderators and has not been sent.",
				);

				return;
			}

			const held = channel.chat.messages.find((m): m is UserMessage => m.id === message_id);
			if (held) held.deleted = true;

			channel.chat.notice(`A moderator ${status.toLowerCase()} your message.`);

			return;
		}

		const { message, status, resolver_id } = payload.data;

		if (status !== "PENDING") {
			const held = channel.chat.messages.find((m): m is UserMessage => m.id === message.id);

			if (held) {
				held.deleted = true;
				held.autoMod = null;
			}

			const viewer = await channel.viewers.fetch(message.sender.user_id);
			const moderator = await channel.viewers.fetch(resolver_id);

			channel.chat.event(AutoMod, {
				status: status.toLowerCase(),
				viewer,
				moderator,
			});

			// todo: find a way to repost to chat

			return;
		}

		const { sender, content } = message;

		const held = UserMessage.from(channel, {
			message: {
				message_id: message.id,
				text: content.text,
				fragments: fragments(content.fragments),
			},
			sender: {
				user_id: sender.user_id,
				user_login: sender.login,
				user_name: sender.display_name,
			},
			data: {
				name_color: sender.chat_color,
				badges: sender.badges.map((badge) => ({ name: badge.id, version: badge.version })),
			},
		});

		const isBlockedTerm = payload.data.reason_code === "BlockedTermCaughtMessageReason";

		held.autoMod = {
			category: category(payload.data),
			level: isBlockedTerm
				? Number.NaN
				: payload.data.caught_message_reason.automod_failure.level,
			fragments: content.fragments,
		};

		channel.chat.add(held);
	},
});
