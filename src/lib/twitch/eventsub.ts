import type { Nullable, Prefix } from "$lib/util";
import type { BasicUser } from "./irc";

export type WithBasicUser = Prefix<BasicUser, "user">;

export type WithBroadcaster = Prefix<WithBasicUser, "broadcaster">;

export type WithModerator = Prefix<WithBasicUser, "moderator">;

export interface Boundary {
	start_pos: number;
	end_pos: number;
}

export interface AutoModMetadata {
	category: string;
	level: number;
	boundaries: Boundary[];
}

export interface BlockedTerm extends Prefix<WithBroadcaster, "owner"> {
	term_id: string;
	boundary: Boundary;
}

export interface BlockedTermMetadata {
	terms_found: BlockedTerm[];
}

export interface BaseAutoModMessageHold extends ChannelChatUserMessageHold {
	held_at: string;
}

export interface AutoModAutomated extends BaseAutoModMessageHold {
	reason: "automod";
	automod: AutoModMetadata;
}

export interface AutoModBlockedTerm extends BaseAutoModMessageHold {
	reason: "blocked_term";
	blocked_term: BlockedTermMetadata;
}

export type AutoModMessageHold = AutoModAutomated | AutoModBlockedTerm;

export type AutoModMessageStatus = "approved" | "denied" | "expired";

export type AutoModMessageUpdate = (AutoModAutomated | AutoModBlockedTerm) &
	WithModerator & {
		status: AutoModMessageStatus;
	};

export interface ChannelChatUserMessageHold extends WithBroadcaster, WithBasicUser {
	message_id: string;
	message: StructuredMessage;
}

export type ChannelChatUserMessageStatus = "approved" | "denied" | "invalid";

export interface ChannelChatUserMessageUpdate extends ChannelChatUserMessageHold {
	status: ChannelChatUserMessageStatus;
}

export interface BaseAction<A extends string> extends WithBroadcaster, WithModerator {
	action: A;
	source_broadcaster_user_id: string;
	source_broadcaster_user_login: string;
	source_broadcaster_user_name: string;
}

export interface AutoModTermsMetadata {
	action: "add" | "remove";
	list: "blocked" | "permitted";
	terms: string[];
	from_automod: boolean;
}

export interface BanMetadata extends WithBasicUser {
	reason: string | null;
}

export interface DeleteMetadata extends WithBasicUser {
	message_id: string;
	message_body: string;
}

export interface FollowersMetadata {
	follow_duration_minutes: number;
}

export interface RaidMetadata extends WithBasicUser {
	viewer_count: number;
}

export interface SlowMetadata {
	wait_time_seconds: number;
}

export interface TimeoutMetadata extends BanMetadata {
	expires_at: string;
}

export interface UnbanRequestMetadata extends WithBasicUser {
	is_approved: boolean;
	moderator_message: string;
}

export interface WarnMetadata extends WithBasicUser {
	reason: string | null;
	chat_rules_cited: string[] | null;
}

export interface AutoModTermsAction extends BaseAction<
	"add_blocked_term" | "add_permitted_term" | "remove_blocked_term" | "remove_permitted_term"
> {
	automod_terms: AutoModTermsMetadata;
}

export interface BanAction extends BaseAction<"ban"> {
	ban: BanMetadata;
}

export type ClearAction = BaseAction<"clear">;

export interface DeleteAction extends BaseAction<"delete"> {
	delete: DeleteMetadata;
}

export type EmoteOnlyAction = BaseAction<"emoteonly" | "emoteonlyoff">;

export interface FollowersAction extends BaseAction<"followers" | "followersoff"> {
	followers: FollowersMetadata | null;
}

export interface ModAction extends BaseAction<"mod"> {
	mod: WithBasicUser;
}

export interface RaidAction extends BaseAction<"raid"> {
	raid: RaidMetadata;
}

export interface SlowAction extends BaseAction<"slow" | "slowoff"> {
	slow: SlowMetadata | null;
}

export type SubscribersAction = BaseAction<"subscribers" | "subscribersoff">;

export interface TimeoutAction extends BaseAction<"timeout"> {
	timeout: TimeoutMetadata;
}

export interface UnbanAction extends BaseAction<"unban"> {
	unban: WithBasicUser;
}

export interface UnbanRequestAction extends BaseAction<
	"approve_unban_request" | "deny_unban_request"
> {
	unban_request: UnbanRequestMetadata;
}

export type UniqueAction = BaseAction<"uniquechat" | "uniquechatoff">;

export interface UnmodAction extends BaseAction<"unmod"> {
	unmod: WithBasicUser;
}

export interface UnraidAction extends BaseAction<"unraid"> {
	unraid: WithBasicUser;
}

export interface UntimeoutAction extends BaseAction<"untimeout"> {
	untimeout: WithBasicUser;
}

export interface UnvipAction extends BaseAction<"unvip"> {
	unvip: WithBasicUser;
}

export interface VipAction extends BaseAction<"vip"> {
	vip: WithBasicUser;
}

export interface WarnAction extends BaseAction<"warn"> {
	warn: WarnMetadata;
}

export interface SharedChatBanAction extends BaseAction<"shared_chat_ban"> {
	shared_chat_ban: BanMetadata;
}

