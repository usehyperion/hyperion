import { initGraphQLTada } from "gql.tada";
import type { FragmentOf, ResultOf, TadaDocumentNode } from "gql.tada";
import { print } from "graphql-web-lite";
import { ofetch } from "ofetch";

import { ApiError } from "#lib/errors/api-error.ts";
import { dedupe } from "#lib/util.ts";

import type { GqlResponse, NonNullableDeep } from ".";

const SEVENTV_GQL_URL = "https://7tv.io/v4/gql";

const gql = initGraphQLTada<{
	disableMasking: true;
	introspection: import("./7tv-env").introspection;
	scalars: {
		Id: string;
		DateTime: string;
	};
}>();

export function execute7tvQuery<T, U>(query: TadaDocumentNode<T, U>, variables?: U) {
	// @ts-expect-error - outdated types
	const queryStr = print(query);
	const varStr = JSON.stringify(variables ?? {});

	return dedupe(`${SEVENTV_GQL_URL}:${queryStr}:${varStr}`, async () => {
		let response: GqlResponse<T>;

		try {
			response = await ofetch<GqlResponse<T>>(SEVENTV_GQL_URL, {
				method: "POST",
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

// Fragments

const emoteDetailsFragment = gql(`
	fragment EmoteDetails on Emote {
		id
		defaultName
		images {
			mime
			width
			height
			scale
			url
		}
		flags {
			defaultZeroWidth
		}
	}
`);

const emoteSetDetailsFragment = gql(
	`fragment EmoteSetDetails on EmoteSet {
		id
		name
		emotes {
			items {
				alias
				emote {
					...EmoteDetails
				}
			}
		}
	}`,
	[emoteDetailsFragment],
);

export type Emote = FragmentOf<typeof emoteDetailsFragment>;

// Queries

export const activeEmoteSetQuery = gql(
	`query GetActiveEmoteSet($id: String!, $details: Boolean!) {
		users {
			userByConnection(platform: TWITCH, platformId: $id) {
				id
				style {
					activeEmoteSet {
						id
						...EmoteSetDetails @include(if: $details)
					}
				}
			}
		}
	}`,
	[emoteSetDetailsFragment],
);

export const emoteQuery = gql(
	`query GetEmote($id: Id!) {
		emotes {
			emote(id: $id) {
				...EmoteDetails
				flags {
					publicListed
				}
				owner {
					mainConnection {
						platformDisplayName
					}
				}
			}
		}
	}`,
	[emoteDetailsFragment],
);

export const globalEmoteSetQuery = gql(
	`query GetGlobalEmoteSet {
		emoteSets {
			global: emoteSet(id: "01HKQT8EWR000ESSWF3625XCS4") {
				...EmoteSetDetails
			}
		}
	}`,
	[emoteSetDetailsFragment],
);

export const userEmoteSetsQuery = gql(
	`query GetUserEmoteSets($id: String!) {
		users {
			userByConnection(platform: TWITCH, platformId: $id) {
				id
				personalEmoteSet {
					...EmoteSetDetails
				}
				specialEmoteSets {
					...EmoteSetDetails
				}
			}
		}
	}`,
	[emoteSetDetailsFragment],
);

// Types

export type ActiveEmoteSet<D = true> = Extract<
	NonNullableDeep<
		ResultOf<typeof activeEmoteSetQuery>,
		"users.userByConnection.style.activeEmoteSet"
	>,
	D extends true ? { name: string } : any
>;
