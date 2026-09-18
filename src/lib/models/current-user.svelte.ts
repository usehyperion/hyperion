import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { app } from "$lib/app.svelte";
import type { EmoteSet } from "$lib/emotes";
import { transform7tvEmote } from "$lib/emotes";
import { send7tv } from "$lib/graphql";
import { userEmoteSetsQuery } from "$lib/graphql/7tv";
import { emoteSetsQuery, followsQuery } from "$lib/graphql/twitch";

import type { Whisper } from "./whisper.svelte";

import { Channel } from "./channel.svelte";
import { Stream } from "./stream.svelte";
import { User } from "./user.svelte";

export class CurrentUser extends User {
	public seventvId: string | null = null;

	/**
	 * The ids of the channels the current user is banned from.
	 */
	public readonly banned = new SvelteSet<string>();

	/**
	 * The ids of the channels the current user moderates for.
	 */
	public readonly moderating = new SvelteSet<string>();

	/**
	 * The whisper threads the current user is involved in.
	 */
	public readonly whispers = new SvelteMap<string, Whisper>();

	/**
	 * The emote sets the current user is entitled to use.
	 */
	public readonly emoteSets = new SvelteMap<string, EmoteSet>();

	public constructor(user: User) {
		super(user.client, user.data);
	}

	/**
	 * Whether the current user moderates the given channel.
	 */
	public moderates(channelId: string) {
		return this.moderating.has(channelId);
	}

	public async fetchEmoteSets() {
		await this.#fetch7tvSets();
		void this.#fetchTwitchEmotes().catch(() => {});
	}

	async #fetchTwitchEmotes() {
		const result = await this.client.gql(emoteSetsQuery, {
			id: this.id,
		});

		const emoteSets = result.user?.emoteSets ?? [];

		for (const set of emoteSets) {
			let owner = set.owner;

			if (!owner) {
				// oxlint-disable-next-line no-await-in-loop
				owner = await app.twitch.users.fetch("twitch", { by: "login" });
			}

			this.emoteSets.set(set.id!, {
				id: set.id!,
				provider: "Twitch",
				name: owner.displayName,
				owner: {
					id: owner.id,
					displayName: owner.displayName,
					avatarUrl: owner.avatarUrl!,
				},
				global: !set.owner,
				emotes:
					set.emotes
						?.filter((emote) => emote != null)
						.map((emote) => ({
							provider: "Twitch",
							id: emote.id!,
							name: emote.text!,
							displayName: emote.text!,
							width: 56,
							height: 56,
							displayWidth: 28,
							displayHeight: 28,
							srcset: [1, 2, 3].map(
								(d) =>
									`https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/${d} ${d}x`,
							),
						})) ?? [],
			});
		}
	}

	/**
	 * Loads the channels the current user follows, paging through the full
	 * follow list.
	 */
	public async loadFollowing() {
		const follows = await this.client.paginate(
			followsQuery,
			{ id: this.id },
			(data) => data.user?.follows,
		);

		for (const followed of follows) {
			if (app.channels.has(followed.id)) continue;

			let stream: Stream | null = null;

			if (followed.stream) {
				stream = new Stream(this.client, followed.id, followed.stream);

				for (const { user: guest } of followed.channel?.guestStarSessionCall?.guests ??
					[]) {
					stream.addGuest({
						...guest,
						viewers: guest.stream?.viewersCount ?? null,
					});
				}
			}

			const model = new User(this.client, followed);
			this.client.users.set(model.id, model);

			app.channels.set(model.id, new Channel(this.client, model, stream));
		}
	}

	async #fetch7tvSets() {
		const { users } = await send7tv(userEmoteSetsQuery, { id: this.id });

		this.seventvId = users.userByConnection?.id ?? null;

		if (users.userByConnection?.personalEmoteSet) {
			const set = users.userByConnection.personalEmoteSet;

			this.emoteSets.set(set.id, {
				id: set.id,
				provider: "7TV",
				name: `${this.displayName}: 7TV Personal Emotes`,
				owner: this,
				global: true,
				emotes: set.emotes.items.map((item) => transform7tvEmote(item.emote, item.alias)),
			});
		}

		if (users.userByConnection?.specialEmoteSets) {
			for (const set of users.userByConnection.specialEmoteSets) {
				this.emoteSets.set(set.id, {
					id: set.id,
					provider: "7TV",
					name: set.name,
					owner: this,
					global: true,
					emotes: set.emotes.items.map((item) =>
						transform7tvEmote(item.emote, item.alias),
					),
				});
			}
		}
	}
}
