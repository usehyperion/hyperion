import { modsQuery } from "$lib/graphql/twitch";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "mods",
	description: "Display a list of moderators for this channel",
	async exec(_, channel) {
		const { user } = await channel.client.gql(modsQuery, { id: channel.id });

		const mods =
			user?.mods?.edges
				.flatMap((edge) => (edge.node ? [edge.node.displayName] : []))
				.toSorted() ?? [];

		const text = mods.length
			? `Channel moderators (${mods.length}): ${mods.join(", ")}`
			: "This channel has no moderators.";

		channel.chat.notice(text);
	},
});
