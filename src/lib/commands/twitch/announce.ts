import { command } from "../define";

export default command({
	name: "announce",
	description: "Call attention to your message with a colored highlight",
	permission: "mod",
	args: [
		{
			type: "text",
			name: "message",
		},
	],
	async exec(args, channel) {
		await channel.chat.announce(args.message);
	},
});
