export interface AutoModPosition {
	start_pos: number;
	end_pos: number;
}

export interface AutoModFailure {
	category: string;
	level: number;
	positions_in_message: AutoModPosition[] | null;
}

export interface BlockedTermFound {
	is_private: boolean;
	owner_channel_id: string;
	positions_in_message: AutoModPosition;
	term_id: string;
	text: string;
}

export interface BlockedTermFailure {
	contains_private_term: boolean;
	terms_found: BlockedTermFound[];
}

export type CaughtMessageReason = "AutoModCaughtMessageReason" | "BlockedTermCaughtMessageReason";

export interface AutoModFragment {
	text: string;
	automod?: {
		is_channel_blocked_term: boolean;
	};
	emoticon?: {
		emoticonID: string;
		emoticonSetID: string;
	};
}

export interface AutoModSender {
	user_id: string;
	login: string;
	display_name: string;
	chat_color: string;
	badges: { id: string; version: string }[];
}

export interface CaughtMessage {
	id: string;
	channel_id: string;
	channel_login: string;
	content: {
		text: string;
		fragments: AutoModFragment[];
	};
	sender: AutoModSender;
	sent_at: string;
}

export type CaughtMessageStatus = "PENDING" | "ALLOWED" | "DENIED";

export interface AutoModCaughtMessage {
	id: string;
	caught_message_reason: {
		automod_failure: AutoModFailure;
		blocked_term_failure: BlockedTermFailure;
		reason: CaughtMessageReason;
	};
	content_classification: {
		category: string;
		level: number;
	};
	message: CaughtMessage;
	reason_code: CaughtMessageReason;
	resolver_id: string;
	resolver_login: string;
	status: CaughtMessageStatus;
}

export interface CaughtMessageUpdate {
	message_id: string;
	status: CaughtMessageStatus;
}

export interface AutoModQueue {
	type: "automod_caught_message";
	data: AutoModCaughtMessage | CaughtMessageUpdate;
}

export interface BroadcastSettingsUpdate {
	channel: string;
	channel_id: string;
	old_status: string;
	status: string;
	old_game: string;
	game: string;
	old_game_id: number;
	game_id: number;
}

export interface ChannelPointReward {
	id: string;
	title: string;
	cost: number;
	background_color: string;
	is_user_input_required: boolean;
}

export interface ChannelPointRedemption {
	id: string;
	channel_id: string;
	redeemed_at: string;
	reward: ChannelPointReward;
	status: string;
	user: { id: string };
	user_input: string;
}

export interface CommunityPointsChannel {
	type: "reward-redeemed";
	data: {
		redemption: ChannelPointRedemption;
		timestamp: number;
	};
}

export interface UnbanRequestCreate {
	id: string;
	channel_id: string;
	created_at: string;
	requester_id: string;
	requester_login: string;
	requester_message: string;
	requester_profile_image: string;
}

export type UnbanRequestStatus = "APPROVED" | "DENIED";

export interface UnbanRequestUpdate {
	id: string;
	requester_id: string;
	requester_login: string;
	resolver_id: string;
	resolver_login: string;
	resolver_message: string;
	status: UnbanRequestStatus;
}

export type ChannelUnbanRequests =
	| { type: "create_unban_request"; data: UnbanRequestCreate }
	| { type: "update_unban_request"; data: UnbanRequestUpdate };

export interface ModerationActionBase {
	created_at: string;
	created_by: string;
	created_by_user_id: string;
	target_user_id: string;
	target_user_login: string;
	id?: string;
	msg_id?: string;
	channel_id?: string;
	channel_login?: string;
	originator_channel_id?: string;
	from_automod?: boolean;
}

export interface ChatModeAction extends ModerationActionBase {
	type: "chat_channel_moderation";
	moderation_action:
		| "clear"
		| "emoteonly"
		| "emoteonlyoff"
		| "followersoff"
		| "slowoff"
		| "subscribers"
		| "subscribersoff";
	args: null;
}

export interface ChatSlowAction extends ModerationActionBase {
	type: "chat_channel_moderation";
	moderation_action: "slow";
	args: [seconds: string];
}

export interface ChatFollowersAction extends ModerationActionBase {
	type: "chat_channel_moderation";
	moderation_action: "followers";
	args: [minutes: string];
}

export interface ChatTimeoutAction extends ModerationActionBase {
	type: "chat_login_moderation";
	moderation_action: "timeout";
	args: [login: string, seconds: string, reason: string];
}

export interface ChatUntimeoutAction extends ModerationActionBase {
	type: "chat_login_moderation";
	moderation_action: "untimeout";
	args: [login: string];
}

export interface ChatBanAction extends ModerationActionBase {
	type: "chat_login_moderation";
	moderation_action: "ban";
	args: [login: string, reason?: string];
}

export interface ChatUnbanAction extends ModerationActionBase {
	type: "chat_login_moderation";
	moderation_action: "unban";
	args: [login: string];
}

// Only sent when the action happens through IRC.
export interface ChatUnmodAction extends ModerationActionBase {
	type: "chat_login_moderation";
	moderation_action: "unmod";
	args: [login: string];
}

export interface ChatDeleteAction extends ModerationActionBase {
	type: "chat_login_moderation";
	moderation_action: "delete";
	args: [login: string, text: string, message_id: string];
}

export type ModerationAction =
	| ChatModeAction
	| ChatSlowAction
	| ChatFollowersAction
	| ChatTimeoutAction
	| ChatUntimeoutAction
	| ChatBanAction
	| ChatUnbanAction
	| ChatUnmodAction
	| ChatDeleteAction;