export interface SharedChatDeleteAction extends BaseAction<"shared_chat_delete"> {
	shared_chat_delete: DeleteMetadata;
}

export interface SharedChatTimeoutAction extends BaseAction<"shared_chat_timeout"> {
	shared_chat_timeout: TimeoutMetadata;
}

export interface SharedChatUnbanAction extends BaseAction<"shared_chat_unban"> {
	shared_chat_unban: WithBasicUser;
}

export interface SharedChatUntimeoutAction extends BaseAction<"shared_chat_untimeout"> {
	shared_chat_untimeout: WithBasicUser;
}

export type SharedChatAction =
	| SharedChatBanAction
	| SharedChatDeleteAction
	| SharedChatTimeoutAction
	| SharedChatUnbanAction
	| SharedChatUntimeoutAction;

export type ChannelModerate =
	| AutoModTermsAction
	| BanAction
	| ClearAction
	| DeleteAction
	| EmoteOnlyAction
	| FollowersAction
	| ModAction
	| RaidAction
	| SlowAction
	| SubscribersAction
	| TimeoutAction
	| UnbanAction
	| UnbanRequestAction
	| UniqueAction
	| UnmodAction
	| UnraidAction
	| UntimeoutAction
	| UnvipAction
	| VipAction
	| WarnAction
	| SharedChatAction;

export interface ChannelSubscriptionEnd extends WithBroadcaster, WithBasicUser {
	tier: string;
	is_gift: boolean;
}

export type SuspiciousUserStatus = "no_treatment" | "active_monitoring" | "restricted";

export type SuspiciousUserType = "manually_added" | "ban_evader" | "banned_in_shared_channel";

export type BanEvasionEvaluation = "unknown" | "possible" | "likely";

export interface TextFragment {
	type: "text";
	text: string;
}

export interface CheermoteFragment {
	type: "cheermote";
	text: string;
	cheermote: {
		prefix: string;
		bits: number;
		tier: number;
	};
}

export interface EmoteFragment {
	type: "emote";
	text: string;
	emote: {
		id: string;
		emote_set_id: string;
	};
}

export type Fragment = TextFragment | CheermoteFragment | EmoteFragment;

export interface StructuredMessage {
	message_id: string;
	text: string;
	fragments: Fragment[];
}

export interface ChannelSuspiciousUserMessage extends WithBroadcaster, WithBasicUser {
	low_trust_status: SuspiciousUserStatus;
	shared_ban_channel_ids: string[] | null;
	types: SuspiciousUserType[];
	ban_evasion_evaluation: BanEvasionEvaluation;
	message: StructuredMessage;
}

export interface ChannelSuspiciousUserUpdate extends WithBroadcaster, WithModerator, WithBasicUser {
	low_trust_status: SuspiciousUserStatus;
}

export interface ChannelUnbanRequestCreate extends WithBroadcaster, WithBasicUser {
	id: string;
	text: string;
	created_at: string;
}

export interface ChannelUnbanRequestResolve
	extends WithBasicUser, WithBroadcaster, Nullable<WithModerator> {
	id: string;
	resolution_text: string | null;
	status: "approved" | "denied" | "cancelled";
}

export interface ChannelUpdate extends WithBroadcaster {
	title: string;
	language: string;
	category_id: string;
	category_name: string;
	content_classification_labels: string[];
}

export type ChannelWarningAcknowledge = WithBroadcaster & WithBasicUser;

export type StreamOffline = WithBroadcaster;

export interface StreamOnline extends WithBroadcaster {
	id: string;
	type: "live" | "playlist" | "premiere" | "rerun";
	started_at: string;
}

export interface SubscriptionEventMap {
	"automod.message.hold": AutoModMessageHold;
	"automod.message.update": AutoModMessageUpdate;
	"channel.channel_points_automatic_reward_redemption.add": unknown;
	"channel.channel_points_custom_reward_redemption.add": unknown;
	"channel.chat.user_message_hold": ChannelChatUserMessageHold;
	"channel.chat.user_message_update": ChannelChatUserMessageUpdate;
	"channel.moderate": ChannelModerate;
	"channel.poll.begin": unknown;
	"channel.poll.end": unknown;
	"channel.poll.progress": unknown;
	"channel.prediction.begin": unknown;
	"channel.prediction.end": unknown;
	"channel.prediction.lock": unknown;
	"channel.prediction.progress": unknown;
	"channel.subscription.end": ChannelSubscriptionEnd;
	"channel.suspicious_user.message": ChannelSuspiciousUserMessage;
	"channel.suspicious_user.update": ChannelSuspiciousUserUpdate;
	"channel.unban_request.create": ChannelUnbanRequestCreate;
	"channel.unban_request.resolve": ChannelUnbanRequestResolve;
	"channel.chat.update": ChannelUpdate;
	"channel.warning.acknowledge": ChannelWarningAcknowledge;
	"stream.offline": StreamOffline;
	"stream.online": StreamOnline;
}

export type SubscriptionEvent = SubscriptionEventMap[keyof SubscriptionEventMap];

export interface NotificationPayload {
	subscription: { type: string };
	event: SubscriptionEvent;
}
