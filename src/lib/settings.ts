import { RuneStore } from "@tauri-store/svelte";

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

export interface Settings {
	"appearance.theme": string;

	"splits.defaultOrientation": "horizontal" | "vertical";
	"splits.closeBehavior": "preserve" | "remove";
	"splits.leaveOnClose": boolean;
	"splits.goToChannelAfterClose": boolean;

	"chat.hideScrollbar": boolean;
	"chat.newSeparator": boolean;
	"chat.embeds": boolean;
	"chat.badges.ffz": boolean;
	"chat.badges.bttv": boolean;
	"chat.badges.seventv": boolean;
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
	"appearance.theme": "",
	"splits.defaultOrientation": "horizontal",
	"splits.closeBehavior": "remove",
	"splits.leaveOnClose": true,
	"splits.goToChannelAfterClose": true,
	"chat.hideScrollbar": false,
	"chat.newSeparator": false,
	"chat.embeds": true,
	"chat.badges.ffz": true,
	"chat.badges.bttv": true,
	"chat.badges.seventv": true,
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

export const settings = new RuneStore<Settings & Record<string, any>>("settings", defaults, {
	autoStart: true,
});
