import { SvelteMap } from "svelte/reactivity";

import { app } from "$lib/app.svelte";
import {
	banUserMutation,
	grantVipMutation,
	modUserMutation,
	revokeVipMutation,
	unbanUserMutation,
	unmodUserMutation,
	warnUserMutation,
} from "$lib/graphql/twitch";
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
		await this.channel.client.gql(grantVipMutation, {
			channel: this.channel.user.id,
			target: id,
		});
	}

	public async unvip(id: string) {
		await this.channel.client.gql(revokeVipMutation, {
			channel: this.channel.user.id,
			target: id,
		});
	}

	public async mod(id: string) {
		await this.channel.client.gql(modUserMutation, {
			channel: this.channel.user.id,
			target: id,
		});
	}

	public async unmod(id: string) {
		await this.channel.client.gql(unmodUserMutation, {
			channel: this.channel.user.id,
			target: id,
		});
	}

	public async warn(id: string, reason: string) {
		if (!app.user) return;

		await this.channel.client.gql(warnUserMutation, {
			channel: this.channel.user.id,
			target: id,
			reason,
		});
	}

	public async timeout(id: string, options: TimeoutOptions) {
		if (!app.user) return;

		await this.channel.client.gql(banUserMutation, {
			channel: this.channel.user.id,
			target: id,
			duration: `${options.duration}s`,
			reason: options.reason,
		});
	}

	public async ban(login: string, reason?: string) {
		if (!app.user) return;

		await this.channel.client.gql(banUserMutation, {
			channel: this.channel.user.id,
			target: login,
			reason,
		});
	}

	public async unban(login: string) {
		if (!app.user) return;

		await this.channel.client.gql(unbanUserMutation, {
			channel: this.channel.user.id,
			target: login,
		});
	}
}
