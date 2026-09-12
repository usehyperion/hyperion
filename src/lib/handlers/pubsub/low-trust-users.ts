import { app } from "$lib/app.svelte";
import SuspicionStatus from "$lib/components/message/events/SuspicionStatus.svelte";
import { UserMessage } from "$lib/models/message/user-message.svelte";
import type { StructuredMessage } from "$lib/twitch/api";
import type { LowTrustFragment } from "$lib/twitch/pubsub";

import { defineHandler } from "../helper";

function fragments(list: LowTrustFragment[]): StructuredMessage["fragments"] {
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
			: {
					type: "text" as const,
					text: fragment.text,
				},
	);
}

export default defineHandler({
	name: "low-trust-users",
	async handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		if (payload.type === "low_trust_user_new_message") {
			const { low_trust_user: user, message_content: content } = payload.data;

			const message = UserMessage.from(channel, {
				message: {
					message_id: payload.data.message_id,
					text: content.text,
					fragments: fragments(content.fragments),
				},
				sender: {
					user_id: user.sender.user_id,
					user_login: user.sender.login,
					user_name: user.sender.display_name,
				},
				data: { name_color: user.sender.chat_color ?? "" },
			});

			message.viewer ??= await channel.viewers.fetch(user.sender.user_id);

			message.viewer.monitored = user.treatment === "ACTIVE_MONITORING";
			message.viewer.restricted = user.treatment === "RESTRICTED";
			message.viewer.possibleBanEvader = user.ban_evasion_evaluation !== "UNLIKELY_EVADER";

			channel.chat.add(message);

			return;
		}

		const { treatment, target_user_id, updated_by } = payload.data;

		const viewer = await channel.viewers.fetch(target_user_id);
		const moderator = await channel.viewers.fetch(updated_by.id);

		// Only update status if the user is not already monitored or
		// restricted.
		if (!viewer.monitored && !viewer.restricted) {
			// No previous information available so it doesn't make sense to
			// send the message since we don't know what changed.
			if (treatment === "NO_TREATMENT") return;

			viewer.monitored = treatment === "ACTIVE_MONITORING";
			viewer.restricted = treatment === "RESTRICTED";
		}

		channel.chat.event(SuspicionStatus, {
			active: treatment !== "NO_TREATMENT",
			previous: viewer.monitored ? "monitoring" : viewer.restricted ? "restricting" : null,
			viewer,
			moderator,
		});

		// Update AFTER message is sent so the previous status is available.
		viewer.monitored = treatment === "ACTIVE_MONITORING";
		viewer.restricted = treatment === "RESTRICTED";
	},
});
