// oxlint-disable typescript/no-unsafe-type-assertion
// oxlint-disable no-await-in-loop

import type { TadaDocumentNode } from "gql.tada";

import type { Connection } from "#lib/graphql/index.js";

import { ApiError } from "#lib/errors/api-error.js";
import { nodes, request } from "#lib/graphql/index.js";
import { streamsQuery } from "#lib/graphql/twitch.js";
import { log } from "#lib/log.js";
import { UserManager } from "#lib/managers/user-manager.js";
import { Stream } from "#lib/models/stream.svelte.js";

import type { Session } from "./session";

import { expireSession } from "./auth";

interface PageVariables {
	after?: string | null;
}

export class TwitchClient {
	// This should only be null between the time of app start up and settings
	// synchronization because of browser restrictions; however, any subsequent
	// API calls SHOULD have a valid session as it's set at first layout load.
	public session: Session | null = null;

	public readonly users = new UserManager(this);

	public async gql<T, U>(query: TadaDocumentNode<T, U>, variables?: U): Promise<T> {
		const session = this.session;

		if (!session) {
			throw new ApiError(401, "OAuth token is not set");
		}

		try {
			return await request("https://gql.twitch.tv/gql", query, variables, () =>
				session.headers(),
			);
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				this.#handleRevoked();
			}

			throw error;
		}
	}

	public async paginate<T, U extends PageVariables, N>(
		query: TadaDocumentNode<T, U>,
		variables: Omit<U, "after">,
		select: (data: T) => Connection<N> | null | undefined,
	): Promise<N[]> {
		const results: N[] = [];
		let after: string | null = null;

		do {
			const data = await this.gql(query, { ...variables, after } as U);
			const connection = select(data);

			results.push(...nodes(connection));

			const edges = connection?.edges;

			after =
				connection?.pageInfo?.hasNextPage && edges?.length
					? (edges.at(-1)?.cursor ?? null)
					: null;
		} while (after);

		return results;
	}

	/**
	 * Retrieves the streams of the specified channels if they're live.
	 */
	public async fetchStreams(ids: string[]) {
		if (!ids.length) return [];

		const { users } = await this.gql(streamsQuery, { ids });
		const streams: Stream[] = [];

		for (const user of users ?? []) {
			const stream = user?.stream;
			if (!stream) continue;

			const instance = new Stream(this, user.id, stream);
			instance.setGuests(user.channel);

			streams.push(instance);
		}

		return streams;
	}

	#handleRevoked() {
		if (!this.session) return;

		void expireSession().catch(log.catch("Failed to end the revoked session"));
	}
}
