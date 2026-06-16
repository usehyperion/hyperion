import { foundersQuery } from "$lib/graphql/twitch";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "founders",
	description: "Display a list of founders for this channel",
	async exec(_, channel) {
		const { user } = await channel.client.gql(foundersQuery, { id: channel.id });

		const founders =
			user?.channel?.founders
				?.flatMap((founder) => (founder?.user ? [founder.user.displayName] : []))
				.toSorted() ?? [];

		const text = founders.length
			? `Channel founders (${founders.length}): ${founders.join(", ")}`
			: "This channel has no founders.";

		channel.chat.notice(text);
	},
});
