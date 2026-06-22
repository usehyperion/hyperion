import { initGraphQLTada } from "gql.tada";
import type { FragmentOf, ResultOf } from "gql.tada";
import type { Fragment, StructuredMessage } from "$lib/twitch/api";
import type { Poll as PubSubPoll } from "$lib/twitch/pubsub";
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

export const pinnedMessageQuery = gql(
	`
	query GetPinnedMessage($id: ID!) {
		channel(id: $id) {
			pinnedChatMessages {
				edges {
					node {
						startsAt
						endsAt
						updatedAt
						pinnedBy {
							id
						}
						pinnedMessage {
							id
							sentAt
							content {
								text
								fragments {
									text
									content {
										__typename
										... on CheermoteToken {
											bitsAmount
											prefix
											tier
										}
										... on Emote {
											emoteID: id
											setID
										}
										... on User {
											userID: id
											login
											displayName
										}
									}
								}
							}
							sender {
								user_id: id
								user_login: login
								user_name: displayName
								chatColor
								displayBadges(channelID: $id) {
									...BadgeDetails
								}
							}
						}
					}
				}
			}
		}
	}`,
	[badgeDetailsFragment],
);

export const pollQuery = gql(`
	query GetPoll($id: ID!) {
		user(id: $id) {
			viewablePoll {
				id
				title
				status
				createdBy {
					id
				}
				choices {
					id
					title
					totalVoters
				}
				startedAt
				endedAt
				endedBy {
					id
				}
				durationSeconds
				totalVoters
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

type MessageContent = NonNullableDeep<PinnedMessage, "pinnedMessage.content">;

type PinnedMessage = NonNullableDeep<
	ResultOf<typeof pinnedMessageQuery>,
	"channel.pinnedChatMessages.edges.0.node"
>;

type Poll = NonNullableDeep<ResultOf<typeof pollQuery>, "user.viewablePoll">;

// Transformers

export function toPubSubPoll(channel: string, poll: Poll): PubSubPoll {
	return {
		poll_id: poll.id,
		choices: poll.choices.map((c) => ({
			choice_id: c.id,
			title: c.title,
			total_voters: c.totalVoters,
		})),
		created_by: poll.createdBy!.id,
		duration_seconds: poll.durationSeconds,
		ended_at: poll.endedAt,
		ended_by: poll.endedBy?.id ?? null,
		owned_by: channel,
		started_at: poll.startedAt,
		status: poll.status,
		title: poll.title,
		total_voters: poll.totalVoters,
	};
}

export function toStructuredMessage(id: string, content: MessageContent): StructuredMessage {
	const fragments: Fragment[] = content.fragments.map((fragment) => {
		const text = fragment.text ?? "";
		const inner = fragment.content;

		switch (inner?.__typename) {
			case "Emote":
				return {
					type: "emote",
					text,
					emote: {
						id: inner.emoteID ?? "",
						emote_set_id: inner.setID ?? "",
					},
				};
			case "User":
				return {
					type: "mention",
					text,
					user_id: inner.userID,
					user_login: inner.login,
					user_name: inner.displayName,
				};
			case "CheermoteToken":
				return {
					type: "cheermote",
					text,
					cheermote: {
						prefix: inner.prefix,
						bits: inner.bitsAmount,
						tier: inner.tier,
					},
				};
			default:
				return { type: "text", text };
		}
	});

	return {
		message_id: id,
		text: content.text,
		fragments,
	};
}
