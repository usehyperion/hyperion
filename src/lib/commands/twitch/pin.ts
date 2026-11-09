import { command } from "../define";

export default command({
	name: "pin",
	description: "Pin a message you send into chat for the channel",
	permission: "mod",
	args: [
		{
			type: "text",
			name: "message",
		},
	],
	async exec(args, channel) {
		await channel.chat.sendPinned(args.message);
	},
});
