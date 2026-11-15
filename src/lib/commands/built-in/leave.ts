import { app } from "#lib/app.svelte.js";

import { command } from "../define";

export default command({
	name: "leave",
	description: "Leave the current channel",
	async exec(_, channel) {
		await app.leave(channel);
	},
});
