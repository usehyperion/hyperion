import { command } from "../define";

export default command({
	name: "pin",
	description: "Pin a message you send into chat for the channel",
	permission: "mod",
	args: [{ type: "text", name: "message" }],
	async exec({ message }, channel) {
		await channel.chat.sendPinned(message);
	},
});
