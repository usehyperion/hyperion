import { DEFAULT_TIMEOUT, MAX_TIMEOUT, MIN_TIMEOUT, parseDuration } from "./commands/parse";
import { settings } from "./settings";
import { clamp, formatDuration } from "./util";

export const timeoutPresets = [
	{ label: "1 second", value: "1s" },
	{ label: "10 seconds", value: "10s" },
	{ label: "30 seconds", value: "30s" },
	{ label: "1 minute", value: "1m" },
	{ label: "5 minutes", value: "5m" },
	{ label: "10 minutes", value: "10m" },
	{ label: "30 minutes", value: "30m" },
	{ label: "1 hour", value: "1h" },
	{ label: "6 hours", value: "6h" },
	{ label: "1 day", value: "1d" },
	{ label: "1 week", value: "1w" },
	{ label: "2 weeks", value: "2w" },
];

export function timeoutDuration() {
	const parsed = parseDuration(settings.state["moderation.timeout.duration"]);
	if (parsed === null || parsed <= 0) return DEFAULT_TIMEOUT;

	return clamp(MIN_TIMEOUT, Math.round(parsed), MAX_TIMEOUT);
}

export function timeoutLabel() {
	const value = settings.state["moderation.timeout.duration"];
	const preset = timeoutPresets.find((option) => option.value === value);

	return preset?.label ?? formatDuration(timeoutDuration());
}
