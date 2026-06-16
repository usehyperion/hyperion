import type { TadaDocumentNode } from "gql.tada";
import { print } from "graphql-web-lite";
import { ofetch } from "ofetch";
import { ApiError } from "$lib/errors/api-error";
import { dedupe } from "$lib/util";

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

type GqlResponse<T> =
	| {
			data: T;
			errors?: never;
	  }
	| {
			data?: never;
			errors: { message: string }[];
	  };

export function sendTwitch<T, U>(query: TadaDocumentNode<T, U>, variables?: U) {
	return send("https://gql.twitch.tv/gql", query, variables);
}

export function send7tv<T, U>(query: TadaDocumentNode<T, U>, variables?: U) {
	return send("https://7tv.io/v4/gql", query, variables);
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
				headers: url.includes("twitch")
					? { "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko" }
					: {},
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
