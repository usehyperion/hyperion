import { command } from "../define";

export default command({
	name: "vip",
	description: "Grant VIP status to a user",
	permission: "broadcaster",
	args: [{ type: "viewer", name: "username" }],
	errors: ({ username }) => ({
		GRANTEE_ALREADY_VIP: `${username.displayName} is already a VIP.`,
		MAX_VIPS_REACHED: "The channel does not have any available VIP slots.",
		GRANTEE_CHAT_BANNED: `${username.displayName} is banned and cannot be made a VIP.`,
		VIP_ACHIEVEMENT_INCOMPLETE:
			"The channel must complete the VIP achievement before granting VIP status.",
	}),
	async exec({ username }) {
		await username.grantVip();
	},
});
