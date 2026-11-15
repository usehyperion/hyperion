import { command } from "../define";

export default command({
	name: "warn",
	description:
		"Issue a warning to a user that they must acknowledge before sending more messages",
	permission: "mod",
	args: [
		{
			type: "viewer",
			name: "user",
		},
		{
			type: "text",
			name: "reason",
		},
	],
	fallback: (args) => `${args.user.displayName} cannot be warned.`,
	async exec(args) {
		await args.user.warn(args.reason);
	},
});
