import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { app } from "$lib/app.svelte";
import { transform7tvEmote } from "$lib/emotes";
import type { EmoteSet } from "$lib/emotes";
import { send7tv } from "$lib/graphql";
import { userEmoteSetsQuery } from "$lib/graphql/7tv";
import { followedChannelsQuery } from "$lib/graphql/twitch";
import { log } from "$lib/log";
import type { FollowedChannel, UserEmote } from "$lib/twitch/api";
import { chunk, mapPool } from "$lib/util";
import { Channel } from "./channel.svelte";
import { Stream } from "./stream.svelte";
import { User } from "./user.svelte";
import type { Whisper } from "./whisper.svelte";

const FOLLOWING_BATCH_SIZE = 100;
const FETCH_CONCURRENCY = 4;

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
		const emotes = await this.client.getAll<UserEmote>("/chat/emotes/user", {
			user_id: this.id,
			first: 100,
		});

		const grouped = Map.groupBy(emotes, (emote) => emote.owner_id || "twitch");

		await mapPool(Array.from(grouped), FETCH_CONCURRENCY, ([id, group]) =>
			this.#fetchSetOwner(id, group),
		);
	}

	/**
	 * Loads the channels the current user follows.
	 */
	public async loadFollowing() {
		const followed = await this.client.getAll<FollowedChannel>("/channels/followed", {
			user_id: this.id,
			first: 100,
		});

		const batches = chunk(
			followed.map((channel) => channel.broadcaster_id),
			FOLLOWING_BATCH_SIZE,
		);

		await mapPool(batches, FETCH_CONCURRENCY, (ids) => this.#loadChannels(ids));
	}

	async #loadChannels(ids: string[]) {
		try {
			const { users } = await this.client.gql(followedChannelsQuery, { ids });

			for (const user of users ?? []) {
				if (!user || app.channels.has(user.id)) continue;

				let stream: Stream | null = null;

				if (user.stream) {
					stream = new Stream(this.client, user.id, user.stream);

					for (const { user: guest } of user.channel?.guestStarSessionCall?.guests ??
						[]) {
						stream.addGuest({
							...guest,
							viewers: guest.stream?.viewersCount ?? null,
						});
					}
				}

				const model = new User(this.client, user);
				this.client.users.set(model.id, model);

				app.channels.set(model.id, new Channel(this.client, model, stream));
			}
		} catch (error) {
			void log.error(`Failed to load followed channels: ${String(error)}`).catch(() => {});
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

	async #fetchSetOwner(id: string, group: UserEmote[]) {
		const owner = await app.twitch.users.fetch(id, {
			by: id === "twitch" ? "login" : "id",
		});

		this.emoteSets.set(id, {
			id,
			provider: "Twitch",
			name: owner.displayName,
			owner,
			global: id === "twitch",
			emotes: group.map((emote) => ({
				provider: "Twitch",
				id: emote.id,
				name: emote.name,
				width: 56,
				height: 56,
				srcset: emote.scale.map(
					(d) =>
						`https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/${d} ${d}x`,
				),
			})),
		});
	}
}
