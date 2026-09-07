// oxlint-disable typescript/no-unsafe-type-assertion
// oxlint-disable no-await-in-loop

import type { TadaDocumentNode } from "gql.tada";
import { print } from "graphql-web-lite";
import { ofetch } from "ofetch";

import { ApiError } from "$lib/errors/api-error";
import { type Connection, type GqlResponse, nodes, TWITCH_GQL_URL } from "$lib/graphql";
import { streamsQuery } from "$lib/graphql/twitch";
import { UserManager } from "$lib/managers/user-manager";
import { Stream } from "$lib/models/stream.svelte";
import { dedupe } from "$lib/util";

import type { Session } from "./session";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

interface FetchOptions {
	params?: QueryParams;
	body?: Record<string, unknown>;
	timeout?: number;
}

interface PageVariables {
	after?: string | null;
}

export interface HelixResponse<T> {
	data: T;
	pagination?: {
		cursor?: string;
	};
	total?: number;
}

export class TwitchClient {
	public static readonly DEFAULT_TIMEOUT = 15_000;

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

		// @ts-expect-error - outdated types
		const queryStr = print(query);
		const varStr = JSON.stringify(variables ?? {});

		return dedupe(`twitch:${queryStr}:${varStr}`, async () => {
			let response: GqlResponse<T>;

			try {
				response = await ofetch<GqlResponse<T>>(TWITCH_GQL_URL, {
					method: "POST",
					headers: await session.headers(),
					body: {
						query: queryStr,
						variables,
					},
					signal: AbortSignal.timeout(TwitchClient.DEFAULT_TIMEOUT),
				});
			} catch (error) {
				const apiError = ApiError.from(error);
				// if (apiError.status === 401) this.#handleRevoked();
				throw apiError;
			}

			if (response.errors) {
				throw new AggregateError(
					response.errors.map((err) => new ApiError(400, err.message)),
					"GraphQL request failed",
				);
			}

			return response.data;
		});
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

			streams.push(new Stream(this, user.id, stream));
		}

		await Promise.all(streams.map((s) => s.fetchGuests()));

		return streams;
	}

	/** @deprecated REST call — migrate to a GraphQL mutation. */
	public post<T>(_path: `/${string}`, _options?: FetchOptions): Promise<HelixResponse<T>> {
		throw new Error("replace me");
	}

	/** @deprecated REST call — migrate to a GraphQL mutation. */
	public delete<T = null>(_path: `/${string}`, _params?: QueryParams): Promise<HelixResponse<T>> {
		throw new Error("replace me");
	}
}
