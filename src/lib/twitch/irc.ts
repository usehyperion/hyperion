export interface ClearChatClear {
	type: "clear";
}

export interface ClearChatBan {
	type: "ban";
	user_login: string;
	user_id: string;
}

export interface ClearChatTimeout extends Omit<ClearChatBan, "type"> {
	type: "timeout";
	duration: { secs: number };
}

export type ClearChatAction = ClearChatClear | ClearChatBan | ClearChatTimeout;

export interface ClearChatMessage {
	type: "clearchat";
	channel_login: string;
	channel_id: string;
	action: ClearChatAction;
	is_recent: boolean;
	server_timestamp: number;
}

export interface ClearMsgMessage {
	type: "clearmsg";
	channel_login: string;
	sender_login: string;
	message_id: string;
	message_text: string;
	is_action: boolean;
	is_recent: boolean;
	server_timestamp: number;
}

export interface JoinMessage {
	type: "join";
	channel_login: string;
	user_login: string;
}

// Not going to bother implementing all of these
// https://git.kotmisia.pl/Mm2PL/docs/src/branch/master/irc_msg_ids.md
export type NoticeMessageId =
	| "emote_only_on"
	| "emote_only_off"
	| "followers_on"
	| "followers_on_zero"
	| "followers_off"
	| "msg_banned"
	| "msg_bad_characters"
	| "msg_channel_blocked"
	| "msg_channel_suspended"
	| "msg_duplicate"
	| "msg_emotesonly"
	| "msg_followersonly"
	| "msg_followersonly_followed"
	| "msg_followersonly_zero"
	| "msg_r9k"
	| "msg_ratelimit"
	| "msg_rejected"
	| "msg_rejected_mandatory"
	| "msg_requires_verified_phone_number"
	| "msg_slowmode"
	| "msg_subsonly"
	| "msg_suspended"
	| "msg_timedout"
	| "msg_verified_email"
	| "r9k_on"
	| "r9k_off"
	| "slow_on"
	| "slow_off"
	| "subs_on"
	| "subs_off"
	| "tos_ban"
	| "unrecognized_cmd"
	| ({} & string);

export interface NoticeMessage {
	type: "notice";
	channel_login: string;
	message_text: string;
	message_id: NoticeMessageId;
	deleted: boolean;
	is_recent: boolean;
	recent_timestamp: number | null;
}

export interface PartMessage {
	type: "part";
	channel_login: string;
	user_login: string;
}

export interface BasicUser {
	id: string;
	login: string;
	name: string;
}

export interface Badge {
	name: string;
	version: string;
}

export interface Range {
	start: number;
	end: number;
}

export interface Emote {
	id: string;
	range: Range;
	code: string;
}

export interface BaseMessage {
	message_id: string;
	sender: BasicUser;
	badges: Badge[];
	name_color: string;
	emotes: Emote[];
}

export interface BaseUserMessage extends BaseMessage {
	channel_login: string;
	channel_id: string;
	badge_info: Badge[];
	deleted: boolean;
	is_recent: boolean;
	source_only: boolean | null;
	source: Source | null;
	server_timestamp: number;
}

export interface ReplyParent {
	message_id: string;
	message_text: string;
	user: BasicUser;
}

export interface ReplyThread {
	message_id: string;
	user_login: string;
}

export interface Reply {
	parent: ReplyParent;
	thread: ReplyThread;
}

export interface Source {
	message_id: string;
	event_id: string | null;
	channel_id: string;
	badges: Badge[];
	badge_info: Badge[];
}

export interface PrivmsgMessage extends BaseUserMessage {
	type: "privmsg";
	message_text: string;
	reply: Reply | null;
	is_action: boolean;
	is_first_msg: boolean;
	is_returning_chatter: boolean;
	is_highlighted: boolean;
	is_mod: boolean;
	is_subscriber: boolean;
	bits: number | null;
	custom_reward_id: string | null;
}

export interface RoomStateMessage {
	type: "roomstate";
	channel_login: string;
	channel_id: string;
	emote_only: boolean | null;
	followers_only: number | null;
	unique_mode: boolean | null;
	slow_mode: number | null;
	subscribers_only: boolean | null;
	is_recent: boolean;
}

