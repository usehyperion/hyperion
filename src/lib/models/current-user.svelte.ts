import { SvelteMap, SvelteSet } from "svelte/reactivity";

import type { EmoteSet } from "#lib/emotes.js";

import { app } from "#lib/app.svelte.js";
import { transform7tvEmote } from "#lib/emotes.js";
import { execute7tvQuery, userEmoteSetsQuery } from "#lib/graphql/7tv.js";
import { emoteSetsQuery, followsQuery, whispersQuery } from "#lib/graphql/twitch.js";

import { Channel } from "./channel.svelte";
import { Stream } from "./stream.svelte";
import { User } from "./user.svelte";
import { Whisper } from "./whisper.svelte";

export class CurrentUser extends User {
	#whispers: Promise<void> | null = null;

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

	/**
	 * Loads the channels the current user follows.
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

				const guests = followed.channel?.guestStarSessionCall?.guests ?? [];

				for (const { user: guest } of guests) {
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

	/**
	 * Loads the whisper threads the current user is a part of.
	 */
	public loadWhispers() {
		return (this.#whispers ??= this.#loadWhispers().catch((error: unknown) => {
			this.#whispers = null;
			throw error;
		}));
	}

	async #loadWhispers() {
		const threads = await this.client.paginate(
			whispersQuery,
			{},
			(data) => data.currentUser?.whisperThreads,
		);

		for (const thread of threads) {
			const other = thread.participants.find((user) => user && user.id !== this.id);
			if (!other) continue;

			const sender = this.client.users.from(other);

			const whisper = this.whispers.getOrInsertComputed(
				sender.id,
				() => new Whisper(this.client, thread.id, sender),
			);

			whisper.sync(thread);
		}
	}

	async #fetch7tvSets() {
		const { users } = await execute7tvQuery(userEmoteSetsQuery, { id: this.id });

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
}
