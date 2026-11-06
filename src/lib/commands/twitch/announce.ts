import { command } from "../define";

export default command({
	name: "announce",
	description: "Call attention to your message with a colored highlight",
	permission: "mod",
	args: [{ type: "text", name: "message" }],
	async exec({ message }, channel) {
		await channel.chat.announce(message);
	},
});
