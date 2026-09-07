import { initGraphQLTada } from "gql.tada";
import type { FragmentOf, ResultOf } from "gql.tada";

import type { Fragment, StructuredMessage } from "$lib/twitch/api";
import type { Poll as ApiPoll, Prediction as ApiPrediction } from "$lib/twitch/pubsub";

import type { NonNullableDeep } from ".";

const gql = initGraphQLTada<{
	disableMasking: true;
	introspection: import("./twitch-env").introspection;
	scalars: {
		Time: string;
		Cursor: string;
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

const predictionActorIdFragment = gql(`
	fragment PredictionActorId on PredictionEventActor {
		... on User {
			id
		}
		... on ExtensionClient {
			id
		}
	}
`);

const predictionDetailsFragment = gql(
	`
	fragment PredictionDetails on PredictionEvent {
		id
		title
		status
		createdAt
		createdBy {
			... PredictionActorId
		}
		endedAt
		endedBy {
			... PredictionActorId
		}
		lockedAt
		lockedBy {
			... PredictionActorId
		}
		outcomes {
			id
			title
			total_points: totalPoints
			total_users: totalUsers
		}
		predictionWindowSeconds
	}
`,
	[predictionActorIdFragment],
);

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

export const emoteSetsQuery = gql(`
	query GetEmoteSets($id: ID!) {
		user(id: $id) {
			emoteSets {
				id
				owner {
					id
					displayName
					avatarUrl: profileImageURL(width: 300)
				}
				emotes {
					id
					text
				}
			}
		}
	}
`);

export const followsQuery = gql(
	`query GetFollows($id: ID!, $after: Cursor) {
		user(id: $id) {
			follows(first: 100, after: $after) {
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
					cursor
				}
				pageInfo {
					hasNextPage
				}
			}
		}
	}`,
	[userDetailsFragment, guestStarDetailsFragment, streamDetailsFragment],
);

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

export const moderatesQuery = gql(`
	query GetModerates($after: Cursor) {
		moderatedChannels(first: 100, after: $after) {
			edges {
				node {
					id
				}
			}
		}
	}
`);

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
	`query GetPinnedMessage($id: ID!) {
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
					choice_id: id
					title
					total_voters: totalVoters
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

export const predictionQuery = gql(
	`query GetPrediction($id: ID!) {
		channel(id: $id) {
			active: activePredictionEvents {
				...PredictionDetails
			}
			locked: lockedPredictionEvents {
				...PredictionDetails
			}
		}
	}`,
	[predictionDetailsFragment],
);

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
								stream {
									title
								}
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

export const streamsQuery = gql(
	`query GetStreams($ids: [ID!]!) {
		users(ids: $ids) {
			id
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

export const userAvatarsQuery = gql(`
	query GetUserAvatars($ids: [ID!]!) {
		users(ids: $ids) {
			id
			profileImageURL(width: 50)
		}
	}
`);

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

export const followedChannelsQuery = gql(
	`query GetFollowedChannels($ids: [ID!]!) {
		users(ids: $ids) {
			...UserDetails
			channel {
				...GuestStarDetails
			}
			stream {
				...StreamDetails
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

// Mutations

export const allowHeldMessageMutation = gql(`
	mutation AllowHeldMessage($message: ID!) {
		heldMessage: allowRejectedChatMessage(input: { id: $message }) {
			message {
				id
			}
		}
	}
`);

export const banUserMutation = gql(`
	mutation BanUser($channel: ID!, $target: String!, $duration: String, $reason: String) {
		banUserFromChatRoom(input: {
			channelID: $channel,
			bannedUserLogin: $target,
			expiresIn: $duration,
			reason: $reason
		}) {
			__typename
		}
	}
`);

export const blockTermMutation = gql(`
	mutation BlockTerm($channel: ID!, $term: String!) {
		addChannelBlockedTerm(input: {
			channelID: $channel,
			phrase: $term,
			phrases: [$term],
			isModEditable: true
		}) {
			__typename
		}
	}
`);

export const blockUserMutation = gql(`
	mutation BlockUser($target: ID!) {
		blockUser(input: { targetUserID: $target }) {
			__typename
		}
	}
`);

export const cancelPredictionMutation = gql(`
	mutation CancelPrediction($prediction: ID!) {
		cancelPredictionEvent(input: { id: $prediction }) {
			__typename
		}
	}
`);

export const cancelRaidMutation = gql(`
	mutation CancelRaid($channel: ID!) {
		cancelRaid(input: { sourceID: $channel }) {
			__typename
		}
	}
`);

// export const clearChatMutation = gql(`
// 	mutation ClearChat($channel: ID!) {
// 		clearChat(input: { channelID: $channel }) {
// 			__typename
// 		}
// 	}
// `);

export const deleteMessageMutation = gql(`
	mutation DeleteMessage($channel: ID!, $message: ID!) {
		deleteChatMessage(input: { channelID: $channel, messageID: $message }) {
			__typename
		}
	}
`);

export const denyHeldMessageMutation = gql(`
	mutation DenyHeldMessage($message: ID!) {
		heldMessage: denyRejectedChatMessage(input: { id: $message }) {
			message {
				id
			}
		}
	}
`);

export const grantVipMutation = gql(`
	mutation GrantVIP($channel: ID!, $target: ID!) {
		grantVIP(input: { channelID: $channel, granteeID: $target }) {
			__typename
		}
	}
`);

export const lockPredictionMutation = gql(`
	mutation LockPrediction($prediction: ID!) {
		lockPredictionEvent(input: { id: $prediction }) {
			__typename
		}
	}
`);

export const modUserMutation = gql(`
	mutation ModUser($channel: ID!, $target: ID!) {
		modUser(input: { channelID: $channel, targetID: $target }) {
			__typename
		}
	}
`);

export const pinMessageMutation = gql(`
	mutation PinMessage($channel: ID!, $message: ID!, $duration: Int = 1200) {
		pinChatMessage(input: { channelID: $channel, messageID: $message, durationSeconds: $duration, type: MOD }) {
			__typename
		}
	}
`);

export const resolvePredictionMutation = gql(`
	mutation ResolvePrediction($prediction: ID!, $outcome: ID!) {
		resolvePredictionEvent(input: { eventID: $prediction, outcomeID: $outcome }) {
			__typename
		}
	}
`);

export const revokeVipMutation = gql(`
	mutation RevokeVIP($channel: ID!, $target: ID!) {
		revokeVIP(input: { channelID: $channel, revokeeID: $target }) {
			__typename
		}
	}
`);

export const sendAnnouncementMutation = gql(`
	mutation SendAnnouncement($channel: ID!, $message: String!) {
		sendAnnouncementMessage(input: { channelID: $channel, message: $message, color: PRIMARY }) {
			__typename
		}
	}
`);

export const sendMessageMutation = gql(`
	mutation SendMessage($input: SendChatMessageInput!) {
		sent: sendChatMessage(input: $input) {
			dropReason
			message {
				id
			}
		}
	}
`);

export const sendPinnedMessageMutation = gql(`
	mutation SendPinnedMessage($channel: ID!, $message: String!) {
		sendPinnedChatMessage(input: { channelID: $channel, messageText: $message }) {
			__typename
		}
	}
`);

export const sendWhisperMutation = gql(`
	mutation SendWhisper($input: SendWhisperInput!) {
		sendWhisper(input: $input) {
			__typename
		}
	}
`);

export const shieldModeMutation = gql(`
	mutation SetShieldMode($channel: ID!, $mode: ShieldModeStatus!) {
		setChannelShieldModeStatus(input: { channelID: $channel, shieldModeStatus: $mode }) {
			__typename
		}
	}
`);

export const shoutoutMutation = gql(`
	mutation Shoutout($source: String!, $target: String!) {
		createShoutout(input: { channelLogin: $source, callerLogin: $source, targetLogin: $target }) {
			__typename
		}
	}
`);

export const startPollMutation = gql(`
	mutation StartPoll($input: CreatePollInput!) {
		createPoll(input: $input) {
			__typename
		}
	}
`);

export const startPredictionMutation = gql(`
	mutation StartPrediction($input: CreatePredictionEventInput!) {
		createPredictionEvent(input: $input) {
			__typename
		}
	}
`);

export const startRaidMutation = gql(`
	mutation StartRaid($source: ID!, $target: ID!) {
		createRaid(input: { sourceID: $source, targetID: $target }) {
			__typename
		}
	}
`);

export const terminatePollMutation = gql(`
	mutation TerminatePoll($poll: ID!) {
		terminatePoll(input: { pollID: $poll }) {
			__typename
		}
	}
`);

export const unbanUserMutation = gql(`
	mutation UnbanUser($channel: ID!, $target: String!) {
		unbanUserFromChatRoom(input: {
			channelID: $channel,
			bannedUserLogin: $target
		}) {
			__typename
		}
	}
`);

export const unblockUserMutation = gql(`
	mutation UnblockUser($target: ID!) {
		unblockUser(input: { targetUserID: $target }) {
			__typename
		}
	}
`);

export const unmodUserMutation = gql(`
	mutation UnmodUser($channel: ID!, $target: ID!) {
		unmodUser(input: { channelID: $channel, targetID: $target }) {
			__typename
		}
	}
`);

export const unpinMessageMutation = gql(`
	mutation UnpinMessage($message: ID!) {
		unpinChatMessage(input: { id: $message, reason: UNPIN }) {
			__typename
		}
	}
`);

export const updateChatSettingsMutation = gql(`
	mutation UpdateChatSettings($input: UpdateChatSettingsInput!) {
		updateChatSettings(input: $input) {
			__typename
		}
	}
`);

export const updateChatSubOnlyMode = gql(`
	mutation UpdateChatSubOnlyMode($channel: ID!, $subOnly: Boolean!) {
		updateSubscriptionProduct(input: { id: $channel, targetUserID: $channel, hasSubOnlyChat: $subOnly }) {
			__typename
		}
	}
`);

export const updatePinnedMessageMutation = gql(`
	mutation UpdatePinnedMessage($message: ID!, $duration: Int) {
		updatePinnedChatMessage(input: { id: $message, durationSeconds: $duration }) {
			__typename
		}
	}
`);

export const warnUserMutation = gql(`
	mutation WarnUser($channel: ID!, $target: ID!, $reason: String!) {
		warnUserInChatRoom(input: { channelID: $channel, targetUserID: $target, reason: $reason, chatRulesCited: [""] }) {
			__typename
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

type Prediction = FragmentOf<typeof predictionDetailsFragment>;

export type PredictionOutcome = ReturnType<
	typeof gql.scalar<"CreatePredictionEventInput">
>["outcomes"][number];

// Transformers

export function toPubSubPoll(channel: string, poll: Poll): ApiPoll {
	return {
		poll_id: poll.id,
		choices: poll.choices,
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

export function toPubSubPrediction(channel: string, prediction: Prediction): ApiPrediction {
	return {
		channel_id: channel,
		id: prediction.id,
		title: prediction.title,
		created_at: prediction.createdAt,
		created_by: {
			type: prediction.createdBy?.__typename?.toUpperCase() ?? "",
			user_id: prediction.createdBy?.id,
		},
		ended_at: prediction.endedAt,
		ended_by: {
			user_id: prediction.endedBy?.id,
		},
		locked_at: prediction.lockedAt,
		locked_by: {
			user_id: prediction.lockedBy?.id,
		},
		outcomes: prediction.outcomes,
		status: prediction.status,
		prediction_window_seconds: prediction.predictionWindowSeconds,
		winning_outcome_id: null,
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
