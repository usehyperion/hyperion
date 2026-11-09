import { app } from "#lib/app.svelte.js";
import SuspicionStatus from "#lib/components/message/events/SuspicionStatus.svelte";
import { fromPubSubFragments } from "#lib/models/message/fragment.js";
import { UserMessage } from "#lib/models/message/user-message.svelte.js";

import { defineHandler } from "../helper";

const TREATMENT_NAMES = {
	ACTIVE_MONITORING: "monitoring",
	RESTRICTED: "restricting",
	NO_TREATMENT: null,
} as const;

export default defineHandler("pubsub", {
	name: "low-trust-users",
	async handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		if (payload.type === "low_trust_user_new_message") {
			const { low_trust_user: user, message_content: content } = payload.data;

			const message = UserMessage.from(channel, {
				id: payload.data.message_id,
				text: content.text,
				fragments: fromPubSubFragments(content.fragments),
				sender: {
					id: user.sender.user_id,
					login: user.sender.login,
					name: user.sender.display_name,
				},
				color: user.sender.chat_color ?? null,
			});

			message.viewer.monitored = user.treatment === "ACTIVE_MONITORING";
			message.viewer.restricted = user.treatment === "RESTRICTED";
			message.viewer.possibleBanEvader = user.ban_evasion_evaluation !== "UNLIKELY_EVADER";

			channel.chat.add(message);

			return;
		}

		const { treatment, target_user_id, updated_by, ban_evasion_evaluation } = payload.data;

		const viewer = await channel.viewers.fetch(target_user_id);
		const moderator = await channel.viewers.fetch(updated_by.id);

		const previous = viewer.monitored ? "monitoring" : viewer.restricted ? "restricting" : null;

		const current = TREATMENT_NAMES[treatment];

		viewer.possibleBanEvader = ban_evasion_evaluation !== "UNLIKELY_EVADER";
		viewer.monitored = treatment === "ACTIVE_MONITORING";
		viewer.restricted = treatment === "RESTRICTED";

		// A removed treatment can't be described without knowing what it was.
		const described = current ?? previous;
		if (!described) return;

		channel.chat.event(SuspicionStatus, {
			active: current !== null,
			treatment: described,
			viewer,
			moderator,
		});
	},
});
