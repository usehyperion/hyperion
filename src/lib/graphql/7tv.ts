import { initGraphQLTada } from "gql.tada";
import type { FragmentOf, ResultOf } from "gql.tada";

import type { NonNullableDeep } from ".";

const gql = initGraphQLTada<{
	disableMasking: true;
	introspection: import("./7tv-env").introspection;
	scalars: {
		Id: string;
		DateTime: string;
	};
}>();

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

export const userIdQuery = gql(`
	query GetUserID($id: String!) {
		users {
			userByConnection(platform: TWITCH, platformId: $id) {
				id
			}
		}
	}
`);

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
