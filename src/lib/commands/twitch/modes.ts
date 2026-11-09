import type { Channel } from "#lib/models/channel.svelte.js";

import { command } from "../define";

function toggle(
	name: string,
	description: string,
	set: (enabled: boolean, channel: Channel) => Promise<void>,
) {
	return command({
		name,
		description,
		permission: "mod",
		args: [
			{
				type: "bool",
				name: "enabled",
				default: true,
			},
		],
		async exec(args, channel) {
			await set(args.enabled, channel);
		},
	});
}

export default [
	toggle("emote-only", "Restrict chat to emote only messages", (emoteOnly, channel) =>
		channel.chat.updateSettings({ emoteOnly }),
	),
	toggle("subscriber-only", "Restrict chat to subscribers only", (subOnly, channel) =>
		channel.chat.setSubOnly(subOnly),
	),
	toggle("unique", "Prevent users from sending duplicate messages", (unique, channel) =>
		channel.chat.updateSettings({ unique }),
	),
	toggle("shield", "Restrict chat and ban harassing chatters", (enabled, channel) =>
		channel.chat.setShieldMode(enabled),
	),
];
