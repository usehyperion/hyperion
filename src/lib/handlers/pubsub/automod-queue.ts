import { tick } from "svelte";

import { app } from "#lib/app.svelte.js";
import AutoMod from "#lib/components/message/events/AutoMod.svelte";
import { fromPubSubFragments } from "#lib/models/message/fragment.js";
import { UserMessage } from "#lib/models/message/user-message.svelte.js";

import { defineHandler } from "../helper";

export default defineHandler("pubsub", {
	name: "automod-queue",
	async handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		const { message, status, resolver_id } = payload.data;

		if (status !== "PENDING") {
			const held = channel.chat.messages.find((m) => m.id === message.id);

			if (held) {
				held.deleted = true;
				await tick();

				if (status === "ALLOWED") {
					channel.chat.repost(held);
				}
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
			fragments: fromPubSubFragments(content.fragments),
			sender: {
				id: sender.user_id,
				login: sender.login,
				name: sender.display_name,
			},
			color: sender.chat_color,
			badges: sender.badges.map((badge) => ({ name: badge.id, version: badge.version })),
		});

		const { automod_failure } = payload.data.caught_message_reason;

		held.autoMod =
			payload.data.reason_code === "BlockedTermCaughtMessageReason"
				? {
						reason: "blocked-term",
						fragments: content.fragments,
					}
				: {
						reason: "automod",
						category: automod_failure.category,
						level: automod_failure.level,
						fragments: content.fragments,
					};

		channel.chat.add(held);
	},
});
