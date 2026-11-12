import { chattersQuery } from "#lib/graphql/twitch.js";
import { log } from "#lib/log.js";

import type { Channel } from "./channel.svelte";
import type { User } from "./user.svelte";
import type { Viewer } from "./viewer.svelte";

export type ChatterRole = "broadcaster" | "staff" | "moderator" | "vip" | "chatbot" | "viewer";

export interface Chatter {
	login: string;
	role: ChatterRole;
	user?: User;
	viewer?: Viewer;
}

const CHATTER_KEYS = [
	["broadcasters", "broadcaster"],
	["staff", "staff"],
	["moderators", "moderator"],
	["vips", "vip"],
	["chatbots", "chatbot"],
	["viewers", "viewer"],
] as const;

/**
 * Chatter roles from highest to lowest precedence. A chatter with several
 * roles is listed under the first.
 */
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

export class ChatterList {
	public count = $state<number | null>(null);
	public loading = $state(false);

	/**
	 * Whether the last refresh failed, in which case only the authors of
	 * messages currently in chat are listed.
	 */
	public error = $state(false);
	public chatters = $state.raw<Chatter[]>([]);

	#token = 0;

	public constructor(public readonly channel: Channel) {}

	public async refresh() {
		const current = ++this.#token;

		this.loading = true;
		this.error = false;

		let roles: Map<string, ChatterRole> | null = null;

		try {
			const list = await this.#fetch();
			if (current !== this.#token) return;

			roles = list.roles;
			this.count = list.count;
		} catch (cause) {
			if (current !== this.#token) return;

			this.error = true;
			this.count = null;
			log.error("Failed to fetch chatters", cause);
		}

		// Snapshot the merge so new chat activity doesn't reshuffle the list
		// while it's being browsed. Refreshing picks up new viewers.
		this.chatters = this.#merge(roles);
		this.loading = false;
	}

	/**
	 * Retrieves the viewer for the chatter, registering them in the channel
	 * if they haven't chatted so their message history can be shown.
	 */
	public async resolve(chatter: Chatter) {
		if (chatter.viewer) return chatter.viewer;

		const viewer = await this.channel.viewers.fetchByLogin(chatter.login);

		viewer.moderator = chatter.role === "moderator";
		viewer.vip = chatter.role === "vip";

		const resolved = {
			...chatter,
			user: viewer.user,
			viewer,
		};

		this.chatters = this.chatters.map((entry) => (entry === chatter ? resolved : entry));

		return viewer;
	}

	async #fetch() {
		const { channel } = await this.channel.client.gql(chattersQuery, {
			id: this.channel.id,
		});

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

	#merge(roles: Map<string, ChatterRole> | null) {
		// Index cached users once rather than scanning the cache per chatter.
		const users = new Map<string, User>();

		for (const user of this.channel.client.users.values()) {
			users.set(user.username, user);
		}

		const merged = new Map<string, Chatter>();

		if (roles) {
			for (const [login, base] of roles) {
				const viewer = this.channel.viewers.getByLogin(login);

				merged.set(login, {
					login,
					role: roleOf(base, viewer),
					user: viewer?.user ?? users.get(login),
					viewer,
				});
			}
		} else {
			for (const message of this.channel.chat.messages) {
				if (!message.isUser() || message.source.id !== this.channel.id) continue;

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
}
