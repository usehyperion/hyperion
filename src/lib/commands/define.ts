import type { Channel } from "#lib/models/channel.svelte.js";
import type { User } from "#lib/models/user.svelte.js";
import type { Viewer } from "#lib/models/viewer.svelte.js";

import type { DurationUnit } from "./parse";

/**
 * Who may run a command. A broadcaster also counts as a moderator of their
 * own channel.
 */
export type Permission = "mod" | "broadcaster";

/**
 * A positional argument. `user` resolves a login to a user; `viewer` does the
 * same and wraps it as a viewer of the channel; `text` takes the rest of the
 * input verbatim. `bool` and `duration` arguments with a `default` are
 * optional: when they aren't last and their token doesn't parse, the token is
 * left for the next argument instead.
 */
export type Arg =
	| {
			readonly type: "user" | "viewer";
			readonly name: string;
			readonly optional?: boolean;
	  }
	| {
			readonly type: "string" | "text";
			readonly name: string;
			readonly optional?: boolean;
	  }
	| {
			readonly type: "bool";
			readonly name: string;
			readonly default?: boolean;
	  }
	| {
			readonly type: "duration";
			readonly name: string;
			/**
			 * The unit the value is in, and that a bare number is read as.
			 */
			readonly unit?: DurationUnit;
			readonly min: number;
			readonly max: number;
			readonly default?: number;
			/**
			 * Whether `off` (or `0`) is accepted as zero.
			 */
			readonly off?: boolean;
	  };

interface ArgTypes {
	user: User;
	viewer: Viewer;
	string: string;
	text: string;
	bool: boolean;
	duration: number;
}

export type ArgValues = Record<string, ArgTypes[keyof ArgTypes] | undefined>;

type ValueOf<A extends Arg> =
	| ArgTypes[A["type"]]
	| (A extends { readonly optional: true } ? undefined : never);

/**
 * The parsed values of a command's arguments, keyed by name.
 */
export type Args<T extends readonly Arg[]> = readonly Arg[] extends T
	? ArgValues
	: { [A in T[number] as A["name"]]: ValueOf<A> };

export interface CommandDefinition<T extends readonly Arg[] = readonly Arg[]> {
	readonly name: string;
	readonly description: string;
	readonly args?: T;
	readonly permission?: Permission;

	/**
	 * Messages for failures, keyed by GraphQL mutation error code or HTTP
	 * status. They take precedence over the shared defaults.
	 */
	errors?(args: Args<T>): Record<string, string>;

	/**
	 * The message for a failed request that nothing else matched.
	 */
	fallback?(args: Args<T>): string;

	exec(args: Args<T>, channel: Channel): Promise<void> | void;
}

/**
 * Infers argument names and types for a command's handlers, then erases them
 * so commands with different arguments can share one list.
 */
export function command<const T extends readonly Arg[] = []>(
	definition: CommandDefinition<T>,
): CommandDefinition {
	// The runner passes values parsed from `definition.args`, so they match `Args<T>`.
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	return definition as unknown as CommandDefinition;
}
