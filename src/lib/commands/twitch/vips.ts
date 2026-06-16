import { vipsQuery } from "$lib/graphql/twitch";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "vips",
	description: "Display a list of VIPs for this channel",
	async exec(_, channel) {
		const { user } = await channel.client.gql(vipsQuery, { id: channel.id });

		const vips =
			user?.vips?.edges
				?.flatMap((edge) => (edge.node ? [edge.node.displayName] : []))
				.toSorted() ?? [];

		const text = vips.length
			? `Channel VIPs (${vips.length}): ${vips.join(", ")}`
			: "This channel has no VIPs.";

		channel.chat.notice(text);
	},
});
