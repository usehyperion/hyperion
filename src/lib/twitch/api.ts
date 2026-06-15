export interface DropReason {
	code: string;
	message: string;
}

export interface SentMessage {
	message_id: string;
	is_sent: boolean;
	drop_reason?: DropReason;
}

export interface Stream {
	id: string;
	user_id: string;
	user_login: string;
	user_name: string;
	game_id: string;
	game_name: string;
	type: "live";
	title: string;
	tags: string[];
	viewer_count: number;
	started_at: string;
	language: string;
	thumbnail_url: string;
	is_mature: boolean;
}

export interface StreamMarker {
	id: string;
	created_at: string;
	position_seconds: number;
	description: string;
}

export type EmoteType =
	| "none"
	| "bitstier"
	| "follower"
	| "subscriptions"
	| "channelpoints"
	| "rewards"
	| "hypetrain"
	| "prime"
	| "turbo"
	| "smilies"
	| "globals"
	| "owl2019"
	| "twofactor"
	| "limitedtime";

export interface UserEmote {
	id: string;
	name: string;
	emote_type: EmoteType;
	emote_set_id: string;
	owner_id: string;
	format: ("animated" | "static")[];
	scale: string[];
	theme_mode: ("dark" | "light")[];
}

// Not a part of Twitch's API but related. Not all fields are included.

export interface SubscriptionTenure {
	months: number;
}

export interface SubscriptionMetadata {
	type: "prime" | "paid" | "gift";
	tier: string;
}

export interface SubscriptionAge {
	statusHidden: boolean;
	followedAt: string | null;
	cumulative: SubscriptionTenure | null;
	meta: SubscriptionMetadata | null;
}
