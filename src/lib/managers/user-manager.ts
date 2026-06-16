import { SvelteMap } from "svelte/reactivity";
import { ApiError } from "$lib/errors/api-error";
import { ErrorMessage } from "$lib/errors/messages";
import { userQuery } from "$lib/graphql/twitch";
import { User } from "$lib/models/user.svelte";
import type { TwitchClient } from "$lib/twitch/client";

export interface UserFetchOptions {
	by?: "id" | "login";
	force?: boolean;
}

export class UserManager extends SvelteMap<string, User> {
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
