import { SvelteMap } from "svelte/reactivity";

import type { Channel } from "#lib/models/channel.svelte.js";
import type { User } from "#lib/models/user.svelte.js";

import { chattersQuery } from "#lib/graphql/twitch.js";
import { Viewer } from "#lib/models/viewer.svelte.js";

export type ChatterRole = "broadcaster" | "staff" | "moderator" | "vip" | "chatbot" | "viewer";

export interface Chatter {
	login: string;
	role: ChatterRole;
	user?: User;
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

export const CHATTER_ROLES: readonly ChatterRole[] = CHATTER_KEYS.map(([, role]) => role);

const RANK = new Map(CHATTER_ROLES.map((role, index) => [role, index]));

function rank(role: ChatterRole) {
	return RANK.get(role) ?? CHATTER_ROLES.length;
}

function roleOf(base: ChatterRole, viewer?: Viewer): ChatterRole {
	if (!viewer) return base;

	const candidates: ChatterRole[] = [base];

	if (viewer.broadcaster) candidates.push("broadcaster");
	if (viewer.user.staff) candidates.push("staff");
	if (viewer.moderator) candidates.push("moderator");
	if (viewer.vip) candidates.push("vip");

	return candidates.reduce((best, role) => (rank(role) < rank(best) ? role : best));
}

export function mergeChatters(channel: Channel, roles: Map<string, ChatterRole> | null) {
	// Index cached users once rather than scanning the cache per chatter.
	const users = new Map<string, User>();

	for (const user of channel.client.users.values()) {
		users.set(user.username, user);
	}

	const merged = new Map<string, Chatter>();

	if (roles) {
		for (const [login, base] of roles) {
			const viewer = channel.viewers.getByLogin(login);

			merged.set(login, {
				login,
				role: roleOf(base, viewer),
				user: viewer?.user ?? users.get(login),
				viewer,
			});
		}
	} else {
		for (const message of channel.chat.messages) {
			if (!message.isUser() || message.source.id !== channel.id) continue;

			const { viewer } = message;
			if (merged.has(viewer.username)) continue;

			merged.set(viewer.username, {
				login: viewer.username,
				role: roleOf("viewer", viewer),
				user: viewer.user,
				viewer,
			});
		}
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

	public async fetchByLogin(login: string) {
		const cached = this.getByLogin(login);
		if (cached) return cached;

		const user = await this.channel.client.users.fetch(login, { by: "login" });

		const existing = this.get(user.id);
		if (existing) return existing;

		const viewer = new Viewer(this.channel, user);

		this.set(user.id, viewer);
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
