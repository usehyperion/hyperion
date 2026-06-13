import { app } from "$lib/app.svelte";
import { UserMessage } from "$lib/models/message/user-message";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.suspicious_user.message",
	handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel) return;

		const message = UserMessage.from(channel, {
			message: data.message,
			sender: data,
		});

		if (message.viewer) {
			message.viewer.monitored = data.low_trust_status === "active_monitoring";
			message.viewer.restricted = data.low_trust_status === "restricted";
			message.viewer.banEvasion = data.ban_evasion_evaluation;
		}

		channel.chat.add(message);
	},
});
