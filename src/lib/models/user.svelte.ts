import { ofetch } from "ofetch";
import { SvelteMap } from "svelte/reactivity";
import { app } from "$lib/app.svelte";
import type { Emote } from "$lib/emotes";
import { ApiError } from "$lib/errors/api-error";
import { userBadgesQuery } from "$lib/graphql/twitch";
import type { User as ApiUser } from "$lib/graphql/twitch";
import { settings } from "$lib/settings";
import type { Paint } from "$lib/seventv";
import { COLORS } from "$lib/twitch";
import type { SubscriptionAge } from "$lib/twitch/api";
import type { TwitchClient } from "$lib/twitch/client";
import { dedupe, makeReadable } from "$lib/util";
import { Badge } from "./badge";

export interface RelationshipSubscription {
	/**
	 * Whether the user has their subscription info hidden.
	 */
	hidden: boolean;

	/**
	 * The type of subscription the user has in the channel.
	 */
	type: "prime" | "paid" | "gift" | null;

	/**
	 * The tier of the subscription the user has in the channel.
	 */
	tier: string | null;

	/**
	 * The number of months the user has been subscribed to the channel.
	 */
	months: number | null;
}

/**
 * Represents a user's relationship to a channel.
 */
export interface Relationship {
	/**
	 * The badges the user has in the channel along with global badges earned.
	 */
	badges: Badge[];

	/**
	 * The date the user followed the channel if they follow it.
	 */
	followedAt: Date | null;

	/**
	 * Metadata for the user's subscription to the channel if they are subscribed.
	 */
	subscription: RelationshipSubscription;
}

export class User {
	#color: string;
	#displayName: string;

	public readonly id: string;

	/**
	 * The date the user's account was created.
	 */
	public createdAt: Date;

	/**
	 * Whether the user is Twitch staff.
	 */
	public readonly staff: boolean;

	/**
	 * Whether the user is a Twitch affiliate.
	 */
	public readonly affiliated: boolean;

	/**
	 * Whether the user is a Twitch partner.
	 */
	public readonly partnered: boolean;

	/**
	 * The bio of the user.
	 */
	public bio: string;

	/**
	 * The url of the user's avatar image.
	 */
	public avatarUrl: string;

	/**
	 * The url of the user's banner image seen when they are offline.
	 */
	public bannerUrl: string;

	/**
	 * The relationships of the user to other channels.
	 */
	public readonly relationships = new SvelteMap<string, Relationship>();

	/**
	 * The username of the user.
	 */
	public username: string;

	/**
	 * The 7TV paint for the user if they have one set.
	 */
	public readonly paint?: Paint;

	/**
	 * The emotes the user is entitled to use.
	 */
	public readonly emotes = new Map<string, Emote>();

	public constructor(
		public readonly client: TwitchClient,
		readonly data: ApiUser,
	) {
		this.#color = this.#resolveColor(data.chatColor);
		this.#displayName = data.displayName;

		this.id = data.id;
		this.username = data.login;

		// WebKit and V8 behavior differ when instantiating a date with 0 as a string
		this.createdAt = new Date(data.createdAt === "0" ? 0 : data.createdAt);

		this.staff = data.roles?.isStaff ?? false;
		this.affiliated = data.roles?.isAffiliate ?? false;
		this.partnered = data.roles?.isPartner ?? false;

		this.bio = $state(data.description ?? "");
		this.avatarUrl = $state(data.profileImageURL ?? "");
		this.bannerUrl = $state(data.bannerImageURL ?? "");

		// this.badge = $derived(app.u2b.get(this.id));
		this.paint = $derived(app.u2p.get(this.id));
	}

	/**
	 * The color of the user's name. Defaults to the current foreground color
	 * if the user doesn't have a color set.
	 */
	public get color() {
		return settings.state["chat.usernames.readable"] ? makeReadable(this.#color) : this.#color;
	}

	public set color(color: string) {
		this.#color = this.#resolveColor(color);
	}

	/**
	 * The CSS style for the user's username.
	 */
	public get style() {
		const color = `color: ${this.color};`;

		if (this.paint && settings.state["chat.usernames.paint"]) {
			return `${this.paint.css}; ${color}`;
		}

		return color;
	}

	/**
	 * The display name of the user. The capitalization may differ from the
	 * username.
	 *
	 * If the user has a localized name and localized names are enabled in
	 * settings, this will be the localized name followed by the username in
	 * parentheses.
	 */
	public get displayName() {
		if (settings.state["chat.usernames.localized"] && this.localizedName) {
			return `${this.localizedName} (${this.username})`;
		}

		return this.#displayName;
	}

	public set displayName(displayName: string) {
		this.#displayName = displayName;
	}

	/**
	 * The localized display name of the user if they have their Twitch
	 * language set to Chinese, Japanese, or Korean.
	 */
	public get localizedName() {
		return this.username !== this.#displayName.toLowerCase() ? this.#displayName : null;
	}

	public get partial() {
		return this.createdAt.getUTCFullYear() === 1970;
	}

	public async fetch() {
		await this.client.users.fetch(this.id, { force: true });

		const cached = this.client.users.get(this.id);
		if (!cached) return this;

		this.createdAt = cached.createdAt;
		this.bio = cached.bio;
		this.avatarUrl = cached.avatarUrl;
		this.bannerUrl = cached.bannerUrl;

		return this;
	}

	/**
	 * Retrieves the user's relationship to the specified channel.
	 */
	public async fetchRelationship(channel: string) {
		const rel = this.relationships.get(channel);
		if (rel) return rel;

		const gqlRequest = this.client.gql(userBadgesQuery, { user: this.username, channel });

		const params = `${this.username}/${channel}`;
		const ivrRequest = dedupe(`ivr:${params}`, async () => {
			try {
				return await ofetch<SubscriptionAge>(
					`https://api.ivr.fi/v2/twitch/subage/${params}`,
				);
			} catch (error) {
				throw ApiError.from(error);
			}
		});

		const [{ channelViewer }, data] = await Promise.all([gqlRequest, ivrRequest]);

		const relationship = {
			badges: channelViewer?.earnedBadges?.map(Badge.fromGql) ?? [],
			followedAt: data.followedAt ? new Date(data.followedAt) : null,
			subscription: {
				hidden: data.statusHidden,
				type: data.meta?.type ?? null,
				tier: data.meta?.tier ?? null,
				months: data.cumulative?.months ?? null,
			},
		};

		this.relationships.set(channel, relationship);
		return relationship;
	}

	public toJSON() {
		return this.data;
	}

	#resolveColor(color: string | null) {
		if (!color && settings.state["chat.usernames.randomColor"]) {
			return COLORS[Math.floor(Math.random() * COLORS.length)];
		}

		return color || "inherit";
	}
}
