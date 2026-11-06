import { app } from "#lib/app.svelte.js";
import { log } from "#lib/log.js";

import { defineHandler } from "../helper";

export default defineHandler("pubsub", {
	name: "broadcast-settings-update",
	async handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel) return;

		const titleChanged = data.old_status !== data.status;
		const gameChanged = data.old_game_id !== data.game_id;

		if (!titleChanged && !gameChanged) return;

		if (titleChanged) {
			channel.chat.notice(`The stream title has been updated to "${data.status}"`);
		}

		if (gameChanged) {
			channel.chat.notice(`The stream game has been updated to "${data.game}"`);
		}

		if (!channel.stream) return;

		channel.stream.title = data.status;
		channel.stream.game = { slug: "", name: data.game };

		// Refresh what the event doesn't carry, such as the game's slug.
		await channel.fetchStream().catch((error: unknown) => {
			log.warn(`Failed to refresh the stream of ${channel.id}: ${String(error)}`);
		});
	},
});
