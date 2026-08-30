import { SvelteMap } from "svelte/reactivity";

import { Channel } from "$lib/models/channel.svelte";
import type { TwitchClient } from "$lib/twitch/client";

export interface ChannelFetchOptions {
	by?: "id" | "login";
	force?: boolean;
}

export class ChannelManager extends SvelteMap<string, Channel> {
	public constructor(public readonly client: TwitchClient) {
		super();
	}

	public getByLogin(login: string) {
		return this.values().find((c) => c.user.username === login);
	}

	public async fetch(idOrLogin: string, { by = "id", force = false }: ChannelFetchOptions = {}) {
		if (!force) {
			const cached = by === "id" ? this.get(idOrLogin) : this.getByLogin(idOrLogin);
			if (cached) return cached;
		}

		const user = await this.client.users.fetch(idOrLogin, { by });
		const channel = new Channel(this.client, user);

		this.set(channel.id, channel);

		return channel;
	}
}
