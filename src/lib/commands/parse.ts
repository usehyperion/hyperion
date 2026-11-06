/**
 * Parsers and limits shared by commands and moderation actions. This module
 * must stay free of app and model imports so anything can depend on it.
 */

const SECONDS = {
	s: 1,
	m: 60,
	h: 60 * 60,
	d: 60 * 60 * 24,
	w: 60 * 60 * 24 * 7,
	mo: 60 * 60 * 24 * 30,
} as const;

const UNIT_NAMES = {
	s: "second",
	m: "minute",
	h: "hour",
	d: "day",
	w: "week",
	mo: "month",
} as const;

export type DurationUnit = keyof typeof SECONDS;

// Twitch accepts timeouts from one second up to two weeks.
export const MIN_TIMEOUT = 1;
export const MAX_TIMEOUT = 1_209_600;
export const DEFAULT_TIMEOUT = 600;

function isUnit(value: string | undefined): value is DurationUnit {
	return value !== undefined && Object.hasOwn(SECONDS, value);
}

export function parseBool(arg: string): boolean | null {
	switch (arg.toLowerCase()) {
		case "true":
		case "on":
			return true;
		case "false":
		case "off":
			return false;
		default:
			return null;
	}
}

/**
 * Parses a duration such as `30s`, `10m`, or `1mo` into the given unit. A bare
 * number is taken to already be in that unit.
 */
export function parseDuration(arg: string, unit: DurationUnit = "s"): number | null {
	const match = /^(\d+(?:\.\d+)?)(mo|[smhdw])?$/i.exec(arg);
	if (!match) return null;

	const suffix = match[2]?.toLowerCase();
	const from = isUnit(suffix) ? suffix : unit;

	return (Number(match[1]) * SECONDS[from]) / SECONDS[unit];
}

function plural(value: number, unit: DurationUnit) {
	const name = UNIT_NAMES[unit];
	return `${value.toLocaleString("en-US")} ${name}${value === 1 ? "" : "s"}`;
}

/**
 * Describes the given number of seconds in the largest unit that divides it
 * evenly, e.g. `1209600` as "14 days".
 */
function describe(seconds: number): [number, DurationUnit] {
	for (const unit of ["d", "h", "m"] as const) {
		if (seconds >= SECONDS[unit] && seconds % SECONDS[unit] === 0) {
			return [seconds / SECONDS[unit], unit];
		}
	}

	return [seconds, "s"];
}

export function durationRangeMessage(min: number, max: number, unit: DurationUnit = "s") {
	const [span, spanUnit] = describe(max * SECONDS[unit]);
	const suffix = spanUnit === unit ? "" : ` (${plural(span, spanUnit)})`;

	return `Duration must be between ${min.toLocaleString("en-US")} and ${plural(max, unit)}${suffix}.`;
}
