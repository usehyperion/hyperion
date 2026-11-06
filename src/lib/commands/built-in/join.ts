import { app } from "#lib/app.svelte.js";
import { ErrorMessage } from "#lib/errors/messages.js";

import { command } from "../define";

export default command({
	name: "join",
	description: "Join a channel",
	args: [{ type: "string", name: "channel" }],
	errors: ({ channel }) => ({ 404: ErrorMessage.USER_NOT_FOUND(channel) }),
	async exec({ channel }) {
		await app.openByLogin(channel.replace(/^@/, "").toLowerCase());
	},
});
