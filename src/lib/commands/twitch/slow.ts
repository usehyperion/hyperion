import { command } from "../define";

export default command({
	name: "slow",
	description: "Limit how frequently users can send messages",
	permission: "mod",
	args: [{ type: "duration", name: "duration", min: 3, max: 120, default: 30, off: true }],
	async exec({ duration }, channel) {
		await channel.chat.updateSettings({ slow: duration });
	},
});
