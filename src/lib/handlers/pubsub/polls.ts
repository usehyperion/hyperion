import { app } from "$lib/app.svelte";
import { Poll } from "$lib/models/poll.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "polls",
	async handle(data) {
		const channel = app.channels.get(data.target_id);
		if (!channel) return;

		const { poll } = data.data;
		console.log(poll);

		switch (data.type) {
			case "POLL_CREATE": {
				channel.poll?.dispose();

				const creator = await channel.client.users.fetch(poll.created_by);
				channel.poll = new Poll(channel, creator, poll);

				break;
			}

			case "POLL_UPDATE": {
				channel.poll?.update(poll);
				break;
			}

			case "POLL_COMPLETE":
			case "POLL_TERMINATE": {
				channel.poll?.complete(poll);
				break;
			}
		}
	},
});
