import { command } from "../define";

export default command({
	name: "warn",
	description:
		"Issue a warning to a user that they must acknowledge before sending more messages",
	permission: "mod",
	args: [
		{ type: "viewer", name: "username" },
		{ type: "text", name: "reason" },
	],
	fallback: ({ username }) => `${username.displayName} cannot be warned.`,
	async exec({ username, reason }) {
		await username.warn(reason);
	},
});
