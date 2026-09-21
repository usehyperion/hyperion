import { tick } from "svelte";

import { app } from "$lib/app.svelte";
import AutoMod from "$lib/components/message/events/AutoMod.svelte";
import type { MessageFragment } from "$lib/models/message/fragment";
import { UserMessage } from "$lib/models/message/user-message.svelte";
import type { AutoModCaughtMessage, AutoModFragment } from "$lib/twitch/pubsub";

import { defineHandler } from "../helper";

function fragments(list: AutoModFragment[]) {
	return list.map<MessageFragment>((fragment) =>
		fragment.emoticon
			? { type: "emote", text: fragment.text, id: fragment.emoticon.emoticonID }
			: { type: "text", text: fragment.text },
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

		const { message, status, resolver_id } = payload.data;

		if (status !== "PENDING") {
			const held = channel.chat.messages.find((m): m is UserMessage => m.id === message.id);

			if (held) {
				held.deleted = true;
				await tick();

				if (status === "ALLOWED") channel.chat.repost(held);
			}

			const viewer = await channel.viewers.fetch(message.sender.user_id);
			const moderator = await channel.viewers.fetch(resolver_id);

			channel.chat.event(AutoMod, {
				status: status.toLowerCase(),
				viewer,
				moderator,
			});

			return;
		}

		const { sender, content } = message;

		const held = UserMessage.from(channel, {
			id: message.id,
			text: content.text,
			fragments: fragments(content.fragments),
			sender: {
				id: sender.user_id,
				login: sender.login,
				name: sender.display_name,
			},
			color: sender.chat_color,
			badges: sender.badges.map((badge) => ({ name: badge.id, version: badge.version })),
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
