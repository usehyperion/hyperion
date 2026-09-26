import type { TadaDocumentNode } from "gql.tada";
import { print } from "graphql-web-lite";
import { ofetch } from "ofetch";

import { ApiError } from "$lib/errors/api-error";
import { dedupe } from "$lib/util";

export const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
export const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
export const SEVENTV_GQL_URL = "https://7tv.io/v4/gql";

export type NonNullableDeep<T, P extends string> = P extends `${infer K}.${infer R}`
	? K extends keyof T
		? NonNullableDeep<NonNullable<T[K]>, R>
		: K extends `${number}`
			? T extends (infer U)[]
				? NonNullableDeep<NonNullable<U>, R>
				: never
			: never
	: P extends keyof T
		? NonNullable<T[P]>
		: never;

export type GqlResponse<T> =
	| {
			data: T;
			errors?: never;
	  }
	| {
			data?: never;
			errors: { message: string }[];
	  };

export interface Edge<T> {
	node?: T | null;
	cursor?: string | null;
}

export interface Connection<T> {
	edges?: readonly (Edge<T> | null)[] | null;
	pageInfo?: { hasNextPage: boolean } | null;
}

export function nodes<T>(connection: Connection<T> | null | undefined): T[] {
	const result: T[] = [];

	for (const edge of connection?.edges ?? []) {
		if (edge?.node != null) result.push(edge.node);
	}

	return result;
}

export function sendTwitch<T, U>(query: TadaDocumentNode<T, U>, variables?: U) {
	return send(TWITCH_GQL_URL, query, variables);
}

export function send7tv<T, U>(query: TadaDocumentNode<T, U>, variables?: U) {
	return send(SEVENTV_GQL_URL, query, variables);
}

async function send<T, U>(url: string, query: TadaDocumentNode<T, U>, variables?: U) {
	// @ts-expect-error - outdated types
	const queryStr = print(query);
	const varStr = JSON.stringify(variables ?? {});

	return dedupe(`${url}:${queryStr}:${varStr}`, async () => {
		let response: GqlResponse<T>;

		try {
			response = await ofetch<GqlResponse<T>>(url, {
				method: "POST",
				headers: url === TWITCH_GQL_URL ? { "Client-Id": TWITCH_CLIENT_ID } : {},
				body: {
					query: queryStr,
					variables,
				},
				signal: AbortSignal.timeout(15_000),
			});
		} catch (error) {
			throw ApiError.from(error);
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
