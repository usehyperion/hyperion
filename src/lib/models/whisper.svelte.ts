import { app } from "$lib/app.svelte";
import type { TwitchClient } from "$lib/twitch/client";

import type { Badge } from "./badge";
import type { User } from "./user.svelte";

export interface WhisperMessage {
	id: string;
	createdAt: Date;
	badges: Badge[];
	user: User;
	text: string;
}

export class Whisper {
	/**
	 * The messages in the whisper.
	 */
	public readonly messages = $state<WhisperMessage[]>([]);

	/**
	 * The most recently sent message in the whisper.
	 */
	public readonly latest = $derived(this.messages.at(-1));

	/**
	 * The number of unread messages in the whisper.
	 */
	public unread = $state(0);

	public constructor(
		public readonly client: TwitchClient,
		public readonly sender: User,
	) {}

	public async send(message: string) {
		if (!app.user || !message) return;

		await this.client.post("/whispers", {
			params: {
				from_user_id: app.user.id,
				to_user_id: this.sender.id,
			},
			body: {
				message,
			},
		});

		this.messages.push({
			id: crypto.randomUUID(),
			createdAt: new Date(),
			badges: [],
			user: app.user,
			text: message,
		});
	}
}
