import { app } from "$lib/app.svelte";
import {
	allowHeldMessageMutation,
	deleteMessageMutation,
	denyHeldMessageMutation,
} from "$lib/graphql/twitch";
import { settings } from "$lib/settings";
import type {
	BasicUser,
	Badge as IrcBadge,
	Emote,
	PrivmsgMessage,
	Reply,
	Source,
	UserNoticeEvent,
	UserNoticeMessage,
} from "$lib/twitch/irc";
import type { AutoModFragment } from "$lib/twitch/pubsub";
import type { ChannelPointReward } from "$lib/twitch/pubsub";

import type { Channel } from "../channel.svelte";
import type { Node } from "./parse";

import { Badge } from "../badge";
import { User } from "../user.svelte";
import { Viewer } from "../viewer.svelte";
import { extractEmotes, type MessageFragment } from "./fragment";
import { parse } from "./parse";
import { TextualMessage, type TextualMessageInit } from "./textual-message.svelte";

function createPartialUser(channel: Channel, sender: BasicUser, color: string) {
	const user = new User(channel.client, {
		id: sender.id,
		createdAt: "0",
		login: sender.login,
		displayName: sender.name,
		description: "",
		chatColor: color,
		profileImageURL: "",
		bannerImageURL: "",
		roles: null,
	});

	const viewer = new Viewer(channel, user);
	channel.viewers.set(user.id, viewer);

	return user;
}

interface UserMessageInit extends TextualMessageInit {
	id: string;
	text: string;
	sender: BasicUser;
	color: string;
	badges: IrcBadge[];
	emotes: Emote[];
	bits: number;
	action: boolean;
	highlighted: boolean;
	shared: boolean;
	event: UserNoticeEvent | null;
	reply: Reply | null;
}

interface FromMessage {
	id: string;
	text: string;
	fragments: MessageFragment[];
	sender: BasicUser;
	color?: string;
	badges?: IrcBadge[];
	timestamp?: number;
}

export interface AutoModMetadata {
	category: string;
	level: number;

	/**
	 * The message content split into fragments, where the fragments caught by
	 * AutoMod carry an `automod` property.
	 */
	fragments: AutoModFragment[];
}

/**
 * User messages are either messages received by `PRIVMSG` commands or
 * notifications received by `USERNOTICE` commands.
 */
export class UserMessage extends TextualMessage {
	#nodes: Node[] = [];
	#badges: IrcBadge[];

	public override readonly [Symbol.toStringTag] = "UserMessage";
	public override readonly id: string;
	public override readonly text: string;

	/**
	 * The user who sent the message.
	 */
	public readonly author: User;

	/**
	 * The viewer who sent the message if it was sent in a channel.
	 */
	public viewer: Viewer | null = null;

	/**
	 * Whether the message is an action i.e. sent with `/me`.
	 */
	public readonly action: boolean;

	/**
	 * Whether channel points were used to highlight the message.
	 */
	public readonly highlighted: boolean;

	/**
	 * Whether the message was sent in a shared chat.
	 */
	public readonly shared: boolean;

	/**
	 * The badges sent with the message.
	 */
	public readonly badges: Badge[] = [];

	/**
	 * The amount of bits sent with the message if it was a cheer.
	 */
	public readonly bits: number;

	/**
	 * The Twitch emotes in the message, located by their range in the text.
	 */
	public readonly emotes: Emote[];

	/**
	 * The event associated with the message if it's a `USERNOTICE` message.
	 */
	public readonly event: UserNoticeEvent | null;

	/**
	 * The metadata for the parent and thread starter messages if the message
	 * is a reply.
	 */
	public readonly reply: Reply | null;

	/**
	 * The source channel for the message if it was sent in a shared chat. By
	 * default, this is the same value as {@linkcode channel}.
	 */
	public source: Channel;

	/**
	 * The AutoMod metadata attached to the message if it was caught by AutoMod.
	 */
	public autoMod: AutoModMetadata | null = null;

	/**
	 * The channel point reward redeemed to send this message, if any.
	 */
	public redemption = $state<ChannelPointReward | null>(null);

	private constructor(channel: Channel, init: UserMessageInit) {
		super(channel, init);

		const viewer = channel.viewers.get(init.sender.id);

		this.id = init.id;
		this.text = init.text;

		this.author = viewer?.user ?? createPartialUser(channel, init.sender, init.color);
		this.viewer = viewer ?? null;

		this.action = init.action;
		this.highlighted = init.highlighted;
		this.shared = init.shared;

		this.bits = init.bits;
		this.emotes = init.emotes;
		this.event = init.event;
		this.reply = init.reply;
		this.source = this.channel;

		this.#badges = init.badges;
		this.#populateBadges();
	}