export interface SubGiftPromo {
	total_gifts: number;
	promo_name: string;
}

export interface AnnouncementEvent {
	type: "announcement";
	color: string;
}

export interface StandardPayForwardEvent {
	type: "standard_pay_forward";
	is_prior_gifter_anonymous: boolean;
	prior_gifter: BasicUser;
	recipient: BasicUser;
}

export interface CommunityPayForwardEvent {
	type: "community_pay_forward";
	gifter: BasicUser;
}

export interface CharityDonationEvent {
	type: "charity_donation";
	charity_name: string;
	donation_amount: number;
	donation_currency: string;
	exponent: number;
}

export interface SubOrResubEvent {
	type: "sub_or_resub";
	is_resub: boolean;
	cumulative_months: number;
	streak_months: number | null;
	multimonth_tenure: number | null;
	multimonth_duration: number | null;
	sub_plan: string;
	sub_plan_name: string;
}

export interface RaidEvent {
	type: "raid";
	viewer_count: number;
	profile_image_url: string;
}

export interface UnraidEvent {
	type: "unraid";
}

export interface SubGiftEvent {
	type: "sub_gift";
	is_sender_anonymous: boolean;
	cumulative_months: number;
	recipient: BasicUser;
	sub_plan: string;
	sub_plan_name: string;
	num_gifted_months: number;
	sender_total_months: number;
}

export interface SubMysteryGiftEvent {
	type: "sub_mystery_gift";
	mass_gift_count: number;
	sender_total_gifts: number | null;
	sub_plan: string;
}
export interface AnonSubMysteryGiftEvent {
	type: "anon_sub_mystery_gift";
	mass_gift_count: number;
	sub_plan: string;
}

export interface PrimePaidUpgradeEvent {
	type: "prime_paid_upgrade";
	sub_plan: string;
}

export interface GiftPaidUpgradeEvent {
	type: "gift_paid_upgrade";
	gifter_login: string;
	gifter_name: string;
	promotion: SubGiftPromo | null;
}

export interface AnonGiftPaidUpgradeEvent {
	type: "anon_gift_paid_upgrade";
	promotion: SubGiftPromo | null;
}

export interface RitualEvent {
	type: "ritual";
	ritual_name: string;
}

export interface BitsBadgeTierEvent {
	type: "bits_badge_tier";
	threshold: number;
}

export interface OneTapGiftRedeemedEvent {
	type: "one_tap_gift_redeemed";
	bits: number;
	gift_id: string;
}

export interface WatchStreakEvent {
	type: "watch_streak";
	streak: number;
	points: number;
}

export type UserNoticeEvent =
	| AnnouncementEvent
	| StandardPayForwardEvent
	| CommunityPayForwardEvent
	| CharityDonationEvent
	| SubOrResubEvent
	| RaidEvent
	| UnraidEvent
	| SubGiftEvent
	| SubMysteryGiftEvent
	| AnonSubMysteryGiftEvent
	| PrimePaidUpgradeEvent
	| GiftPaidUpgradeEvent
	| AnonGiftPaidUpgradeEvent
	| RitualEvent
	| BitsBadgeTierEvent
	| OneTapGiftRedeemedEvent
	| WatchStreakEvent;

export interface UserNoticeMessage extends BaseUserMessage {
	type: "usernotice";
	message_text: string | null;
	system_message: string;
	event: UserNoticeEvent;
	event_id: string;
}

export interface WhisperMessage extends BaseMessage {
	type: "whisper";
	recipient_login: string;
	message_text: string;
}

export type IrcMessage =
	| ClearChatMessage
	| ClearMsgMessage
	| JoinMessage
	| NoticeMessage
	| PartMessage
	| PrivmsgMessage
	| RoomStateMessage
	| UserNoticeMessage
	| WhisperMessage;

export type IrcMessageMap = {
	[K in IrcMessage["type"]]: Extract<IrcMessage, { type: K }>;
};
