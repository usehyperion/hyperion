import { command } from "../define";

export default command({
	name: "follower-only",
	description: "Restrict chat to followers based on their follow duration",
	permission: "mod",
	args: [
		{
			type: "bool",
			name: "enabled",
			default: true,
		},
		// Twitch takes the minimum follow age in minutes, up to 90 days.
		{
			type: "duration",
			name: "duration",
			unit: "m",
			min: 0,
			max: 129_600,
			default: 0,
		},
	],
	async exec({ enabled, duration }, channel) {
		await channel.chat.updateSettings({
			followerOnly: enabled,
			followerOnlyDuration: duration,
		});
	},
});
