import { command } from "../define";

function unban(name: string, description: string) {
	return command({
		name,
		description,
		permission: "mod",
		args: [
			{
				type: "viewer",
				name: "user",
			},
		],
		errors: (args) => ({
			TARGET_NOT_BANNED: `${args.user.displayName} is not banned.`,
		}),
		async exec(args) {
			await args.user.unban();
		},
	});
}

// Twitch lifts timeouts and bans with the same mutation.
export default [
	unban("unban", "Remove a permanent ban on a user"),
	unban("untimeout", "Remove a timeout on a user"),
];
