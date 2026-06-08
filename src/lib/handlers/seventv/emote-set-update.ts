import * as cache from "tauri-plugin-cache-api";
import { app } from "$lib/app.svelte";
import EmoteSetUpdate from "$lib/components/message/events/EmoteSetUpdate.svelte";
import type { Emote } from "$lib/emotes";
import type { EmoteChange } from "$lib/seventv";
import { defineHandler } from "../helper";

type EmoteSetUpdateProps = import("svelte").ComponentProps<typeof EmoteSetUpdate>;

function transform(emote: EmoteChange): Emote {
	const { host } = emote.data;

	const format = ["webp", "png", "gif"].find((f) =>
		host.files.some((file) => file.format.toLowerCase() === f),
	);

	const files = host.files
		.filter((file) => file.format.toLowerCase() === format)
		.toSorted((a, b) => b.width - a.width);

	const largest = files.at(0);

	return {
		provider: "7TV",
		id: emote.id,
		name: emote.name,
		width: (largest?.width ?? 28) / 2,
		height: (largest?.height ?? 28) / 2,
		srcset: files.map((file) => `https:${host.url}/${file.name} ${file.name[0]}x`),
		zeroWidth: (emote.data.flags & 256) === 256,
	};
}

export default defineHandler({
	name: "emote_set.update",
	async handle(data) {
		const updated = data.pulled || data.pushed || data.updated;
		if (!updated?.length) return;

		const channel = app.channels.values().find((c) => c.emoteSetId === data.id);

		if (channel) {
			const twitch = data.actor.connections.find((c) => c.platform === "TWITCH");
			if (!twitch) return;

			const actor = await channel.viewers.fetch(twitch.id);
			let last: EmoteSetUpdateProps | null = null;

			for (const change of data.pushed ?? []) {
				const emote = transform(change.value);

				last = { action: "added", emote, actor };

				channel.emotes.set(emote.name, emote);
			}

			for (const change of data.pulled ?? []) {
				const emote = channel.emotes.get(change.old_value.name);
				if (!emote) continue;

				last = { action: "removed", emote, actor };

				channel.emotes.delete(change.old_value.name);
			}

			for (const change of data.updated ?? []) {
				const emote = channel.emotes.get(change.old_value.name);
				if (!emote) continue;

				last = { action: "renamed", oldName: emote.name, emote, actor };

				emote.name = change.value.name;

				channel.emotes.delete(change.old_value.name);
				channel.emotes.set(change.value.name, emote);
			}

			if (last) channel.chat.event(EmoteSetUpdate, last);

			await cache.remove(`emotes:${channel.id}`);
			await cache.set(`emotes:${channel.id}`, channel.emotes.values().toArray());
		}
		// Personal set was updated
		else {
			const emoteSet = app.emoteSets.get(data.id);
			if (!emoteSet) return;

			for (const change of data.pushed ?? []) {
				emoteSet.emotes.push(transform(change.value));
			}

			for (const change of data.pulled ?? []) {
				const index = emoteSet.emotes.findIndex((e) => e.id === change.old_value.id);

				if (index !== -1) {
					emoteSet.emotes.splice(index, 1);
				}
			}

			for (const change of data.updated ?? []) {
				const emote = emoteSet.emotes.find((e) => e.id === change.value.id);
				if (!emote) continue;

				emote.name = change.value.name;
			}
		}
	},
});
