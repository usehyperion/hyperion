import { command } from "../define";

export default command({
	name: "unmod",
	description: "Revoke moderator status from a user",
	permission: "broadcaster",
	args: [{ type: "viewer", name: "username" }],
	errors: ({ username }) => ({
		TARGET_NOT_MOD: `${username.displayName} is not a moderator.`,
	}),
	async exec({ username }) {
		await username.unmod();
	},
});
