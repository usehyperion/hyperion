import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { app } from "$lib/app.svelte";
import { settings } from "$lib/settings";

export async function load({ params, parent }) {
	if (dev) await parent();

	const channel = app.channels.getByLogin(params.username);

	if (!channel) {
		await app.focused?.leave();
		error(404);
	}

	if (app.focused !== channel) {
		if (channel.joined) {
			app.focused = channel;
		} else {
			if (settings.state["advanced.singleConnection"]) {
				await app.focused?.leave();
			}

			await channel.join();
		}
	}

	app.splits.ensure(channel.id);

	return { channel };
}
