import { app } from "#lib/app.svelte.js";
import { Prediction } from "#lib/models/prediction.svelte.js";

import { defineHandler } from "../helper";

export default defineHandler("pubsub", {
	name: "predictions-channel-v1",
	async handle(data) {
		const channel = app.channels.get(data.target_id);
		if (!channel) return;

		const { event } = data.data;

		if (data.type === "event-updated" && channel.prediction?.id === event.id) {
			channel.prediction.update(event);
			return;
		}

		const creator =
			event.created_by.type === "USER"
				? await channel.client.users.fetch(event.created_by.user_id!)
				: null;

		channel.setPrediction(new Prediction(channel, creator, event));
	},
});
