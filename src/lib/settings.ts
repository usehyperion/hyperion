import { RuneStore } from "@tauri-store/svelte";
import type { User } from "./graphql/twitch";

export type HighlightType =
	| "mention"
	| "new"
	| "returning"
	| "suspicious"
	| "broadcaster"
	| "moderator"
	| "subscriber"
	| "vip";

export interface HighlightConfig {
	enabled: boolean;
	color: string;
	style: "default" | "compact" | "background";
}

export interface KeywordHighlightConfig extends HighlightConfig {
	pattern: string;
	regex: boolean;
	wholeWord: boolean;
	matchCase: boolean;
}

interface StoredUser {
	id: string;
	token: string;
	data: User;
	moderating: string[];
}

export interface UserSettings {
	"appearance.theme": string;

	"splits.defaultOrientation": "horizontal" | "vertical";
	"splits.singleRestoreBehavior": "preserve" | "redirect" | "remove";
	"splits.closeBehavior": "preserve" | "remove";
	"splits.leaveOnClose": boolean;
	"splits.goToChannelAfterClose": boolean;

	"chat.hideScrollbar": boolean;
	"chat.newSeparator": boolean;
	"chat.embeds": boolean;
	"chat.usernames.localized": boolean;
	"chat.usernames.readable": boolean;
	"chat.usernames.randomColor": boolean;
	"chat.usernames.paint": boolean;
	"chat.usernames.mentionStyle": "none" | "colored" | "painted";
	"chat.emotes.ffz": boolean;
	"chat.emotes.bttv": boolean;
	"chat.emotes.seventv": boolean;
	"chat.emotes.padding": number;
	"chat.messages.duplicateBypass": boolean;
	"chat.messages.history.enabled": boolean;
	"chat.messages.history.limit": number;
	"chat.messages.history.separator": boolean;
	"chat.messages.timestamps.show": boolean;
	"chat.messages.timestamps.format": "auto" | "12" | "24" | "custom";
	"chat.messages.timestamps.customFormat": string;

	"highlights.enabled": boolean;
	"highlights.viewers": Record<HighlightType, HighlightConfig>;
	"highlights.keywords": KeywordHighlightConfig[];

	"advanced.singleConnection": boolean;
	"advanced.logs.level": "error" | "warn" | "info" | "debug" | "trace";
}

interface Settings extends UserSettings {
	[key: string]: any;

	// Internal
	user: StoredUser | null;
	lastJoined: string | null;
	pinned: string[];
}

export const defaultHighlightTypes: Record<HighlightType, HighlightConfig> = {
	mention: { enabled: true, color: "#adadb8", style: "background" },
	new: { enabled: true, color: "#ff75e6", style: "default" },
	returning: { enabled: true, color: "#00a3a3", style: "default" },
	suspicious: { enabled: true, color: "#ff8280", style: "default" },
	broadcaster: { enabled: false, color: "#fc3430", style: "default" },
	moderator: { enabled: false, color: "#00a865", style: "default" },
	subscriber: { enabled: false, color: "#528bff", style: "default" },
	vip: { enabled: false, color: "#db00b3", style: "default" },
};

export const defaults: Settings = {
	user: null,
	lastJoined: null,
	pinned: [],

	"appearance.theme": "",
	"splits.defaultOrientation": "horizontal",
	"splits.singleRestoreBehavior": "redirect",
	"splits.closeBehavior": "remove",
	"splits.leaveOnClose": true,
	"splits.goToChannelAfterClose": true,
	"chat.hideScrollbar": false,
	"chat.newSeparator": false,
	"chat.embeds": true,
	"chat.usernames.localized": true,
	"chat.usernames.readable": true,
	"chat.usernames.randomColor": false,
	"chat.usernames.paint": true,
	"chat.usernames.mentionStyle": "painted",
	"chat.emotes.ffz": true,
	"chat.emotes.bttv": true,
	"chat.emotes.seventv": true,
	"chat.emotes.padding": 0,
	"chat.messages.duplicateBypass": true,
	"chat.messages.history.enabled": true,
	"chat.messages.history.limit": 250,
	"chat.messages.history.separator": true,
	"chat.messages.timestamps.show": true,
	"chat.messages.timestamps.format": "auto",
	"chat.messages.timestamps.customFormat": "",
	"highlights.enabled": true,
	"highlights.viewers": { ...defaultHighlightTypes },
	"highlights.keywords": [],
	"advanced.singleConnection": false,
	"advanced.logs.level": "info",
};

export const settings = new RuneStore<Settings>("settings", defaults, { autoStart: true });
