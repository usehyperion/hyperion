import { nodes } from "#lib/graphql/index.js";
import { vipsQuery } from "#lib/graphql/twitch.js";

import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "vips",
	description: "Display a list of VIPs for this channel",
	async exec(_, channel) {
		const { user } = await channel.client.gql(vipsQuery, { id: channel.id });

		const vips = nodes(user?.vips)
			.map((vip) => vip.displayName)
			.toSorted();

		const text = vips.length
			? `Channel VIPs (${vips.length}): ${vips.join(", ")}`
			: "This channel has no VIPs.";

		channel.chat.notice(text);
	},
});
