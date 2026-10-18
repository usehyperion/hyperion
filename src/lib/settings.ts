import { RuneStore } from "@tauri-store/svelte";

import type { LogLevel } from "#lib/log.js";

import type { HighlightConfig, HighlightType, KeywordHighlightConfig } from "./highlights";

import { defaultHighlights } from "./highlights";

export type DeletedAppearance = "dim" | "strike" | "blur";

export type Settings = {
	"appearance.theme": string;

	"splits.leaveOnClose": boolean;

	"chat.hideScrollbar": boolean;
	"chat.newSeparator": boolean;
	"chat.embeds": boolean;
	"chat.gifs": boolean;
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

	"moderation.timeout.duration": string;
	"moderation.quickActions.show": boolean;
	"moderation.deleted.appearance": DeletedAppearance;

	"advanced.logs.level": LogLevel;
	"advanced.cache.persistent": boolean;
};

const defaults: Settings = {
	"appearance.theme": "",
	"splits.leaveOnClose": true,
	"chat.hideScrollbar": false,
	"chat.newSeparator": false,
	"chat.embeds": true,
	"chat.gifs": true,
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
	"highlights.viewers": defaultHighlights(),
	"highlights.keywords": [],
	"moderation.timeout.duration": "10m",
	"moderation.quickActions.show": true,
	"moderation.deleted.appearance": "dim",
	"advanced.logs.level": "info",
	"advanced.cache.persistent": true,
};

export const settings = new RuneStore<Settings>("settings", defaults, {
	autoStart: true,
	hooks: {
		beforeFrontendSync: (state) => {
			// Highlight kinds added since the settings were saved get defaults.
			state["highlights.viewers"] = {
				...defaultHighlights(),
				...state["highlights.viewers"],
			};

			return state;
		},
	},
});

export function deletedAppearance(message: { deleted: boolean }) {
	return message.deleted ? settings.state["moderation.deleted.appearance"] : undefined;
}
