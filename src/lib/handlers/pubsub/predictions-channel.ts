import { app } from "$lib/app.svelte";
import { Prediction } from "$lib/models/prediction.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "predictions-channel-v1",
	async handle(data) {
		const channel = app.channels.get(data.target_id);
		if (!channel) return;

		const { event } = data.data;

		// Update the existing prediction in place when it matches.
		if (data.type === "event-updated" && channel.prediction?.id === event.id) {
			channel.prediction.update(event);
			return;
		}

		// Otherwise (re)create it — covers both new predictions and updates that
		// arrive for a prediction we aren't yet tracking.
		channel.prediction?.dispose();

		const creator =
			event.created_by.type !== "USER"
				? null
				: await channel.client.users.fetch(event.created_by.user_id!);

		channel.prediction = new Prediction(channel, creator, event);
	},
});
