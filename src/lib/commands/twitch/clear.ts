import { command } from "../define";

export default command({
	name: "clear",
	description: "Clear chat history for non-moderator viewers",
	permission: "mod",
	async exec(_, channel) {
		await channel.chat.clear();
	},
});
