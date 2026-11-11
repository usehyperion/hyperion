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
	icon: Component;
	defaults: HighlightConfig;
}

export const HIGHLIGHTS = {
	mention: {
		label: "Mention",
		icon: At,
		defaults: { enabled: true, color: "#adadb8", style: "background" },
	},
	new: {
		label: "First Time Chat",
		icon: Sparkle,
		defaults: { enabled: true, color: "#ff75e6", style: "default" },
	},
	returning: {
		label: "Returning Chatter",
		icon: Repeat,
		defaults: { enabled: true, color: "#00a3a3", style: "default" },
	},
	suspicious: {
		label: "Suspicious User",
		icon: ShieldWarning,
		defaults: { enabled: true, color: "#ff8280", style: "default" },
	},
	broadcaster: {
		label: "Broadcaster",
		icon: VideoCamera,
		defaults: { enabled: false, color: "#fc3430", style: "default" },
	},
	moderator: {
		label: "Moderator",
		icon: Sword,
		defaults: { enabled: false, color: "#00a865", style: "default" },
	},
	subscriber: {
		label: "Subscriber",
		icon: Star,
		defaults: { enabled: false, color: "#528bff", style: "default" },
	},
	vip: {
		label: "VIP",
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
} as const satisfies Omit<HighlightKind, "defaults"> & {
	defaults: KeywordHighlightConfig;
};

export function defaultHighlights() {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	return Object.fromEntries(
		Object.entries(HIGHLIGHTS).map(([type, kind]) => [type, { ...kind.defaults }]),
	) as Record<HighlightType, HighlightConfig>;
}

/**
 * Whether the text @-mentions the given username.
 */
export function mentions(text: string, username: string | undefined) {
	return !!username && new RegExp(`@${RegExp.escape(username)}\\b`, "i").test(text);
}

export function highlightOf(text: string, viewer: Viewer, username: string | undefined) {
	if (mentions(text, username)) return "mention";
	if (viewer.new) return "new";
	if (viewer.returning) return "returning";
	if (viewer.broadcaster) return "broadcaster";
	if (viewer.moderator) return "moderator";
	if (viewer.suspicious) return "suspicious";
	if (viewer.vip) return "vip";
	if (viewer.subscriber) return "subscriber";

	return null;
}

export function matchesKeyword(text: string, config: KeywordHighlightConfig) {
	if (!config.pattern.trim()) return false;

	let pattern = config.regex ? config.pattern : RegExp.escape(config.pattern);

	if (config.wholeWord) {
		pattern = `\\b${pattern}\\b`;
	}

	try {
		return new RegExp(pattern, config.matchCase ? "" : "i").test(text);
	} catch {
		return false;
	}
}
