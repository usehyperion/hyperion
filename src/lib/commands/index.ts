import type { Channel } from "#lib/models/channel.svelte.js";

import { app } from "#lib/app.svelte.js";
import { ApiError } from "#lib/errors/api-error.js";
import { CommandError } from "#lib/errors/command-error.js";
import { MutationError } from "#lib/errors/mutation-error.js";
import { log } from "#lib/log.js";
import { User } from "#lib/models/user.svelte.js";
import { Viewer } from "#lib/models/viewer.svelte.js";

import type { Arg, ArgValues, CommandDefinition } from "./define";

import { parseScalar } from "./parse";

export type { Arg, Permission } from "./define";

export interface Command extends CommandDefinition {
	readonly provider: "Built-in" | "Twitch";
	readonly args: readonly Arg[];
}

const NO_PERMISSION = "You do not have permission to do that.";
const COMMAND_FAILED = "Something went wrong. Please try again.";

const PERMISSION_CODES = new Set([
	"FORBIDDEN",
	"NO_PERMISSIONS",
	"UNAUTHORIZED",
	"USER_UNAUTHORIZED",
]);

const modules = import.meta.glob<CommandDefinition | CommandDefinition[]>(
	["./built-in/*.ts", "./twitch/*.ts"],
	{ eager: true, import: "default" },
);

export const commands: Command[] = Object.entries(modules)
	.flatMap(([path, exported]) => {
		const provider: Command["provider"] = path.startsWith("./built-in/")
			? "Built-in"
			: "Twitch";

		return [exported]
			.flat()
			.map((definition) =>
				Object.assign(definition, { provider, args: definition.args ?? [] }),
			);
	})
	.toSorted((a, b) => a.name.localeCompare(b.name));

const registry = new Map(commands.map((command) => [command.name, command]));

export function hasPermission(command: Command, channel: Channel) {
	if (!app.user) return false;

	const broadcaster = channel.id === app.user.id;

	switch (command.permission) {
		case "broadcaster":
			return broadcaster;
		case "mod":
			return broadcaster || channel.isMod;
		default:
			return true;
	}
}

export async function execute(channel: Channel, line: string) {
	const [, name = "", input = ""] = /^(\S*)\s*(.*)$/.exec(line) ?? [];

	const command = registry.get(name.toLowerCase());

	if (!command) {
		throw new CommandError(`Unknown command: /${name}.`);
	}

	if (!hasPermission(command, channel)) {
		throw new CommandError(
			!app.user
				? "You must be logged in to use commands."
				: command.permission === "broadcaster"
					? "Only the broadcaster can use this command."
					: "You must be a moderator to use this command.",
		);
	}

	let args: ArgValues | null = null;

	try {
		args = await parseArgs(command.args, input, channel);
		await command.exec(args, channel);
	} catch (error) {
		if (!(error instanceof CommandError)) {
			log.error(
				`Error executing command ${command.name} in channel ${channel.user.username}: ${String(error)}`,
			);
		}

		throw toCommandError(error, command, args);
	}
}

async function parseArgs(specs: readonly Arg[], input: string, channel: Channel) {
	const tokens = [...input.matchAll(/\S+/g)];
	const values: ArgValues = {};
	const users: [spec: Extract<Arg, { type: "user" | "viewer" }>, login: string][] = [];

	let next = 0;

	for (const [index, spec] of specs.entries()) {
		const token = tokens.at(next);
		const last = index === specs.length - 1;

		if (spec.type === "text") {
			values[spec.name] = token ? input.slice(token.index).trimEnd() : undefined;
			next = tokens.length;
		} else if (!token) {
			if (spec.type === "bool" || spec.type === "duration") {
				values[spec.name] = spec.default;
			}
		} else if (spec.type === "bool" || spec.type === "duration") {
			const value = parseScalar(spec, token[0]);

			if (value === null) {
				// An optional argument that doesn't parse belongs to the next one.
				if (spec.default !== undefined && !last) {
					values[spec.name] = spec.default;
					continue;
				}

				throw new CommandError(invalidMessage(spec, token[0]));
			}

			values[spec.name] = value;
			next++;
		} else if (spec.type === "user" || spec.type === "viewer") {
			users.push([spec, token[0]]);
			next++;
			continue;
		} else {
			values[spec.name] = token[0];
			next++;
		}

		if (values[spec.name] === undefined && !("optional" in spec && spec.optional)) {
			throw new CommandError(`Missing ${spec.name} argument.`);
		}
	}

	// Resolve users only once the input is known to be valid.
	await Promise.all(
		users.map(async ([spec, login]) => {
			values[spec.name] = await resolveUser(login, spec.type, channel);
		}),
	);

	return values;
}

function invalidMessage(spec: Arg, token: string) {
	if (spec.type === "duration") {
		return `Invalid ${spec.name} "${token}". Use a number with an optional unit, such as 30s, 10m, or 1h.`;
	}

	return "Invalid boolean value. Use 'on/off' or 'true/false'.";
}

async function resolveUser(arg: string, type: "user" | "viewer", channel: Channel) {
	const login = arg.replace(/^@/, "").toLowerCase();
	const viewer = channel.viewers.getByLogin(login);

	if (viewer) {
		return type === "viewer" ? viewer : viewer.user;
	}

	try {
		const user = await app.twitch.users.fetch(login, { by: "login" });

		return type === "viewer" ? new Viewer(channel, user) : user;
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			throw new CommandError(CommandError.USER_NOT_FOUND(login));
		}

		throw error;
	}
}

function failures(error: unknown): (ApiError | MutationError)[] {
	const errors = error instanceof AggregateError ? error.errors : [error];

	return errors.filter(
		(inner): inner is ApiError | MutationError =>
			inner instanceof ApiError || inner instanceof MutationError,
	);
}

function defaultMessage(failure: ApiError | MutationError, args: ArgValues | null) {
	if (failure instanceof ApiError) {
		return failure.status === 404 ? "Not found." : null;
	}

	if (PERMISSION_CODES.has(failure.code)) {
		return NO_PERMISSION;
	}

	if (failure.code.endsWith("_NOT_FOUND")) {
		const target = Object.values(args ?? {}).find(
			(value) => value instanceof User || value instanceof Viewer,
		);

		return target ? CommandError.USER_NOT_FOUND(target.username) : "User not found.";
	}

	return null;
}

function toCommandError(error: unknown, command: Command, args: ArgValues | null) {
	if (error instanceof CommandError) return error;

	const collected = failures(error);
	if (!collected.length) return error;

	const overrides = args ? (command.errors?.(args) ?? {}) : {};

	for (const failure of collected) {
		const key = failure instanceof MutationError ? failure.code : String(failure.status);
		const message = overrides[key] ?? defaultMessage(failure, args);

		if (message) {
			return new CommandError(message);
		}
	}

	return new CommandError((args && command.fallback?.(args)) ?? COMMAND_FAILED);
}
