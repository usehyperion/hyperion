import { app } from "$lib/app.svelte";
import { UserMessage } from "$lib/models/message/user-message";
import type { Boundary } from "$lib/twitch/eventsub";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "automod.message.hold",
	handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel) return;

		const isAutoMod = data.reason === "automod";
		data.message.message_id = data.message_id;

		const message = UserMessage.from(channel, data.message, {
			id: data.user_id,
			login: data.user_login,
			name: data.user_name,
		});

		const boundaries: Boundary[] = [];

		if (isAutoMod) {
			for (const boundary of data.automod.boundaries) {
				boundaries.push(boundary);
			}
		} else {
			for (const term of data.blocked_term.terms_found) {
				boundaries.push(term.boundary);
			}
		}

		let reason = "for using blocked terms";

		if (isAutoMod) {
			const { category } = data.automod;

			if (category === "smartdetection") {
				reason = "by smart detection";
			} else {
				reason = `for ${category}`;
			}
		}

		message.autoMod = {
			category: reason,
			level: isAutoMod ? data.automod.level : Number.NaN,
			boundaries,
		};

		channel.chat.add(message);
	},
});
