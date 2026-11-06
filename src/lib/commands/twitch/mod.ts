import { command } from "../define";

export default command({
	name: "mod",
	description: "Grant moderator status to a user",
	permission: "broadcaster",
	args: [{ type: "viewer", name: "username" }],
	errors: ({ username }) => ({
		TARGET_ALREADY_MOD: `${username.displayName} is already a moderator.`,
		TARGET_IS_CHAT_BANNED: `${username.displayName} is banned and cannot be made a moderator.`,
	}),
	async exec({ username }) {
		await username.mod();
	},
});
