import { SvelteMap } from "svelte/reactivity";

import type { Stream as ApiStream, GuestStarDetails } from "#lib/graphql/twitch.js";

export interface Game {
	slug: string;
	name: string;
}

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

	public title: string;
	public game: Game;
	public readonly tags: string[];
	public readonly thumbnailUrl: string | null;
	public viewers: number;

	/**
	 * The users participating in the Stream Together session if there is
	 * one active.
	 */
	public readonly guests = new SvelteMap<string, Guest>();

	private constructor(
		public readonly channelId: string,
		data: ApiStream,
	) {
		this.createdAt = new Date(data.createdAt ?? 0);

		this.title = $state(data.title ?? "Untitled");
		this.game = $state({
			slug: data.game?.slug ?? "",
			name: data.game?.displayName ?? "Unknown",
		});

		this.tags = data.freeformTags?.flatMap((tag) => (tag.name ? [tag.name] : [])) ?? [];
		this.thumbnailUrl = data.previewImageURL ?? null;

		this.viewers = $state(data.viewersCount ?? 0);
	}

	/**
	 * Creates a stream along with the guests of its Stream Together session if
	 * one is active.
	 */
	public static from(
		channelId: string,
		data: ApiStream,
		channel: GuestStarDetails | null | undefined,
	) {
		const stream = new Stream(channelId, data);

		for (const { user } of channel?.guestStarSessionCall?.guests ?? []) {
			if (user.id === channelId) continue;

			stream.guests.set(user.id, {
				...user,
				viewers: user.stream?.viewersCount ?? null,
			});
		}

		return stream;
	}
}
