import { app } from "$lib/app.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "pinned-chat-updates-v1",
	async handle(data) {
		const channel = app.channels.get(data.target_id);
		if (!channel) return;

		if (data.type === "pin-message") {
			await channel.chat.fetchPinned();
		} else if (data.type === "unpin-message") {
			channel.chat.clearPin(null);
		} else if (channel.chat.pinned) {
			channel.chat.pinned.updatedAt = data.updated_at!;
		}
	},
});
