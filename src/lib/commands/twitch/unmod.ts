import { command } from "../define";

export default command({
	name: "unmod",
	description: "Revoke moderator status from a user",
	permission: "broadcaster",
	args: [
		{
			type: "viewer",
			name: "user",
		},
	],
	errors: (args) => ({
		TARGET_NOT_MOD: `${args.user.displayName} is not a moderator.`,
	}),
	async exec(args) {
		await args.user.unmod();
	},
});
