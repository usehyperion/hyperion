import { SvelteMap } from "svelte/reactivity";

import { app } from "$lib/app.svelte";
import type { Channel } from "$lib/models/channel.svelte";
import type { TimeoutOptions } from "$lib/models/viewer.svelte";
import { Viewer } from "$lib/models/viewer.svelte";

export class ViewerManager extends SvelteMap<string, Viewer> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	public async fetch(id: string, force = false) {
		if (!force) {
			const cached = this.get(id);
			if (cached) return cached;
		}

		const user = await this.channel.client.users.fetch(id);
		const viewer = new Viewer(this.channel, user);

		this.set(id, viewer);
		return viewer;
	}

	public async vip(id: string) {
		await this.channel.client.post("/channels/vips", {
			params: {
				broadcaster_id: this.channel.user.id,
				user_id: id,
			},
		});
	}

	public async unvip(id: string) {
		await this.channel.client.delete("/channels/vips", {
			broadcaster_id: this.channel.user.id,
			user_id: id,
		});
	}

	public async mod(id: string) {
		await this.channel.client.post("/moderation/moderators", {
			params: {
				broadcaster_id: this.channel.user.id,
				user_id: id,
			},
		});
	}

	public async unmod(id: string) {
		await this.channel.client.delete("/moderation/moderators", {
			broadcaster_id: this.channel.user.id,
			user_id: id,
		});
	}

	public async warn(id: string, reason: string) {
		if (!app.user) return;

		await this.channel.client.post("/moderation/warnings", {
			params: {
				broadcaster_id: this.channel.user.id,
				moderator_id: app.user.id,
			},
			body: {
				data: {
					user_id: id,
					reason,
				},
			},
		});
	}

	public async timeout(id: string, options: TimeoutOptions) {
		if (!app.user) return;

		await this.channel.client.post("/moderation/bans", {
			params: {
				broadcaster_id: this.channel.user.id,
				moderator_id: app.user.id,
			},
			body: {
				data: {
					user_id: id,
					duration: options.duration,
					reason: options.reason,
				},
			},
		});
	}

	public async ban(id: string, reason?: string) {
		if (!app.user) return;

		await this.channel.client.post("/moderation/bans", {
			params: {
				broadcaster_id: this.channel.user.id,
				moderator_id: app.user.id,
			},
			body: {
				data: {
					user_id: id,
					reason,
				},
			},
		});
	}

	public async unban(id: string) {
		if (!app.user) return;

		await this.channel.client.delete("/moderation/bans", {
			broadcaster_id: this.channel.user.id,
			moderator_id: app.user.id,
			user_id: id,
		});
	}
}
