import { clamp } from "#lib/util/math.js";

export function remainingLinger(endedAt: string | null, duration: number) {
	const ended = endedAt ? new Date(endedAt).getTime() : Number.NaN;

	if (Number.isNaN(ended)) {
		return duration;
	}

	return clamp(0, ended + duration - Date.now(), duration);
}

export function formatDuration(seconds: number) {
	if (seconds === 0) return "";

	const parts: string[] = [];

	const days = Math.floor(seconds / 86400);
	if (days) {
		parts.push(`${days}d`);
		seconds %= 86400;
	}

	const hours = Math.floor(seconds / 3600);
	if (hours) {
		parts.push(`${hours}h`);
		seconds %= 3600;
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes) {
		parts.push(`${minutes}m`);
		seconds %= 60;
	}

	if (seconds || !parts.length) {
		parts.push(`${seconds}s`);
	}

	return parts.join(" ");
}
