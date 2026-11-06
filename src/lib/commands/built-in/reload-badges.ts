import { app } from "#lib/app.svelte.js";
import { BADGE_PROVIDERS, type BadgeProvider } from "#lib/managers/badge-manager.js";

import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "reload-badges",
	description:
		"Reload all badges for the channel and optionally badges from a comma-separated list of providers",
	args: ["providers"],
	async exec(args, channel) {
		const providers = args[0]?.split(",") ?? [];

		if (providers.includes("all")) {
			await Promise.all([
				app.badges.fetch(BADGE_PROVIDERS, true),
				channel.badges.fetch(true),
			]);
		} else {
			const names = providers.filter((name): name is BadgeProvider =>
				(BADGE_PROVIDERS as readonly string[]).includes(name),
			);

			await Promise.all([channel.badges.fetch(true), app.badges.fetch(names, true)]);
		}

		channel.chat.notice("Reloaded badges.");
	},
});
