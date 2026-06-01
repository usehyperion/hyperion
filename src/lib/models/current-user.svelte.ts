import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { app } from "$lib/app.svelte";
import { transform7tvEmote } from "$lib/emotes";
import type { Emote, EmoteSet } from "$lib/emotes";
import { send7tv } from "$lib/graphql";
import { userEmoteSetsQuery } from "$lib/graphql/7tv";
import { userFollowingQuery } from "$lib/graphql/twitch";
import type { UserEmote } from "$lib/twitch/api";
import { User } from "./user.svelte";
import type { Whisper } from "./whisper.svelte";

export class CurrentUser extends User {
	public seventvId: string | null = null;

	/**
	 * The ids of the channels the current user is banned from.
	 */
	public readonly banned = new SvelteSet<string>();

	/**
	 * The ids of the channels the current user moderates for.
	 */
	public readonly moderating = new Set<string>();

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

	public async fetchEmoteSets() {
		await invoke("fetch_user_emotes");
		await this.#fetch7tvSets();

		await listen<UserEmote[]>("useremotes", async (event) => {
			const grouped = Map.groupBy(event.payload, (emote) => emote.owner_id || "twitch");

			for (const [id, emotes] of grouped) {
				const owner = await app.twitch.users.fetch(id, {
					by: id === "twitch" ? "login" : "id",
				});

				const mapped = emotes.map<Emote>((emote) => ({
					provider: "Twitch",
					id: emote.id,
					name: emote.name,
					width: 56,
					height: 56,
					srcset: emote.scale.map(
						(d) =>
							`https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/${d} ${d}x`,
					),
				}));

				this.emoteSets.set(id, {
					id,
					provider: "Twitch",
					name: owner.displayName,
					owner,
					global: id === "twitch",
					emotes: mapped,
				});
			}
		});
	}

	/**
	 * Retrieves the list of channels the current user is following.
	 */
	public async fetchFollowing() {
		const { user } = await this.client.send(userFollowingQuery, { id: this.id });

		return user?.follows?.edges?.flatMap((edge) => (edge?.node ? [edge.node] : [])) ?? [];
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
