import { app } from "$lib/app.svelte";
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
			await app.badges.fetch(true);
		} else {
			const promises: Promise<unknown>[] = [channel.fetchBadges(true)];

			if (providers.includes("twitch")) {
				promises.push(app.badges.fetchTwitch(true));
			}

			if (providers.includes("bttv")) {
				promises.push(app.badges.fetchBttv(true));
			}

			if (providers.includes("ffz")) {
				promises.push(app.badges.fetchFfz(true));
			}

			await Promise.all(promises);
		}

		channel.chat.notice("Reloaded badges.");
	},
});
