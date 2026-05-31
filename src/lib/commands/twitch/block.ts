import { app } from "$lib/app.svelte";
import BlockStatus from "$lib/components/message/events/BlockStatus.svelte";
import { defineCommand, getTarget } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "block",
	description: "Block a user from interacting with you on Twitch",
	args: ["username"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);
		if (!target) return;

		await app.twitch.users.block(target.id);

		channel.chat.event(BlockStatus, { blocked: true, user: target.user });
	},
});
