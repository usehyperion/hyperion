import { app } from "#lib/app.svelte.js";
import BlockStatus from "#lib/components/message/events/BlockStatus.svelte";

import { command } from "../define";

function block(name: string, description: string, blocked: boolean) {
	return command({
		name,
		description,
		args: [
			{
				type: "user",
				name: "user",
			},
		],
		async exec(args, channel) {
			await (blocked
				? app.twitch.users.block(args.user.id)
				: app.twitch.users.unblock(args.user.id));

			channel.chat.event(BlockStatus, { blocked, user: args.user });
		},
	});
}

export default [
	block("block", "Block a user from interacting with you on Twitch", true),
	block("unblock", "Remove a user from your block list", false),
];
