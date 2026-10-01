import { page } from "$app/state";
import { app } from "$lib/app.svelte";
import { log } from "$lib/log";
import { Whisper } from "$lib/models/whisper.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "whispers",
	async handle(payload) {
		const user = app.user;
		if (!user) return;

		if (payload.type === "thread") {
			const { id, last_read } = payload.data_object;

			for (const whisper of user.whispers.values()) {
				if (whisper.id === id) whisper.read(last_read);
			}

			return;
		}

		if (payload.type !== "whisper_received" && payload.type !== "whisper_sent") return;

		const data = payload.data_object;

		const fromId = String(data.from_id);
		const incoming = fromId !== user.id;

		const otherId = incoming ? fromId : String(data.recipient.id);
		const other = await app.twitch.users.fetch(otherId);

		const whisper = user.whispers.getOrInsertComputed(
			other.id,
			() => new Whisper(app.twitch, data.thread_id, other),
		);

		whisper.add(
			{
				id: data.message_id,
				createdAt: new Date(data.sent_ts * 1000),
				badges: data.tags.badges
					.map((badge) => app.badges.get(`${badge.id}:${badge.version}`))
					.filter((badge) => badge != null),
				user: incoming ? other : user,
				text: data.body,
			},
			data.id,
		);

		if (!incoming) return;

		whisper.unread++;

		// Keep the server in sync when the message is read as it arrives.
		if (page.url.pathname === `/whispers/${other.id}`) {
			void whisper.markRead().catch((error) => {
				void log.error(`Failed to mark whisper as read: ${String(error)}`).catch(() => {});
			});
		}
	},
});
