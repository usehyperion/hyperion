import { command } from "../define";

export default command({
	name: "unvip",
	description: "Revoke VIP status from a user",
	permission: "broadcaster",
	args: [{ type: "viewer", name: "username" }],
	errors: ({ username }) => ({
		REVOKEE_NOT_VIP: `${username.displayName} is not a VIP.`,
	}),
	async exec({ username }) {
		await username.revokeVip();
	},
});
