import { command } from "../define";

export default command({
	name: "vip",
	description: "Grant VIP status to a user",
	permission: "broadcaster",
	args: [
		{
			type: "viewer",
			name: "user",
		},
	],
	errors: (args) => ({
		GRANTEE_ALREADY_VIP: `${args.user.displayName} is already a VIP.`,
		MAX_VIPS_REACHED: "The channel does not have any available VIP slots.",
		GRANTEE_CHAT_BANNED: `${args.user.displayName} is banned and cannot be made a VIP.`,
		VIP_ACHIEVEMENT_INCOMPLETE:
			"The channel must complete the VIP achievement before granting VIP status.",
	}),
	async exec(args) {
		await args.user.grantVip();
	},
});
