// oxlint-disable typescript/no-unnecessary-type-parameters

import { ApiError } from "$lib/errors/api-error";
import { sendTwitch as send } from "$lib/graphql";
import { UserManager } from "$lib/managers/user-manager";
import { Stream } from "$lib/models/stream.svelte";
import { dedupe } from "$lib/util";
import type { Stream as HelixStream } from "./api";

type QueryParams = Record<string, string | number | (string | number)[]>;

interface FetchOptions {
	params?: QueryParams;
	body?: Record<string, any>;
}

export class TwitchClient {
	public static readonly CLIENT_ID = "2z7vk7rabefjdhey6m5cxfxsbspw7c";
	public static readonly REDIRECT_URL = "http://localhost:55331/auth/callback";

	// This should only be null between the time of app start up and settings
	// synchronization because of browser restrictions; however, any subsequent
	// API calls SHOULD have a valid token as it's set at first layout load.
	public token: string | null = null;

	public readonly users = new UserManager(this);

	/**
	 * Retrieves the streams of the specified channels if they're live.
	 */
	public async fetchStreams(ids: string[]) {
		const response = await this.get<HelixStream[]>("/streams", { user_id: ids });
		const streams: Stream[] = [];

		for (const stream of response.data) {
			streams.push(
				new Stream(this, stream.user_id, {
					title: stream.title,
					game: {
						displayName: stream.game_name,
					},
					viewersCount: stream.viewer_count,
					createdAt: stream.started_at,
				}),
			);
		}

		await Promise.all(streams.map((s) => s.fetchGuests()));

		return streams;
	}

	// General HTTP helpers

	// GraphQL only
	public send = send;

	public get<T>(path: `/${string}`, params?: QueryParams) {
		return this.fetch<T>("GET", path, { params });
	}

	public post<T>(path: `/${string}`, options?: FetchOptions) {
		return this.fetch<T>("POST", path, options);
	}

	public put<T>(path: `/${string}`, options?: FetchOptions) {
		return this.fetch<T>("PUT", path, options);
	}

	public patch<T>(path: `/${string}`, options?: FetchOptions) {
		return this.fetch<T>("PATCH", path, options);
	}

	public delete(path: `/${string}`, params?: QueryParams) {
		return this.fetch<never>("DELETE", path, { params });
	}

	public async fetch<T>(
		method: string,
		path: string,
		options: FetchOptions = {},
	): Promise<{ data: T }> {
		const url = new URL(`https://api.twitch.tv/helix${path}`);

		if (options.params) {
			for (const [key, value] of Object.entries(options.params)) {
				if (Array.isArray(value)) {
					for (const v of value) {
						url.searchParams.append(key, v.toString());
					}
				} else {
					url.searchParams.append(key, value.toString());
				}
			}
		}

		if (!this.token) {
			throw new ApiError(401, "OAuth token is not set");
		}

		const body = options.body ? JSON.stringify(options.body) : undefined;
		const key = `${method}:${url.toString()}:${body ?? "{}"}`;

		return dedupe(key, async () => {
			const response = await fetch(url, {
				method,
				headers: {
					Authorization: `Bearer ${this.token}`,
					"Client-Id": TwitchClient.CLIENT_ID,
					"Content-Type": "application/json",
				},
				body,
			});

			if (response.status === 204 || response.headers.get("Content-Length") === "0") {
				return { data: null! };
			}

			const data = await response.json();

			if (response.status >= 400 && response.status < 500) {
				throw new ApiError(response.status, data.message);
			}

			return data;
		});
	}
}
