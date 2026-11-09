import { app } from "#lib/app.svelte.js";
import { CommandError } from "#lib/errors/command-error.js";
import { BADGE_PROVIDERS, type BadgeProvider } from "#lib/managers/badge-manager.js";

import { command } from "../define";

function isProvider(name: string): name is BadgeProvider {
	return (BADGE_PROVIDERS as readonly string[]).includes(name);
}

export default command({
	name: "reload-badges",
	description:
		"Reload all badges for the channel and optionally badges from a comma-separated list of providers",
	args: [
		{
			type: "string",
			name: "providers",
			optional: true,
		},
	],
	async exec(args, channel) {
		const names = args.providers?.toLowerCase().split(",").filter(Boolean) ?? [];
		const unknown = names.filter((name) => name !== "all" && !isProvider(name));

		if (unknown.length) {
			const valid = [...BADGE_PROVIDERS, "all"].join(", ");

			throw new CommandError(`Unknown badge provider: ${unknown.join(", ")}. Use ${valid}.`);
		}

		await Promise.all([
			channel.badges.fetch(true),
			app.badges.fetch(
				names.includes("all") ? BADGE_PROVIDERS : names.filter(isProvider),
				true,
			),
		]);

		channel.chat.notice("Reloaded badges.");
	},
});
