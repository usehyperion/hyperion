import type { Channel } from "#lib/models/channel.svelte.js";
import type { User } from "#lib/models/user.svelte.js";
import type { Viewer } from "#lib/models/viewer.svelte.js";

import type { DurationUnit } from "./parse";

export type Permission = "mod" | "broadcaster";

/**
 * A positional argument.
 */
export type Arg =
	| {
			/**
			 * Resolves a login to a user; `viewer` does the same and wraps it
			 * as a viewer of the channel.
			 */
			readonly type: "user" | "viewer";
			readonly name: string;
			readonly optional?: boolean;
	  }
	| {
			/**
			 * `text` takes the rest of the input verbatim.
			 */
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

export type Args<T extends readonly Arg[]> = readonly Arg[] extends T
	? ArgValues
	: { [A in T[number] as A["name"]]: ValueOf<A> };

export interface CommandDefinition<T extends readonly Arg[] = readonly Arg[]> {
	readonly name: string;
	readonly description: string;
	readonly args?: T;
	readonly permission?: Permission;

	errors?(args: Args<T>): Record<string, string>;

	/**
	 * The message for a failed request that nothing else matched.
	 */
	fallback?(args: Args<T>): string;
	exec(args: Args<T>, channel: Channel): Promise<void> | void;
}

export function command<const T extends readonly Arg[] = []>(
	definition: CommandDefinition<T>,
): CommandDefinition {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	return definition as unknown as CommandDefinition;
}
