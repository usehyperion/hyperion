import { app } from "$lib/app.svelte";
import { ApiError } from "$lib/errors/api-error";
import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";
import { MutationError } from "$lib/errors/mutation-error";
import type { Channel } from "$lib/models/channel.svelte";
import { Viewer } from "$lib/models/viewer.svelte";

import type { Command } from ".";

export function defineCommand<const T extends Command>(command: T) {
	return command;
}

export interface ErrorMatch {
	code?: string | string[];
	status?: number;
	includes?: string;
	message: string;
}

type Failure = ApiError | MutationError;

function failures(error: unknown): Failure[] {
	if (error instanceof ApiError || error instanceof MutationError) {
		return [error];
	}

	if (error instanceof AggregateError) {
		return error.errors.filter(
			(inner) => inner instanceof ApiError || inner instanceof MutationError,
		);
	}

	return [];
}

function isMatch(failure: Failure, match: ErrorMatch): boolean {
	if (match.code !== undefined) {
		if (!(failure instanceof MutationError)) return false;

		const codes = Array.isArray(match.code) ? match.code : [match.code];

		return codes.includes(failure.code);
	}

	if (failure instanceof MutationError) return false;

	const statusMatches = match.status === undefined || failure.status === match.status;
	const textMatches = match.includes === undefined || failure.message.includes(match.includes);

	return statusMatches && textMatches;
}

export async function mapErrors<T>(
	action: () => Promise<T>,
	matches: ErrorMatch[],
	fallback?: string,
): Promise<T> {
	try {
		return await action();
	} catch (error) {
		const collected = failures(error);

		for (const failure of collected) {
			for (const match of matches) {
				if (isMatch(failure, match)) {
					throw new CommandError(match.message);
				}
			}
		}

		if (fallback && collected.length) {
			throw new CommandError(fallback);
		}

		throw error;
	}
}

export async function getTarget(username: string, channel: Channel) {
	if (!username) {
		throw new CommandError(ErrorMessage.MISSING_ARG("username"));
	}

	username = username.toLowerCase();

	let target = channel.viewers.values().find((v) => v.username === username);

	if (!target) {
		const user = await mapErrors(
			() => app.twitch.users.fetch(username, { by: "login" }),
			[{ status: 404, message: ErrorMessage.USER_NOT_FOUND(username) }],
		);

		target = new Viewer(channel, user);
		channel.viewers.set(target.id, target);
	}

	return target;
}

export function parseBool(arg: string | undefined): boolean | null {
	if (!arg) return true;

	arg = arg.toLowerCase();

	const truthy = arg === "true" || arg === "on";
	const falsy = arg === "false" || arg === "off";

	return truthy ? true : falsy ? false : null;
}

const unitMap: Record<string, number> = {
	s: 1,
	m: 60,
	h: 60 * 60,
	d: 60 * 60 * 24,
	w: 60 * 60 * 24 * 7,
	mo: 60 * 60 * 24 * 30,
};

export function parseDuration(arg: string | undefined): number | null {
	const match = arg ? /^(\d+(?:\.\d+)?)([shdw]|mo?)?$/i.exec(arg) : null;
	if (!match) return null;

	const value = Number(match[1]);
	const unit = match[2]?.toLowerCase() ?? "s";

	return value * unitMap[unit];
}
