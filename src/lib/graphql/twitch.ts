import { initGraphQLTada } from "gql.tada";
import type { FragmentOf, ResultOf } from "gql.tada";
import type { NonNullableDeep } from ".";

const gql = initGraphQLTada<{
	disableMasking: true;
	introspection: import("./twitch-env").introspection;
	scalars: {
		Time: string;
	};
}>();

// Fragments

const badgeDetailsFragment = gql(`
	fragment BadgeDetails on Badge {
		setID
		version
		title
		description
		imageURL(size: QUADRUPLE)
	}
`);

const cheermoteDetailsFragment = gql(`
	fragment CheermoteDetails on Cheermote {
		id
		prefix
		tiers {
			id
			bits
			color
			images(theme: DARK, isAnimated: true) {
				id
				dpiScale
				url
			}
		}
	}
`);

const guestStarDetailsFragment = gql(`
	fragment GuestStarDetails on Channel {
		guestStarSessionCall {
			guests {
				user {
					id
					color: chatColor
					username: login
					displayName
					avatarUrl: profileImageURL(width: 150)
					stream {
						viewersCount
					}
				}
			}
		}
	}
`);

const streamDetailsFragment = gql(`
	fragment StreamDetails on Stream {
		title
		game {
			displayName
		}
		viewersCount
		createdAt
	}
`);

const userDetailsFragment = gql(`
	fragment UserDetails on User {
		id
		createdAt
		login
		displayName
		description
		chatColor
		profileImageURL(width: 300)
		bannerImageURL
		roles {
			isStaff
			isAffiliate
			isPartner
		}
	}
`);

// Queries

export const channelBadgesQuery = gql(
	`query GetChannelBadges($id: ID!) {
		user(id: $id) {
			broadcastBadges {
				...BadgeDetails
			}
		}
	}`,
	[badgeDetailsFragment],
);

export const cheermoteQuery = gql(
	`query GetCheermotes($id: ID!) {
		user(id: $id) {
			cheer {
				emotes(type: [FIRST_PARTY, THIRD_PARTY, CUSTOM]) {
					...CheermoteDetails
				}
			}
		}
	}`,
	[cheermoteDetailsFragment],
);

export const clipQuery = gql(`
	query GetClip($slug: ID!) {
		clip(slug: $slug) {
			createdAt
			title
			viewCount
			durationSeconds
			url
			thumbnailURL
			curator {
				displayName
			}
		}
	}
`);

export const foundersQuery = gql(`
	query GetFounders($id: ID!) {
		user(id: $id) {
			channel {
				founders {
					user {
						displayName
					}
				}
			}
		}
	}
`);

export const globalBadgesQuery = gql(
	`query GetGlobalBadges {
		badges {
			...BadgeDetails
		}
	}`,
	[badgeDetailsFragment],
);

export const guestsQuery = gql(
	`query GetGuests($id: ID!) {
		channel(id: $id) {
			...GuestStarDetails
		}
	}`,
	[guestStarDetailsFragment],
);

export const modsQuery = gql(`
	query GetMods($id: ID!) {
		user(id: $id) {
			mods(first: 100) {
				edges {
					node {
						displayName
					}
				}
			}
		}
	}
`);

export const searchSuggestionsQuery = gql(`
	query GetSearchSuggestions($query: String!) {
		searchSuggestions(queryFragment: $query, withOfflineChannelContent: true) {
			edges {
				node {
					text
					content {
						__typename
						... on SearchSuggestionChannel {
							id
							isLive
							profileImageURL(width: 50)
							user {
								displayName
							}
						}
					}
				}
			}
		}
	}
`);

export const streamQuery = gql(
	`query GetStream($id: ID!) {
		user(id: $id) {
			stream {
				...StreamDetails
			}
		}
	}`,
	[streamDetailsFragment],
);

export const userQuery = gql(
	`query GetUser($id: ID, $login: String) {
		user(id: $id, login: $login) {
			...UserDetails
		}
	}`,
	[userDetailsFragment],
);

export const userBadgesQuery = gql(
	`query GetUserBadges($user: String!, $channel: String!) {
		channelViewer(userLogin: $user, channelLogin: $channel) {
			earnedBadges {
				...BadgeDetails
			}
		}
	}`,
	[badgeDetailsFragment],
);

export const userFollowingQuery = gql(
	`query GetUserFollowing($id: ID!) {
		user(id: $id) {
			follows(first: 100) {
				edges {
					node {
						...UserDetails
						channel {
							...GuestStarDetails
						}
						stream {
							...StreamDetails
						}
					}
				}
			}
		}
	}`,
	[userDetailsFragment, guestStarDetailsFragment, streamDetailsFragment],
);

export const vipsQuery = gql(`
	query GetVIPs($id: ID!) {
		user(id: $id) {
			vips(first: 100) {
				edges {
					node {
						displayName
					}
				}
			}
		}
	}
`);

// Types

export type Badge = FragmentOf<typeof badgeDetailsFragment>;
export type Cheermote = FragmentOf<typeof cheermoteDetailsFragment>;
export type CheermoteTier = Cheermote["tiers"][number];
export type Stream = FragmentOf<typeof streamDetailsFragment>;
export type User = FragmentOf<typeof userDetailsFragment>;

export type ChannelSuggestion = Extract<
	NonNullableDeep<
		ResultOf<typeof searchSuggestionsQuery>,
		"searchSuggestions.edges.0.node.content"
	>,
	{ __typename: "SearchSuggestionChannel" }
>;
