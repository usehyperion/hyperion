import { SvelteMap } from "svelte/reactivity";

import type { Channel } from "#lib/models/channel.svelte.js";

import { Viewer } from "#lib/models/viewer.svelte.js";

export class ViewerManager extends SvelteMap<string, Viewer> {
	readonly #logins = new Map<string, Viewer>();

	public constructor(public readonly channel: Channel) {
		super();
	}

	public override set(id: string, viewer: Viewer) {
		super.set(id, viewer);
		this.#logins.set(viewer.username, viewer);

		return this;
	}

	public override delete(id: string) {
		const viewer = this.get(id);
		if (viewer) this.#logins.delete(viewer.username);

		return super.delete(id);
	}

	public override clear() {
		super.clear();
		this.#logins.clear();
	}

	public getByLogin(login: string) {
		return this.#logins.get(login);
	}

	public async fetch(id: string) {
		const cached = this.get(id);
		if (cached) return cached;

		const user = await this.channel.client.users.fetch(id);
		const viewer = new Viewer(this.channel, user);

		this.set(id, viewer);
		return viewer;
	}
}
