// oxlint-disable typescript/no-unsafe-type-assertion
// oxlint-disable no-await-in-loop

import type { TadaDocumentNode } from "gql.tada";
import { print } from "graphql-web-lite";
import { FetchError, ofetch } from "ofetch";

import { ApiError } from "$lib/errors/api-error";
import {
	type Connection,
	type GqlResponse,
	nodes,
	TWITCH_CLIENT_ID,
	TWITCH_GQL_URL,
} from "$lib/graphql";
import { streamsQuery } from "$lib/graphql/twitch";
import { log } from "$lib/log";
import { UserManager } from "$lib/managers/user-manager";
import { Stream } from "$lib/models/stream.svelte";
import { dedupe } from "$lib/util";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

interface FetchOptions {
	params?: QueryParams;
	body?: Record<string, unknown>;
	timeout?: number;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

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

const HELIX_URL = "https://api.twitch.tv/helix";

const MAX_RETRIES = 2;
const MAX_RATE_LIMIT_WAIT = 10_000;

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function cleanQuery(params: QueryParams): QueryParams {
	const cleaned: QueryParams = {};

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			const items = value.filter((v) => v !== undefined && v !== null);
			if (items.length) cleaned[key] = items;
		} else {
			cleaned[key] = value;
		}
	}

	return cleaned;
}

export class TwitchClient {
	public static readonly DEFAULT_TIMEOUT = 15_000;

	// This should only be null between the time of app start up and settings
	// synchronization because of browser restrictions; however, any subsequent
	// API calls SHOULD have a valid token as it's set at first layout load.
	public token: string | null = null;

	public readonly users = new UserManager(this);

	public async gql<T, U>(query: TadaDocumentNode<T, U>, variables?: U): Promise<T> {
		if (!this.token) {
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
					headers: {
						Authorization: `OAuth ${this.token}`,
						"Client-Id": TWITCH_CLIENT_ID,
					},
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

	/** @deprecated REST call — migrate to GraphQL. */
	public get<T>(path: `/${string}`, params?: QueryParams) {
		return this.#request<T>("GET", path, { params });
	}

	/** @deprecated REST call — migrate to GraphQL (see {@link paginate}). */
	public async getAll<T>(path: `/${string}`, params?: QueryParams): Promise<T[]> {
		const results: T[] = [];
		let after: string | undefined;

		do {
			const { data, pagination } = await this.get<T[]>(path, { ...params, after });

			results.push(...data);
			after = pagination?.cursor || undefined;
		} while (after);

		return results;
	}

	/** @deprecated REST call — migrate to a GraphQL mutation. */
	public post<T>(path: `/${string}`, options?: FetchOptions) {
		return this.#request<T>("POST", path, options);
	}

	/** @deprecated REST call — migrate to a GraphQL mutation. */
	public put<T>(path: `/${string}`, options?: FetchOptions) {
		return this.#request<T>("PUT", path, options);
	}

	/** @deprecated REST call — migrate to a GraphQL mutation. */
	public patch<T>(path: `/${string}`, options?: FetchOptions) {
		return this.#request<T>("PATCH", path, options);
	}

	/** @deprecated REST call — migrate to a GraphQL mutation. */
	public delete<T = null>(path: `/${string}`, params?: QueryParams) {
		return this.#request<T>("DELETE", path, { params });
	}

	async #request<T>(
		method: HttpMethod,
		path: `/${string}`,
		options: FetchOptions = {},
	): Promise<HelixResponse<T>> {
		if (!this.token) {
			throw new ApiError(401, "OAuth token is not set");
		}

		const query = options.params ? cleanQuery(options.params) : undefined;
		const timeout = options.timeout ?? TwitchClient.DEFAULT_TIMEOUT;

		const send = () => this.#send<T>(method, path, query, options.body, timeout);

		if (method === "GET") {
			return dedupe(`GET:${path}:${JSON.stringify(query ?? {})}`, send);
		}

		return send();
	}

	async #send<T>(
		method: HttpMethod,
		path: `/${string}`,
		query: QueryParams | undefined,
		body: Record<string, unknown> | undefined,
		timeout: number,
	): Promise<HelixResponse<T>> {
		for (let attempt = 0; ; attempt++) {
			try {
				const response = await ofetch.raw<HelixResponse<T>>(path, {
					baseURL: HELIX_URL,
					method,
					query,
					headers: {
						Authorization: `Bearer ${this.token}`,
						"Client-Id": TWITCH_CLIENT_ID,
					},
					body,
					signal: AbortSignal.timeout(timeout),
					retry: false,
				});

				// oxlint-disable-next-line no-underscore-dangle
				return response._data ?? { data: null as T };
			} catch (error) {
				const status = error instanceof FetchError ? error.status : undefined;

				// The token can't be refreshed, so a rejection means it was
				// revoked or expired; re-authenticate and surface the failure.
				// if (status === 401) {
				// 	this.#handleRevoked();
				// 	throw ApiError.from(error);
				// }

				const wait =
					status !== undefined && RETRYABLE_STATUSES.has(status) && attempt < MAX_RETRIES
						? this.#retryDelay(status, (error as FetchError).response, attempt)
						: null;

				if (wait !== null) {
					void log
						.warn(
							`Twitch ${method} ${path} → ${status}, retrying in ${wait}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
						)
						.catch(() => {});

					await sleep(wait);
					continue;
				}

				const apiError = ApiError.from(error);
				void log
					.error(
						`Twitch ${method} ${path} failed: ${apiError.status} ${apiError.message}`,
					)
					.catch(() => {});

				throw apiError;
			}
		}
	}

	#retryDelay(status: number, response: Response | undefined, attempt: number): number | null {
		if (status === 429) {
			const reset = Number(response?.headers.get("Ratelimit-Reset"));
			if (!reset) return 0;

			const wait = reset * 1000 - Date.now();
			// Far-future reset -> clock skew; fail fast rather than block
			if (wait > MAX_RATE_LIMIT_WAIT) return null;

			return Math.max(0, wait);
		}

		// Short exponential backoff for transient 5xx
		return 300 * 2 ** attempt;
	}

	/**
	 * Kicks off re-authentication after Twitch rejects the token. Fire-and-forget
	 * so the triggering request can still reject; {@link reauthenticate} guards
	 * against the concurrent calls a burst of failed requests would produce.
	 *
	 * Imported lazily to avoid a static import cycle with the auth module.
	 */
	// #handleRevoked() {
	// 	void import("./auth")
	// 		.then(({ reauthenticate }) => reauthenticate())
	// 		.catch((error: unknown) => {
	// 			void log.error(`Failed to re-authenticate: ${String(error)}`).catch(() => {});
	// 		});
	// }
}
