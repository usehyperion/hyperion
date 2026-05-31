import { app } from "$lib/app.svelte";
import BlockStatus from "$lib/components/message/events/BlockStatus.svelte";
import { defineCommand, getTarget } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "unblock",
	description: "Remove a user from your block list",
	args: ["username"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);

		await app.twitch.users.unblock(target.id);

		channel.chat.event(BlockStatus, { blocked: false, user: target.user });
	},
});