	/**
	 * Creates a user message from a `PRIVMSG` or `USERNOTICE` command.
	 */
	public static fromIrc(channel: Channel, data: PrivmsgMessage | UserNoticeMessage) {
		const tags = data.source ?? data;
		const notice = data.type === "usernotice";

		return new this(channel, {
			id: data.message_id,
			text: data.message_text ?? "",
			sender: data.sender,
			color: data.name_color,
			badges: tags.badges,
			emotes: data.emotes,
			bits: (notice ? null : data.bits) ?? 0,
			action: !notice && data.is_action,
			highlighted: !notice && data.is_highlighted,
			shared: data.source != null,
			event: notice ? data.event : null,
			reply: notice ? null : data.reply,
			deleted: data.deleted,
			recent: data.is_recent,
			timestamp: data.server_timestamp,
		});
	}

	public static from(channel: Channel, msg: FromMessage) {
		const action = /^\x01ACTION.*$/.test(msg.text);
		const text = action ? msg.text.slice(8, -1) : msg.text;

		return new this(channel, {
			id: msg.id,
			text,
			sender: msg.sender,
			color: msg.color ?? "",
			badges: msg.badges ?? [],
			emotes: extractEmotes(msg.fragments),
			bits: msg.fragments.reduce((a, b) => a + (b.type === "cheermote" ? b.bits : 0), 0),
			action,
			highlighted: false,
			shared: false,
			event: null,
			reply: null,
			deleted: false,
			recent: false,
			timestamp: msg.timestamp ?? Date.now(),
		});
	}

	/**
	 * Whether the current user can perform mod actions on the message.
	 *
	 * A message is considered actionable if they are a mod in the channel, the
	 * message is less than six hours old, and one of the following is true:
	 *
	 * 1. It is their own message
	 * 2. It is a message that is not sent by the broadcaster or another
	 * moderator
	 */
	public get actionable() {
		if (!app.user) return false;

		const now = Date.now();
		const diff = Math.abs(now - this.timestamp.getTime());

		return (
			this.channel.isMod &&
			diff <= 6 * 60 * 60 * 1000 &&
			(app.user.id === this.author.id || !this.viewer?.moderator)
		);
	}

	// This is a getter to lazily parse on first access since not all information
	// is present during instantiation e.g. in the case of automod metadata being
	// attached later.
	public get nodes() {
		if (!this.#nodes.length) {
			this.#nodes = parse(this).toSorted((a, b) => a.start - b.start);
		}

		return this.#nodes;
	}

	/**
	 * Whether the message is currently pinned in chat.
	 */
	public get pinned() {
		return this.channel.chat.pinned?.message.id === this.id;
	}

	public async setSource(source: Source) {
		if (source.channel_id === this.channel.id) {
			return;
		}

		this.source = await app.channels.fetch(source.channel_id);
		await this.source.fetchBadges();

		this.#populateBadges();
	}

	/**
	 * Deletes the message from chat.
	 */
	public async delete() {
		if (!app.user || !this.channel.isMod) return;

		await this.channel.client.gql(deleteMessageMutation, {
			channel: this.channel.id,
			message: this.id,
		});
	}

	/**
	 * Allows the message to post to chat if it was caught by AutoMod to be held
	 * for review.
	 */
	public async allow() {
		await this.#updateHeldMessage(true);
	}

	/**
	 * Denies the message from posting to chat if it was caught by AutoMod to be
	 * held for review.
	 */
	public async deny() {
		await this.#updateHeldMessage(false);
	}

	public async pin() {
		await this.channel.chat.pin(this.id);
	}

	#populateBadges() {
		this.badges.length = 0;

		if (this.shared) {
			const { user } = this.source;

			this.badges.push(
				new Badge({
					setId: "shared-chat",
					version: user.id,
					title: user.displayName,
					description: user.displayName,
					imageUrl: user.avatarUrl,
				}),
			);
		}

		for (const badge of this.#badges) {
			const id = `${badge.name}:${badge.version}`;

			const chatBadge = this.source.badges.get(id);
			const globalBadge = app.badges.get(id);

			const resolved = chatBadge ?? globalBadge;

			if (resolved) {
				this.badges.push(resolved);
			}
		}

		const providerBadges = app.badges.users.get(this.author.id);

		if (providerBadges) {
			const external = providerBadges
				.filter((b) => {
					if (b.setId === "ffz" && !settings.state["chat.badges.ffz"]) return false;
					if (b.setId === "bttv" && !settings.state["chat.badges.bttv"]) return false;
					if (b.setId === "7tv" && !settings.state["chat.badges.seventv"]) return false;

					return true;
				})
				.toSorted((a, b) => b.setId.localeCompare(a.setId));

			this.badges.push(...external);
		}
	}

	async #updateHeldMessage(allow: boolean) {
		if (!app.user || !this.channel.isMod) return;

		const mutation = allow ? allowHeldMessageMutation : denyHeldMessageMutation;

		try {
			await this.channel.client.gql(mutation, {
				message: this.id,
			});
		} finally {
			this.deleted = true;
		}
	}
}
