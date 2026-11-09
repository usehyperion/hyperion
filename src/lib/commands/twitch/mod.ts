import { command } from "../define";

export default command({
	name: "mod",
	description: "Grant moderator status to a user",
	permission: "broadcaster",
	args: [
		{
			type: "viewer",
			name: "user",
		},
	],
	errors: (args) => ({
		TARGET_ALREADY_MOD: `${args.user.displayName} is already a moderator.`,
		TARGET_IS_CHAT_BANNED: `${args.user.displayName} is banned and cannot be made a moderator.`,
	}),
	async exec(args) {
		await args.user.mod();
	},
});
