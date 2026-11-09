import { SvelteMap, SvelteSet } from "svelte/reactivity";

import type { EmoteSet } from "#lib/emotes.js";

import { transformGql7tvEmote, transformTwitchEmote } from "#lib/emotes.js";
import { execute7tvQuery, userEmoteSetsQuery } from "#lib/graphql/7tv.js";
import {
	emoteSetsQuery,
	followsQuery,
	moderatesQuery,
	whispersQuery,
} from "#lib/graphql/twitch.js";
import { fetchJson } from "#lib/http.js";
import { log } from "#lib/log.js";
import { once } from "#lib/util/resource.js";

import { Stream } from "./stream.svelte";
import { User } from "./user.svelte";
import { Whisper } from "./whisper.svelte";

export class CurrentUser extends User {
	public readonly whispers = new SvelteMap<string, Whisper>();

	/**
	 * The emote sets the current user is entitled to use.
	 */
	public readonly emoteSets = new SvelteMap<string, EmoteSet>();

	/**
	 * The ids of the channels the current user moderates for.
	 */
	readonly #moderating = new SvelteSet<string>();

	public readonly loadModerating = once(async () => {
		const moderates = await this.client.paginate(
			moderatesQuery,
			{},
			(data) => data.moderatedChannels,
		);

		for (const { id } of moderates) {
			this.#moderating.add(id);
		}
	});

	public readonly loadFollowing = once(() => this.#loadFollowing());
	public readonly loadWhispers = once(() => this.#loadWhispers());

	public seventvId: string | null = null;

	readonly #seventvSets = once(() => this.#fetch7tvSets());
	readonly #twitchSets = once(() => this.#fetchTwitchEmotes());

	public constructor(user: User) {
		super(user.client, user.data);

		// Users always moderate their own channel.
		this.#moderating.add(this.id);
	}

	public get unreadWhispers() {
		return this.whispers.values().reduce((total, whisper) => total + whisper.unread, 0);
	}

	/**
	 * The emotes the current user can use in any channel.
	 */
	public get ownEmotes() {
		return this.emoteSets.values().flatMap((set) => set.emotes);
	}

	public moderates(channelId: string) {
		return this.#moderating.has(channelId);
	}

	public setModerating(channelId: string, moderating: boolean) {
		if (moderating) {
			this.#moderating.add(channelId);
		} else if (channelId !== this.id) {
			this.#moderating.delete(channelId);
		}
	}

	public async sendPresence(channelId: string) {
		// The 7TV account is resolved along with the emote sets.
		await this.loadEmoteSets();
		if (!this.seventvId) return;

		try {
			await fetchJson(`https://7tv.io/v3/users/${this.seventvId}/presences`, {
				method: "POST",
				body: {
					kind: 1,
					passive: false,
					session_id: null,
					data: {
						platform: "TWITCH",
						id: channelId,
					},
				},
			});

			log.info(`Presence sent in ${channelId}`);
		} catch (error) {
			log.error("Failed to send presence", error);
		}
	}

	public async loadEmoteSets() {
		const loads = {
			"7TV": this.#seventvSets,
			Twitch: this.#twitchSets,
		};

		await Promise.all(
			Object.entries(loads).map(async ([provider, load]) => {
				try {
					await load();
				} catch (error) {
					log.warn(`Failed to load ${provider} emote sets`, error);
				}
			}),
		);
	}

	async #loadFollowing() {
		const follows = await this.client.paginate(
			followsQuery,
			{ id: this.id },
			(data) => data.user?.follows,
		);

		return follows.map((followed) => ({
			user: this.client.users.from(followed),
			stream: followed.stream
				? Stream.from(followed.id, followed.stream, followed.channel)
				: null,
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
				emotes: set.emotes.items.map((item) =>
					transformGql7tvEmote(item.emote, item.alias),
				),
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
						transformGql7tvEmote(item.emote, item.alias),
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
				owner = await this.client.users.fetch("twitch", { by: "login" });
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
						.map((emote) => transformTwitchEmote(emote.id!, emote.text!)) ?? [],
			});
		}
	}
}
