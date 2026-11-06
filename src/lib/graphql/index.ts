// oxlint-disable typescript/no-unsafe-type-assertion
import type { TadaDocumentNode } from "gql.tada";
import { print } from "graphql-web-lite";

import { ApiError } from "#lib/errors/api-error.js";
import { MutationError } from "#lib/errors/mutation-error.js";
import { fetchJson } from "#lib/http.js";
import { dedupe } from "#lib/util.js";

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

function findMutationError(data: unknown): MutationError | null {
	if (!data || typeof data !== "object") return null;

	for (const [field, payload] of Object.entries(data)) {
		if (!payload || typeof payload !== "object" || !("error" in payload)) continue;

		const { error } = payload as { error: unknown };
		if (!error) continue;

		if (typeof error === "string") return new MutationError(error, field);

		const code =
			typeof error === "object" && "code" in error && typeof error.code === "string"
				? error.code
				: "UNKNOWN";

		return new MutationError(code, field);
	}

	return null;
}

function isQuery(document: TadaDocumentNode<any, any>) {
	return document.definitions.every(
		(definition) =>
			definition.kind !== "OperationDefinition" || definition.operation === "query",
	);
}

/**
 * Sends a GraphQL operation. Identical in-flight queries share one request;
 * mutations whose payload reports an `error` reject with a
 * {@linkcode MutationError}.
 */
export function request<T, U>(
	url: string,
	document: TadaDocumentNode<T, U>,
	variables?: U,
	headers?: () => Promise<HeadersInit>,
): Promise<T> {
	// @ts-expect-error - outdated types
	const query: string = print(document);
	const mutation = !isQuery(document);

	const send = async () => {
		const response = await fetchJson<GqlResponse<T>>(url, {
			method: "POST",
			headers: await headers?.(),
			body: { query, variables },
		});

		if (response.errors) {
			throw new AggregateError(
				response.errors.map((err) => new ApiError(400, err.message)),
				"GraphQL request failed",
			);
		}

		const mutationError = mutation && findMutationError(response.data);
		if (mutationError) throw mutationError;

		return response.data;
	};

	if (mutation) return send();

	return dedupe(`${url}:${query}:${JSON.stringify(variables ?? {})}`, send);
}
