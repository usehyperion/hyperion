import { SvelteMap } from "svelte/reactivity";

import type { User as ApiUser } from "#lib/graphql/twitch.js";
import type { Paint } from "#lib/seventv.js";
import type { TwitchClient } from "#lib/twitch/client.js";
import type { BasicUser } from "#lib/twitch/irc.js";

import { app } from "#lib/app.svelte.js";
import { relationshipQuery, userQuery } from "#lib/graphql/twitch.js";
import { settings } from "#lib/settings/index.js";
import { makeReadable } from "#lib/util/color.js";

import type { Channel } from "./channel.svelte";

import { Badge } from "./badge";

// Default Twitch colors.
const COLORS = [
	"rgb(0, 0, 255)",
	"rgb(0, 128, 0)",
	"rgb(0, 255, 127)",
	"rgb(30, 144, 255)",
	"rgb(46, 139, 87)",
	"rgb(95, 158, 160)",
	"rgb(138, 43, 226)",
	"rgb(154, 205, 50)",
	"rgb(178, 34, 34)",
	"rgb(210, 105, 30)",
	"rgb(218, 165, 32)",
	"rgb(255, 0, 0)",
	"rgb(255, 69, 0)",
	"rgb(255, 105, 180)",
	"rgb(255, 127, 80)",
];

export interface RelationshipSubscription {
	type: "prime" | "paid" | "gift" | null;
	tier: string | null;
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
	subscription: RelationshipSubscription;
}

export class User {
	/**
	 * Creates a user from what chat says about them; {@linkcode fetch} loads
	 * the rest.
	 */
	public static partial(client: TwitchClient, sender: BasicUser, color: string | null) {
		return new User(client, {
			id: sender.id,
			login: sender.login,
			displayName: sender.name,
			chatColor: color,
			createdAt: "",
			description: "",
			profileImageURL: "",
			bannerImageURL: "",
		});
	}

	public readonly id: string;

	/**
	 * The relationships of the user to other channels.
	 */
	public readonly relationships = new SvelteMap<string, Relationship>();

	/**
	 * The 7TV paint for the user if they have one set.
	 */
	public readonly paint?: Paint;

	/**
	 * When the account was created; `null` until the profile is loaded for
	 * users only seen in chat.
	 */
	public createdAt = $state<Date | null>(null);
	public bio: string;
	public avatarUrl: string;

	/**
	 * The url of the user's banner image seen when they are offline.
	 */
	public bannerUrl: string;
	public username: string;

	#color: string | null;
	#displayName: string;

	public constructor(
		public readonly client: TwitchClient,
		public readonly data: ApiUser,
	) {
		this.#color = data.chatColor || null;
		this.#displayName = data.displayName;

		this.id = data.id;
		this.username = data.login;

		this.createdAt = data.createdAt ? new Date(data.createdAt) : null;

		this.bio = $state(data.description ?? "");
		this.avatarUrl = $state(data.profileImageURL ?? "");
		this.bannerUrl = $state(data.bannerImageURL ?? "");

		this.paint = $derived(app.cosmetics.userPaints.get(this.id));
	}

	/**
	 * The color of the user's name. Defaults to the current foreground color
	 * if the user doesn't have a color set.
	 */
	public get color(): string {
		const color = this.#color ?? this.#fallbackColor();
		return settings.state["chat.usernames.readable"] ? makeReadable(color) : color;
	}

	public set color(color: string | null) {
		this.#color = color || null;
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
	 * The CSS style for mentions of the user.
	 */
	public get mentionStyle() {
		switch (settings.state["chat.usernames.mentionStyle"]) {
			case "none":
				return null;
			case "colored":
				return `color: ${this.color};`;
			case "painted":
				return this.style;
			default:
				return null;
		}
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

	/**
	 * Whether only what chat says about the user is known.
	 */
	public get partial() {
		return this.createdAt === null;
	}

	/**
	 * Refreshes the user's profile.
	 */
	public async fetch() {
		const { user } = await this.client.gql(userQuery, { id: this.id, login: null });
		if (user) this.update(user);

		return this;
	}

	public async fetchRelationship(channel: Channel) {
		const existing = this.relationships.get(channel.id);
		if (existing) return existing;

		const { channelViewer, user } = await this.client.gql(relationshipQuery, {
			user: this.username,
			channelId: channel.id,
			channel: channel.user.username,
		});

		const rel = user?.relationship;
		if (!channelViewer || !rel) return null;

		const type = rel.sub?.gift?.isGift
			? "gift"
			: rel.sub?.purchasedWithPrime
				? "prime"
				: rel.sub?.tier
					? "paid"
					: null;

		this.relationships.set(channel.id, {
			badges: channelViewer.earnedBadges?.map(Badge.fromGql) ?? [],
			followedAt: rel.followedAt ? new Date(rel.followedAt) : null,
			subscription: {
				type,
				tier: rel.sub?.tier?.slice(0, -3) ?? null,
				months: rel.tenure?.months ?? null,
			},
		});

		return rel;
	}

	/**
	 * Updates what may have changed since the user was first seen.
	 */
	public update(data: ApiUser) {
		this.createdAt = new Date(data.createdAt);
		this.bio = data.description ?? "";
		this.avatarUrl = data.profileImageURL ?? "";
		this.bannerUrl = data.bannerImageURL ?? "";
	}

	#fallbackColor() {
		if (!settings.state["chat.usernames.randomColor"]) {
			return "inherit";
		}

		// Twitch user ids are numeric.
		return COLORS[Number(this.id) % COLORS.length] ?? COLORS[0];
	}
}
