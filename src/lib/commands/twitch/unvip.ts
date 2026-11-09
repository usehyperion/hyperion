import { command } from "../define";

export default command({
	name: "unvip",
	description: "Revoke VIP status from a user",
	permission: "broadcaster",
	args: [
		{
			type: "viewer",
			name: "user",
		},
	],
	errors: (args) => ({
		REVOKEE_NOT_VIP: `${args.user.displayName} is not a VIP.`,
	}),
	async exec(args) {
		await args.user.revokeVip();
	},
});
