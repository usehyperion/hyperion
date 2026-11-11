import { SvelteMap } from "svelte/reactivity";

import type { Channel } from "#lib/models/channel.svelte.js";

import { chattersQuery } from "#lib/graphql/twitch.js";
import { Viewer } from "#lib/models/viewer.svelte.js";

export type ChatterRole = "broadcaster" | "staff" | "moderator" | "vip" | "chatbot" | "viewer";

export interface Chatter {
	login: string;
	role: ChatterRole;
	viewer?: Viewer;
}

export interface ChatterList {
	count: number;
	roles: Map<string, ChatterRole>;
}

const CHATTER_KEYS = [
	["broadcasters", "broadcaster"],
	["staff", "staff"],
	["moderators", "moderator"],
	["vips", "vip"],
	["chatbots", "chatbot"],
	["viewers", "viewer"],
] as const;

function viewerRole(viewer: Viewer): ChatterRole | null {
	if (viewer.broadcaster) return "broadcaster";
	if (viewer.moderator) return "moderator";
	if (viewer.vip) return "vip";

	return null;
}

export function mergeChatters(roles: Map<string, ChatterRole>, viewers: Iterable<Viewer>) {
	const merged = new Map<string, Chatter>();

	for (const [login, role] of roles) {
		merged.set(login, { login, role });
	}

	for (const viewer of viewers) {
		const login = viewer.username;

		const role =
			viewerRole(viewer) ?? roles.get(login) ?? (viewer.user.staff ? "staff" : "viewer");

		merged.set(login, { login, role, viewer });
	}

	return [...merged.values()].toSorted((a, b) => a.login.localeCompare(b.login));
}

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

	public async fetchChatters(): Promise<ChatterList> {
		const { channel } = await this.channel.client.gql(chattersQuery, { id: this.channel.id });
		const chatters = channel?.chatters;

		const roles = new Map<string, ChatterRole>();

		if (chatters) {
			for (const [key, role] of CHATTER_KEYS) {
				for (const { login } of chatters[key]) {
					if (!roles.has(login)) roles.set(login, role);
				}
			}
		}

		return { count: chatters?.count ?? 0, roles };
	}
}
