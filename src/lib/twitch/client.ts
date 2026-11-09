// oxlint-disable no-await-in-loop, typescript/no-unsafe-type-assertion

import { invoke } from "@tauri-apps/api/core";
import type { TadaDocumentNode } from "gql.tada";

import type { Connection } from "#lib/graphql/index.js";

import { ApiError } from "#lib/errors/api-error.js";
import { nodes, request } from "#lib/graphql/index.js";
import { log } from "#lib/log.js";
import { UserManager } from "#lib/managers/user-manager.js";
import { dedupe } from "#lib/util/resource.js";

const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

interface Integrity {
	token: string;
	deviceId: string;
}

interface PageVariables {
	after?: string | null;
}

export class TwitchClient {
	/**
	 * The OAuth token of the signed in user; `null` while signed out.
	 */
	public token: string | null = null;

	public readonly users = new UserManager(this);

	public constructor(private readonly onRevoked: () => void) {}

	public async gql<T, U>(query: TadaDocumentNode<T, U>, variables?: U): Promise<T> {
		const token = this.token;

		if (!token) {
			throw new ApiError(401, "OAuth token is not set");
		}

		try {
			return await request("https://gql.twitch.tv/gql", query, variables, () =>
				this.#headers(token),
			);
		} catch (error) {
			if (error instanceof ApiError && error.status === 401 && this.token === token) {
				this.onRevoked();
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

	async #headers(token: string) {
		const headers = new Headers({
			Authorization: `OAuth ${token}`,
			"Client-Id": CLIENT_ID,
		});

		// The backend caches the token and backs off after failures.
		const integrity = await dedupe("twitch:integrity", () =>
			invoke<Integrity | null>("get_integrity"),
		).catch((error) => {
			log.error("Failed to get the integrity token", error);
			return null;
		});

		if (integrity) {
			headers.set("Client-Integrity", integrity.token);
			headers.set("X-Device-Id", integrity.deviceId);
		}

		return headers;
	}
}
