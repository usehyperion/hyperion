import type { Channel } from "./channel.svelte";
import type { User } from "./user.svelte";

export interface TimeoutOptions {
	/**
	 * The duration of the timeout in seconds.
	 */
	duration: number;

	/**
	 * The reason for the timeout.
	 */
	reason?: string;
}

export class Viewer {
	public readonly id: string;
	public readonly username: string;
	public readonly displayName: string;

	/**
	 * Whether the viewer is the broadcaster.
	 */
	public broadcaster = $state(false);

	/**
	 * Whether the viewer is a moderator in the channel.
	 */
	public moderator = $state(false);

	/**
	 * Whether the viewer is a subscriber in the channel.
	 */
	public subscriber = $state(false);

	/**
	 * Whether the viewer is a VIP in the channel.
	 */
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

	/**
	 * Whether there's a possibility that the viewer is ban evading.
	 */
	public possibleBanEvader = $state(false);

	public constructor(
		/**
		 * The channel the viewer is in.
		 */
		public readonly channel: Channel,

		/**
		 * The user representing the viewer.
		 */
		public readonly user: User,
	) {
		this.id = user.id;
		this.username = user.username;
		this.displayName = user.displayName;
	}

	/**
	 * Whether the viewer is considered suspicious in a channel i.e. their
	 * messages are being monitored or restricted, or they are suspected of ban
	 * evasion.
	 */
	public get suspicious() {
		return this.monitored || this.restricted || this.possibleBanEvader;
	}

	public ban(reason?: string) {
		return this.channel.viewers.ban(this.username, reason);
	}

	public timeout(options: TimeoutOptions) {
		return this.channel.viewers.timeout(this.id, options);
	}

	public warn(reason: string) {
		return this.channel.viewers.warn(this.id, reason);
	}
}
