import { CommandError } from "#lib/errors/command-error.js";

import type { Arg } from "./define.js";

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

export function parseDuration(arg: string, unit: DurationUnit = "s"): number | null {
	const match = /^(\d+(?:\.\d+)?)(mo|[smhdw])?$/i.exec(arg);
	if (!match) return null;

	const suffix = match[2]?.toLowerCase();
	const from = isUnit(suffix) ? suffix : unit;

	return (Number(match[1]) * SECONDS[from]) / SECONDS[unit];
}

type ScalarArg = Extract<Arg, { type: "bool" | "duration" }>;

export function parseScalar(spec: ScalarArg, token: string) {
	if (spec.type === "bool") return parseBool(token);
	if (spec.off && parseBool(token) === false) return 0;

	const value = parseDuration(token, spec.unit);
	if (value === null) return null;

	const rounded = Math.round(value);

	if (spec.off && rounded === 0) return 0;

	if (rounded < spec.min || rounded > spec.max) {
		throw new CommandError(durationRangeMessage(spec.min, spec.max, spec.unit));
	}

	return rounded;
}

function plural(value: number, unit: DurationUnit) {
	const name = UNIT_NAMES[unit];
	return `${value.toLocaleString("en-US")} ${name + (value === 1 ? "" : "s")}`;
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