export interface ModeratorAdded {
	channel_id: string;
	moderation_action: "mod";
	target_user_id: string;
	target_user_login: string;
	created_by: string;
	created_by_user_id: string;
}

export interface VipAdded {
	channel_id: string;
	target_user_id: string;
	target_user_login: string;
	created_by: string;
	created_by_user_id: string;
}

export type ChatModeratorActions =
	| { type: "moderation_action"; data: ModerationAction }
	| { type: "moderator_added"; data: ModeratorAdded }
	| { type: "vip_added"; data: VipAdded };

export type LowTrustTreatment = "NO_TREATMENT" | "ACTIVE_MONITORING" | "RESTRICTED";

/** Twitch misspells the likely variant; both spellings are accepted. */
export type BanEvasionEvaluation = "UNLIKELY_EVADER" | "LIKELY_EVADER" | "LICKLEY_EVADER";

export type LowTrustUserType =
	| "MANUALLY_ADDED"
	| "DETECTED_BAN_EVADER"
	| "BANNED_IN_SHARED_CHANNEL";

export interface LowTrustUpdater {
	id: string;
	login: string;
	display_name: string;
}

export interface LowTrustTreatmentUpdate {
	low_trust_id: string;
	channel_id: string;
	updated_by: LowTrustUpdater;
	updated_at: string;
	target_user_id: string;
	target_user: string;
	treatment: LowTrustTreatment;
	types: LowTrustUserType[];
	ban_evasion_evaluation: BanEvasionEvaluation;
	evaluated_at: string;
}

export interface LowTrustUser {
	id: string;
	low_trust_id: string;
	channel_id: string;
	sender: {
		user_id: string;
		login: string;
		display_name: string;
		chat_color?: string;
	};
	evaluated_at: string;
	updated_at: string;
	ban_evasion_evaluation: BanEvasionEvaluation;
	shared_ban_channel_ids: string[] | null;
	treatment: LowTrustTreatment;
	types: LowTrustUserType[];
	updated_by: LowTrustUpdater;
}

export interface LowTrustFragment {
	text: string;
	emoticon?: {
		emoticonID: string;
		emoticonSetID: string;
	};
}

export interface LowTrustUserNewMessage {
	low_trust_user: LowTrustUser;
	message_content: {
		text: string;
		fragments: LowTrustFragment[];
	};
	message_id: string;
	sent_at: string;
}

export type LowTrustUsers =
	| { type: "low_trust_user_treatment_update"; data: LowTrustTreatmentUpdate }
	| { type: "low_trust_user_new_message"; data: LowTrustUserNewMessage };

// This is mainly used as a signal; most fields can be ignored
export interface PinnedChatUpdates {
	type: "pin-message" | "unpin-message" | "update-message";
	updated_at?: number;
}

export interface PollChoice {
	choice_id: string;
	title: string;
	total_voters: number;
}

export type PollStatus =
	| "UNKNOWN"
	| "ACTIVE"
	| "COMPLETED"
	| "TERMINATED"
	| "ARCHIVED"
	| "MODERATED";

export interface Poll {
	choices: PollChoice[];
	created_by: string;
	duration_seconds: number;
	ended_at: string | null;
	ended_by: string | null;
	owned_by: string;
	poll_id: string;
	started_at: string;
	status: PollStatus;
	title: string;
	total_voters: number;
}

export interface Polls {
	type: "POLL_CREATE" | "POLL_UPDATE" | "POLL_COMPLETE" | "POLL_TERMINATE";
	data: {
		poll: Poll;
	};
}

export interface PredictionOutcome {
	id: string;
	title: string;
	total_points: number;
	total_users: number;
}

export type PredictionStatus =
	| "ACTIVE"
	| "LOCKED"
	| "RESOLVE_PENDING"
	| "RESOLVED"
	| "CANCEL_PENDING"
	| "CANCELED";

export interface Prediction {
	id: string;
	title: string;
	channel_id: string;
	created_at: string;
	created_by: { type: string; user_id?: string };
	ended_at: string | null;
	ended_by: { user_id?: string } | null;
	locked_at: string | null;
	locked_by: { user_id?: string } | null;
	outcomes: PredictionOutcome[];
	status: PredictionStatus;
	prediction_window_seconds: number;
	winning_outcome_id: string | null;
}

export interface PredictionsChannel {
	type: "event-created" | "event-updated";
	data: {
		event: Prediction;
	};
}

export interface PredictionsUser {}

export interface VideoPlaybackById {
	type: "stream-up" | "viewcount" | "commercial" | "stream-down" | "tos-strike";
	server_time: number;
	viewers?: number;
	play_delay?: number;
	length?: number;
	scheduled?: boolean;
}

export interface PubSubTopicMap {
	"automod-queue": AutoModQueue;
	"broadcast-settings-update": BroadcastSettingsUpdate;
	"channel-unban-requests": ChannelUnbanRequests;
	"chat-moderator-actions": ChatModeratorActions;
	"community-points-channel-v1": CommunityPointsChannel;
	"low-trust-users": LowTrustUsers;
	"pinned-chat-updates-v1": PinnedChatUpdates;
	"predictions-channel-v1": PredictionsChannel;
	polls: Polls;
	"predictions-user-v1": PredictionsUser;
	"video-playback-by-id": VideoPlaybackById;
}

export type PubSubMessage<K extends keyof PubSubTopicMap> = PubSubTopicMap[K] & {
	target_id: string;
};

export type PubSubTopic = {
	[K in keyof PubSubTopicMap]: {
		topic: K;
		message: PubSubMessage<K>;
	};
}[keyof PubSubTopicMap];
