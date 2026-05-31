import { invoke } from "@tauri-apps/api/core";
import { app } from "$lib/app.svelte";
import EmoteSetChange from "$lib/components/message/events/EmoteSetChange.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "user.update",
	async handle(data) {
		const channel = app.channels.values().find((c) => c.seventvId === data.id);
		if (!channel) return;

		const root = data.updated?.find((c) => c.key === "connections");
		if (!root) return;

		const child = root.value.find(
			(c) => c.key === "emote_set" && c.value?.id !== channel.emoteSetId,
		);
		if (!child) return;

		const twitch = data.actor.connections.find((c) => c.platform === "TWITCH");
		if (!twitch) return;

		const actor = await channel.viewers.fetch(twitch.id);

		channel.emoteSetId = child.value?.id ?? null;
		channel.emotes.clear("7TV");

		if (child.value == null) {
			channel.chat.event(EmoteSetChange, { actor });
		} else {
			channel.chat.event(EmoteSetChange, { name: child.value.name, actor });

			await channel.emotes.fetch7tv();
			await invoke("resub_emote_set", {
				channel: channel.user.username,
				setId: channel.emoteSetId,
			});
		}
	},
});
