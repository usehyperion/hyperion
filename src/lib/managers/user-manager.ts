import { SvelteMap } from "svelte/reactivity";
import { ApiError } from "$lib/errors/api-error";
import { ErrorMessage } from "$lib/errors/messages";
import { userAvatarsQuery, userQuery } from "$lib/graphql/twitch";
import { User } from "$lib/models/user.svelte";
import type { TwitchClient } from "$lib/twitch/client";
import { chunk } from "$lib/util";

export interface UserFetchOptions {
	by?: "id" | "login";
	force?: boolean;
}

export class UserManager extends SvelteMap<string, User> {
	// Ids with an avatar request currently in flight, so overlapping calls (e.g.
	// as suggestions rebuild on each keystroke) don't refetch the same users.
	readonly #avatarsInFlight = new Set<string>();

	public constructor(public readonly client: TwitchClient) {
		super();
	}

	public async fetch(idOrLogin: string, { by = "id", force = false }: UserFetchOptions = {}) {
		const variables = {
			id: null as string | null,
			login: null as string | null,
		};

		if (by === "id") {
			if (!force) {
				const cached = this.get(idOrLogin);
				if (cached) return cached;
			}

			variables.id = idOrLogin;
		} else {
			variables.login = idOrLogin;
		}

		const { user: data } = await this.client.gql(userQuery, variables);

		if (!data) {
			throw new ApiError(404, ErrorMessage.USER_NOT_FOUND(idOrLogin));
		}

		const user = new User(this.client, data);
		if (by === "id") this.set(idOrLogin, user);

		return user;
	}

	/**
	 * Populates {@link User.avatarUrl} for the given users in the background.
	 */
	public async fetchAvatars(users: User[]) {
		const pending = new Map<string, User>();

		for (const user of users) {
			if (user.avatarUrl || this.#avatarsInFlight.has(user.id)) continue;

			pending.set(user.id, user);
		}

		if (!pending.size) return;

		for (const id of pending.keys()) this.#avatarsInFlight.add(id);

		try {
			for (const ids of chunk([...pending.keys()], 100)) {
				// oxlint-disable-next-line no-await-in-loop - serial to avoid bursting the api
				const { users: data } = await this.client.gql(userAvatarsQuery, { ids });

				for (const entry of data ?? []) {
					const user = entry && pending.get(entry.id);
					if (user && entry.profileImageURL) user.avatarUrl = entry.profileImageURL;
				}
			}
		} finally {
			for (const id of pending.keys()) {
				this.#avatarsInFlight.delete(id);
			}
		}
	}

	public async block(id: string) {
		await this.client.put("/users/blocks", {
			params: {
				target_user_id: id,
			},
		});
	}

	public async unblock(id: string) {
		await this.client.delete("/users/blocks", {
			target_user_id: id,
		});
	}
}
