import { vipsQuery } from "$lib/graphql/twitch";
import { SystemMessage } from "$lib/models/message/system-message";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "vips",
	description: "Display a list of VIPs for this channel",
	async exec(_, channel) {
		const message = new SystemMessage(channel);

		const { user } = await channel.client.send(vipsQuery, { id: channel.id });

		const vips =
			user?.vips?.edges
				?.flatMap((edge) => (edge.node ? [edge.node.displayName] : []))
				.toSorted() ?? [];

		if (!vips.length) {
			message.text = "This channel has no VIPs.";
		} else {
			message.text = `Channel VIPs (${vips.length}): ${vips.join(", ")}`;
		}

		channel.chat.addMessage(message);
	},
});
