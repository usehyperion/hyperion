import { app } from "#lib/app.svelte.js";

import { command } from "../define";

export default command({
	name: "reload-emotes",
	description: "Reload all emotes for the channel and optionally global emotes",
	args: [
		{
			type: "bool",
			name: "include-global",
			default: false,
		},
	],
	async exec(args, channel) {
		await Promise.all([
			args["include-global"] && app.emotes.fetch(true),
			channel.emotes.fetch(true),
		]);

		channel.chat.notice("Reloaded emotes.");
	},
});
