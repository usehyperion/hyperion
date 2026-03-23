import { foundersQuery } from "$lib/graphql/twitch";
import { SystemMessage } from "$lib/models/message/system-message";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "founders",
	description: "Display a list of founders for this channel",
	async exec(_, channel) {
		const message = new SystemMessage(channel);

		const { user } = await channel.client.send(foundersQuery, { id: channel.id });

		const founders =
			user?.channel?.founders
				?.flatMap((founder) => (founder?.user ? [founder.user.displayName] : []))
				.toSorted() ?? [];

		if (!founders.length) {
			message.text = "This channel has no founders.";
		} else {
			message.text = `Channel founders (${founders.length}): ${founders.join(", ")}`;
		}

		channel.chat.addMessage(message);
	},
});
