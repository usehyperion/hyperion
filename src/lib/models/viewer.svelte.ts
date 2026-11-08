import type { TadaDocumentNode } from "gql.tada";

import {
	banUserMutation,
	grantVipMutation,
	modUserMutation,
	revokeVipMutation,
	unbanUserMutation,
	unmodUserMutation,
	warnUserMutation,
} from "#lib/graphql/twitch.js";

import type { Channel } from "./channel.svelte";
import type { User } from "./user.svelte";

export interface TimeoutOptions {
	/**
	 * The duration of the timeout in seconds.
	 */
	duration: number;

	reason?: string;
}

export class Viewer {
	public readonly id: string;
	public readonly username: string;
	public readonly displayName: string;

	#moderator = $state(false);

	public subscriber = $state(false);
	public vip = $state(false);

	/**
	 * Whether the viewer is returning to the channel.
	 *
	 * Returning viewers are those who have chatted at least twice in the
	 * last 30 days.
	 */
	public returning = $state(false);

	/**
	 * Whether the viewer is new to the channel. This is only `true` for the
	 * first message they send.
	 */
	public new = $state(false);

	/**
	 * Whether the viewer's messages are being monitored. This is mutually
	 * exclusive with `restricted`.
	 */
	public monitored = $state(false);

	/**
	 * Whether the viewer's messages are being restricted. This is mutually
	 * exclusive with `monitored`.
	 */
	public restricted = $state(false);
	public possibleBanEvader = $state(false);

	public constructor(
		public readonly channel: Channel,
		public readonly user: User,
	) {
		this.id = user.id;
		this.username = user.username;
		this.displayName = user.displayName;
	}

	public get broadcaster() {
		return this.id === this.channel.id;
	}

	/**
	 * Whether the viewer moderates the channel, which broadcasters always do.
	 */
	public get moderator() {
		return this.broadcaster || this.#moderator;
	}

	public set moderator(moderator: boolean) {
		this.#moderator = moderator;
	}

	public get suspicious() {
		return this.monitored || this.restricted || this.possibleBanEvader;
	}

	public async ban(reason?: string) {
		await this.#gql(banUserMutation, { target: this.username, reason });
	}

	public async unban() {
		await this.#gql(unbanUserMutation, { target: this.username });
	}

	public async timeout(options: TimeoutOptions) {
		await this.#gql(banUserMutation, {
			target: this.username,
			duration: `${options.duration}s`,
			reason: options.reason,
		});
	}

	public async warn(reason: string) {
		await this.#gql(warnUserMutation, { target: this.username, reason });
	}

	public async mod() {
		await this.#gql(modUserMutation, { target: this.id });
	}

	public async unmod() {
		await this.#gql(unmodUserMutation, { target: this.id });
	}

	public async grantVip() {
		await this.#gql(grantVipMutation, { target: this.id });
	}

	public async revokeVip() {
		await this.#gql(revokeVipMutation, { target: this.id });
	}

	#gql<T, U extends { channel: string }>(
		mutation: TadaDocumentNode<T, U>,
		variables: Omit<U, "channel">,
	) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion
		return this.channel.client.gql(mutation, {
			...variables,
			channel: this.channel.id,
		} as U);
	}
}
