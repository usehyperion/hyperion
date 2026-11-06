import type { Channel } from "#lib/models/channel.svelte.js";

import { nodes } from "#lib/graphql/index.js";
import { foundersQuery, modsQuery, vipsQuery } from "#lib/graphql/twitch.js";

import { command } from "../define";

function list(name: string, noun: string, fetch: (channel: Channel) => Promise<string[]>) {
	return command({
		name,
		description: `Display a list of ${noun} for this channel`,
		async exec(_, channel) {
			const names = (await fetch(channel)).toSorted();

			channel.chat.notice(
				names.length
					? `Channel ${noun} (${names.length}): ${names.join(", ")}`
					: `This channel has no ${noun}.`,
			);
		},
	});
}

export default [
	list("founders", "founders", async (channel) => {
		const { user } = await channel.client.gql(foundersQuery, { id: channel.id });

		return (
			user?.channel?.founders?.flatMap((founder) =>
				founder?.user ? [founder.user.displayName] : [],
			) ?? []
		);
	}),
	list("mods", "moderators", async (channel) => {
		const { user } = await channel.client.gql(modsQuery, { id: channel.id });

		return nodes(user?.mods).map((mod) => mod.displayName);
	}),
	list("vips", "VIPs", async (channel) => {
		const { user } = await channel.client.gql(vipsQuery, { id: channel.id });

		return nodes(user?.vips).map((vip) => vip.displayName);
	}),
];
