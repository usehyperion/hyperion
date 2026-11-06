import type { Component } from "svelte";

import At from "~icons/ph/at";
import Highlighter from "~icons/ph/highlighter";
import Repeat from "~icons/ph/repeat";
import ShieldWarning from "~icons/ph/shield-warning";
import SketchLogo from "~icons/ph/sketch-logo";
import Sparkle from "~icons/ph/sparkle";
import Star from "~icons/ph/star-fill";
import Sword from "~icons/ph/sword";
import VideoCamera from "~icons/ph/video-camera";

import type { Viewer } from "./models/viewer.svelte";

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

interface HighlightKind {
	label: string;

	/**
	 * The label for the settings list of every viewer of the kind.
	 */
	plural: string;
	icon: Component;
	defaults: HighlightConfig;
}

/**
 * The kinds of viewer highlights, in the order they're listed in settings.
 */
export const HIGHLIGHTS = {
	mention: {
		label: "Mention",
		plural: "Mentions",
		icon: At,
		defaults: { enabled: true, color: "#adadb8", style: "background" },
	},
	new: {
		label: "First Time Chat",
		plural: "First Time Chats",
		icon: Sparkle,
		defaults: { enabled: true, color: "#ff75e6", style: "default" },
	},
	returning: {
		label: "Returning Chatter",
		plural: "Returning Chatters",
		icon: Repeat,
		defaults: { enabled: true, color: "#00a3a3", style: "default" },
	},
	suspicious: {
		label: "Suspicious User",
		plural: "Suspicious Users",
		icon: ShieldWarning,
		defaults: { enabled: true, color: "#ff8280", style: "default" },
	},
	broadcaster: {
		label: "Broadcaster",
		plural: "Broadcasters",
		icon: VideoCamera,
		defaults: { enabled: false, color: "#fc3430", style: "default" },
	},
	moderator: {
		label: "Moderator",
		plural: "Moderators",
		icon: Sword,
		defaults: { enabled: false, color: "#00a865", style: "default" },
	},
	subscriber: {
		label: "Subscriber",
		plural: "Subscribers",
		icon: Star,
		defaults: { enabled: false, color: "#528bff", style: "default" },
	},
	vip: {
		label: "VIP",
		plural: "VIPs",
		icon: SketchLogo,
		defaults: { enabled: false, color: "#db00b3", style: "default" },
	},
} as const satisfies Record<string, HighlightKind>;

export type HighlightType = keyof typeof HIGHLIGHTS;

export const KEYWORD_HIGHLIGHT = {
	label: "Custom",
	icon: Highlighter,
	defaults: {
		enabled: true,
		color: "#ff0000",
		style: "default",
		pattern: "",
		regex: false,
		wholeWord: false,
		matchCase: false,
	},
} as const satisfies Omit<HighlightKind, "plural" | "defaults"> & {
	defaults: KeywordHighlightConfig;
};

export function defaultHighlights() {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion - keys come from HIGHLIGHTS
	return Object.fromEntries(
		Object.entries(HIGHLIGHTS).map(([type, kind]) => [type, { ...kind.defaults }]),
	) as Record<HighlightType, HighlightConfig>;
}

/**
 * The highlight a message gets from who sent it, by priority.
 */
export function highlightOf(text: string, viewer: Viewer, username: string | undefined) {
	if (username && new RegExp(`@${RegExp.escape(username)}\\b`, "i").test(text)) return "mention";
	if (viewer.new) return "new";
	if (viewer.returning) return "returning";
	if (viewer.broadcaster) return "broadcaster";
	if (viewer.moderator) return "moderator";
	if (viewer.suspicious) return "suspicious";
	if (viewer.vip) return "vip";
	if (viewer.subscriber) return "subscriber";

	return null;
}

/**
 * Whether the text matches a keyword highlight. Invalid user-supplied patterns
 * never match.
 */
export function matchesKeyword(text: string, config: KeywordHighlightConfig) {
	if (!config.pattern.trim()) return false;

	let pattern = config.regex ? config.pattern : RegExp.escape(config.pattern);
	if (config.wholeWord) pattern = `\\b${pattern}\\b`;

	try {
		return new RegExp(pattern, config.matchCase ? "" : "i").test(text);
	} catch {
		return false;
	}
}
