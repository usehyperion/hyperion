// oxlint-disable typescript/no-unsafe-type-assertion
// oxlint-disable no-await-in-loop

import { invoke } from "@tauri-apps/api/core";
import { FetchError, ofetch } from "ofetch";
import { ApiError } from "$lib/errors/api-error";
import { sendTwitch } from "$lib/graphql";
import { log } from "$lib/log";
import { UserManager } from "$lib/managers/user-manager";
import { Stream } from "$lib/models/stream.svelte";
import { dedupe } from "$lib/util";
import type { Stream as HelixStream } from "./api";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

interface FetchOptions {
	params?: QueryParams;
	body?: Record<string, unknown>;
	timeout?: number;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HelixResponse<T> {
	data: T;
}

const BASE_URL = "https://api.twitch.tv/helix";

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
	public static readonly CLIENT_ID = "2z7vk7rabefjdhey6m5cxfxsbspw7c";
	public static readonly REDIRECT_URL = "http://localhost:5173/api/auth/twitch/callback";
	public static readonly DEFAULT_TIMEOUT = 15_000;

	#refreshing: Promise<string | null> | null = null;

	// This should only be null between the time of app start up and settings
	// synchronization because of browser restrictions; however, any subsequent
	// API calls SHOULD have a valid token as it's set at first layout load.
	public token: string | null = null;

	public readonly users = new UserManager(this);

	public gql = sendTwitch;

	/**
	 * Retrieves the streams of the specified channels if they're live.
	 */
	public async fetchStreams(ids: string[]) {
		if (!ids.length) return [];

		const { data } = await this.get<HelixStream[]>("/streams", { user_id: ids });
		const streams = data.map(
			(stream) =>
				new Stream(this, stream.user_id, {
					title: stream.title,
					game: {
						displayName: stream.game_name,
					},
					viewersCount: stream.viewer_count,
					createdAt: stream.started_at,
				}),
		);

		await Promise.all(streams.map((s) => s.fetchGuests()));

		return streams;
	}

	public get<T>(path: `/${string}`, params?: QueryParams) {
		return this.#request<T>("GET", path, { params });
	}

	public post<T>(path: `/${string}`, options?: FetchOptions) {
		return this.#request<T>("POST", path, options);
	}

	public put<T>(path: `/${string}`, options?: FetchOptions) {
		return this.#request<T>("PUT", path, options);
	}

	public patch<T>(path: `/${string}`, options?: FetchOptions) {
		return this.#request<T>("PATCH", path, options);
	}

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
		let refreshed = false;

		for (let attempt = 0; ; attempt++) {
			try {
				const response = await ofetch.raw<HelixResponse<T>>(path, {
					baseURL: BASE_URL,
					method,
					query,
					headers: {
						Authorization: `Bearer ${this.token}`,
						"Client-Id": TwitchClient.CLIENT_ID,
					},
					body,
					signal: AbortSignal.timeout(timeout),
					retry: false,
				});

				// oxlint-disable-next-line no-underscore-dangle
				return response._data ?? { data: null as T };
			} catch (error) {
				const status = error instanceof FetchError ? error.status : undefined;

				if (status === 401 && !refreshed) {
					refreshed = true;
					const token = await this.#refresh();

					if (token) {
						attempt--;
						continue;
					}
				}

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

	async #refresh(): Promise<string | null> {
		this.#refreshing ??= invoke<string | null>("refresh_token")
			.then((token) => {
				this.token = token;
				return token;
			})
			.catch((error: unknown) => {
				void log.error(`Failed to refresh Twitch token: ${String(error)}`).catch(() => {});
				return null;
			});

		try {
			return await this.#refreshing;
		} finally {
			this.#refreshing = null;
		}
	}
}
