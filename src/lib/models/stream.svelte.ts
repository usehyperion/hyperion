import { SvelteMap } from "svelte/reactivity";
import { guestsQuery } from "$lib/graphql/twitch";
import type { Stream as ApiStream } from "$lib/graphql/twitch";
import type { TwitchClient } from "$lib/twitch/client";

export interface Guest {
	id: string;
	color: string | null;
	username: string;
	displayName: string;
	avatarUrl: string | null;
	viewers: number | null;
}

export class Stream {
	/**
	 * The date the stream started.
	 */
	public readonly createdAt: Date;

	/**
	 * The title of the stream.
	 */
	public title: string;

	/**
	 * The game being played on the stream.
	 */
	public game: string;

	/**
	 * The number of viewers currently watching the stream.
	 */
	public viewers: number;

	/**
	 * The users participating in the Stream Together session if there is
	 * one active.
	 */
	public readonly guests = new SvelteMap<string, Guest>();

	public constructor(
		public readonly client: TwitchClient,

		/**
		 * The id of the channel the stream is associated with.
		 */
		public readonly channelId: string,
		data: ApiStream | null,
	) {
		this.createdAt = new Date(data?.createdAt ?? 0);
		this.title = $state(data?.title ?? "Untitled");
		this.game = $state(data?.game?.displayName ?? "Unknown");
		this.viewers = $state(data?.viewersCount ?? 0);
	}

	public addGuest(guest: Guest) {
		if (guest.id !== this.channelId) {
			this.guests.set(guest.id, guest);
		}
	}

	/**
	 * Retrieves the list of guests in the Stream Together session if there is
	 * one active.
	 */
	public async fetchGuests() {
		const { channel } = await this.client.gql(guestsQuery, { id: this.channelId });

		for (const { user } of channel?.guestStarSessionCall?.guests ?? []) {
			this.addGuest({
				...user,
				viewers: user.stream?.viewersCount ?? null,
			});
		}

		return this.guests;
	}
}
