import { app } from "#lib/app.svelte.js";
import EmoteSetUpdate from "#lib/components/message/events/EmoteSetUpdate.svelte";
import { transformEvent7tvEmote } from "#lib/emotes.js";

import { defineHandler, seventvActor } from "../helper";

type EmoteSetUpdateProps = import("svelte").ComponentProps<typeof EmoteSetUpdate>;

export default defineHandler("seventv", {
	name: "emote_set.update",
	async handle(data) {
		const channel = app.channels.values().find((c) => c.emoteSetId === data.id);

		if (channel) {
			if (!channel.emotes.isLoaded("7TV")) return;

			let last: Omit<EmoteSetUpdateProps, "actor"> | null = null;

			for (const change of data.pushed ?? []) {
				const emote = transformEvent7tvEmote(change.value);

				last = { action: "added", emote };

				channel.emotes.set(emote.displayName, emote);
			}

			for (const change of data.pulled ?? []) {
				const emote = channel.emotes.get(change.old_value.name);
				if (!emote) continue;

				last = { action: "removed", emote };

				channel.emotes.delete(change.old_value.name);
			}

			for (const change of data.updated ?? []) {
				const emote = channel.emotes.get(change.old_value.name);
				if (!emote) continue;

				last = { action: "renamed", oldName: emote.displayName, emote };

				emote.alias = change.value.name === emote.name ? undefined : change.value.name;
				emote.displayName = change.value.name;

				channel.emotes.delete(change.old_value.name);
				channel.emotes.set(change.value.name, emote);
			}

			const actor = last && (await seventvActor(channel, data.actor));
			if (last && actor) channel.chat.event(EmoteSetUpdate, { ...last, actor });
		}
		// Personal set was updated
		else {
			const emotes = app.cosmetics.personalSets.get(data.id);
			if (!emotes) return;

			const pulled = new Set(data.pulled?.map((change) => change.old_value.id));

			const kept = emotes.filter((emote) => !pulled.has(emote.id));
			const pushed = data.pushed?.map((change) => transformEvent7tvEmote(change.value)) ?? [];

			for (const change of data.updated ?? []) {
				const emote = kept.find((e) => e.id === change.value.id);
				if (!emote) continue;

				emote.alias = change.value.name === emote.name ? undefined : change.value.name;
				emote.displayName = change.value.name;
			}

			app.cosmetics.personalSets.set(data.id, [...kept, ...pushed]);
		}
	},
});
