import { app } from "#lib/app.svelte.js";
import { Poll } from "#lib/models/poll.svelte.js";

import { defineHandler } from "../helper";

export default defineHandler("pubsub", {
	name: "polls",
	async handle(data) {
		const channel = app.channels.get(data.target_id);
		if (!channel) return;

		const { poll } = data.data;

		if (channel.poll?.id === poll.poll_id) {
			channel.poll.update(poll);
			return;
		}

		// Covers new polls and updates for polls that aren't tracked yet.
		const creator = poll.created_by
			? await channel.client.users.fetch(poll.created_by).catch(() => null)
			: null;

		channel.setPoll(new Poll(channel, creator, poll));
	},
});
