import { command } from "../define";

function unban(name: string, description: string) {
	return command({
		name,
		description,
		permission: "mod",
		args: [{ type: "viewer", name: "username" }],
		errors: ({ username }) => ({
			TARGET_NOT_BANNED: `${username.displayName} is not banned.`,
		}),
		async exec({ username }) {
			await username.unban();
		},
	});
}

// Twitch lifts timeouts and bans with the same mutation.
export default [
	unban("unban", "Remove a permanent ban on a user"),
	unban("untimeout", "Remove a timeout on a user"),
];
