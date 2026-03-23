import { modsQuery } from "$lib/graphql/twitch";
import { SystemMessage } from "$lib/models/message/system-message";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "mods",
	description: "Display a list of moderators for this channel",
	async exec(_, channel) {
		const message = new SystemMessage(channel);

		const { user } = await channel.client.send(modsQuery, { id: channel.id });

		const mods =
			user?.mods?.edges
				.flatMap((edge) => (edge.node ? [edge.node.displayName] : []))
				.toSorted() ?? [];

		if (!mods.length) {
			message.text = "This channel has no moderators.";
		} else {
			message.text = `Channel moderators (${mods.length}): ${mods.join(", ")}`;
		}

		channel.chat.addMessage(message);
	},
});
