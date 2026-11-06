import { command } from "../define";

export default command({
	name: "me",
	description: "Express an action in the third person",
	args: [{ type: "text", name: "message" }],
	async exec({ message }, channel) {
		// /me is the only slash command Twitch still accepts in a chat message.
		await channel.chat.send(`/me ${message}`);
	},
});
