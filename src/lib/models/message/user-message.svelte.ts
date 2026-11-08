import type {
	BasicUser,
	Badge as IrcBadge,
	Emote,
	Gif,
	PrivmsgMessage,
	Reply,
	UserNoticeEvent,
	UserNoticeMessage,
} from "#lib/twitch/irc.js";
import type { AutoModFragment } from "#lib/twitch/pubsub.js";
import type { ChannelPointReward } from "#lib/twitch/pubsub.js";

import { app } from "#lib/app.svelte.js";
import { THIRD_PARTY_PROVIDERS } from "#lib/emotes.js";
import {
	allowHeldMessageMutation,
	deleteMessageMutation,
	denyHeldMessageMutation,
} from "#lib/graphql/twitch.js";
import { log } from "#lib/log.js";
import { settings } from "#lib/settings/index.js";

import type { Channel } from "../channel.svelte";
import type { Node } from "./parse";

import { Badge } from "../badge";
import { User } from "../user.svelte";
import { Viewer } from "../viewer.svelte";
import { extractEmotes, type MessageFragment } from "./fragment";
import { Message, type MessageInit } from "./message.svelte";
import { parse } from "./parse";

const MOD_ACTION_WINDOW = 6 * 60 * 60 * 1000;

/**
 * The viewer who sent the message, registering a partial one built from the
 * message if they haven't been seen yet.
 */
function senderOf(channel: Channel, sender: BasicUser, color: string | null) {
	const known = channel.viewers.get(sender.id);
	if (known) return known;

	const user = User.partial(channel.client, sender, color);

	const viewer = new Viewer(channel, user);
	channel.viewers.set(user.id, viewer);

	return viewer;
}

interface UserMessageInit extends MessageInit {
	id: string;
	text: string;
	sender: BasicUser;
	color: string | null;
	badges: IrcBadge[];
	emotes: Emote[];
	bits: number;
	gif: Gif | null;
	action: boolean;
	highlighted: boolean;
	shared: boolean;
	event: UserNoticeEvent | null;
	systemMessage: string;
	reply: Reply | null;
}

interface FromMessage {
	id: string;
	text: string;
	fragments: MessageFragment[];
	sender: BasicUser;
	color?: string | null;
	badges?: IrcBadge[];
	timestamp?: number;
}

export type AutoModMetadata = (
	| { reason: "blocked-term" }
	| {
			reason: "automod";

			/**
			 * The AutoMod category that caught the message, e.g. `swearing` or
			 * `smartdetection`.
			 */
			category: string;
			level: number;
	  }
) & {
	/**
	 * The message content split into fragments, where the fragments caught by
	 * AutoMod carry an `automod` property.
	 */
	fragments: AutoModFragment[];
};

/**
 * User messages are either messages received by `PRIVMSG` commands or
 * notifications received by `USERNOTICE` commands.
 */
export class UserMessage extends Message {
	#nodes: Node[] | null = null;
	#badges: IrcBadge[];

	public override readonly [Symbol.toStringTag] = "UserMessage";
	public override readonly id: string;
	public override readonly text: string;

	public readonly author: User;

	public readonly viewer: Viewer;

	/**
	 * Whether the message is an action i.e. sent with `/me`.
	 */
	public readonly action: boolean;

	/**
	 * Whether channel points were used to highlight the message.
	 */
	public readonly highlighted: boolean;

	public readonly shared: boolean;

	public readonly badges: Badge[] = [];

	public readonly bits: number;

	/**
	 * The Twitch emotes in the message, located by their range in the text.
	 */
	public readonly emotes: Emote[];

	/**
	 * The GIF sent with the message, if any. The message text is the alt text
	 * for the GIF.
	 */
	public readonly gif: Gif | null;

	/**
	 * The event associated with the message if it's a `USERNOTICE` message.
	 */
	public readonly event: UserNoticeEvent | null;

	/**
	 * Twitch's own description of the event, for events without a dedicated
	 * rendering.
	 */
	public readonly systemMessage: string;

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

	public autoMod: AutoModMetadata | null = null;

	/**
	 * The channel point reward redeemed to send this message, if any.
	 */
	public redemption = $state<ChannelPointReward | null>(null);

	private constructor(channel: Channel, init: UserMessageInit) {
		super(channel, init);

		this.id = init.id;
		this.text = init.text;

		this.viewer = senderOf(channel, init.sender, init.color);
		this.author = this.viewer.user;

		this.action = init.action;
		this.highlighted = init.highlighted;
		this.shared = init.shared;

		this.bits = init.bits;
		this.emotes = init.emotes;
		this.gif = init.gif;
		this.event = init.event;
		this.systemMessage = init.systemMessage;
		this.reply = init.reply;
		this.source = this.channel;

		this.#badges = init.badges;
		this.#populateBadges();
	}

	/**
	 * Creates a user message from a `PRIVMSG` or `USERNOTICE` command, updating
	 * what the command says about its sender.
	 */
	public static async fromIrc(channel: Channel, data: PrivmsgMessage | UserNoticeMessage) {
		const tags = data.source ?? data;
		const notice = data.type === "usernotice";

		const message = new this(channel, {
			id: data.message_id,
			text: data.message_text ?? "",
			sender: data.sender,
			color: data.name_color,
			badges: tags.badges,
			emotes: data.emotes,
			bits: (notice ? null : data.bits) ?? 0,
			gif: notice ? null : data.gif,
			action: !notice && data.is_action,
			highlighted: !notice && data.is_highlighted,
			shared: data.source != null,
			event: notice ? data.event : null,
			systemMessage: notice ? data.system_message : "",
			reply: notice ? null : data.reply,
			deleted: data.deleted,
			recent: data.is_recent,
			timestamp: data.server_timestamp,
		});

		const { author, viewer } = message;

		author.color = data.name_color;
		author.username = data.sender.login;
		author.displayName = data.sender.name;

		if (!notice) {
			viewer.moderator = data.is_mod;
			viewer.subscriber = data.is_subscriber;
			viewer.vip = tags.badges.some((b) => b.name.startsWith("vip"));
			viewer.returning = data.is_returning_chatter;
			viewer.new = data.is_first_msg;
		}

		if (data.source && data.source.channel_id !== channel.id) {
			try {
				const source = await app.channels.fetchUnlisted(data.source.channel_id);
				await source.badges.fetch();

				message.source = source;
				message.#populateBadges();
			} catch (error) {
				// The message is still shown, just without the source's badges.
				log.warn("Failed to load shared chat source", error);
			}
		}

		return message;
	}

	public static from(channel: Channel, msg: FromMessage) {
		// CTCP ACTION framing: "\x01ACTION <text>\x01"
		const match = /^\x01ACTION (.*?)\x01?$/s.exec(msg.text);
		const action = match !== null;
		const text = match ? match[1] : msg.text;

		return new this(channel, {
			id: msg.id,
			text,
			sender: msg.sender,
			color: msg.color ?? null,
			badges: msg.badges ?? [],
			emotes: extractEmotes(msg.fragments),
			bits: msg.fragments.reduce((a, b) => a + (b.type === "cheermote" ? b.bits : 0), 0),
			action,
			highlighted: false,
			shared: false,
			gif: null,
			event: null,
			systemMessage: "",
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
			diff <= MOD_ACTION_WINDOW &&
			(app.user.id === this.author.id || !this.viewer.moderator)
		);
	}

	// This is a getter to lazily parse on first access since not all information
	// is present during instantiation e.g. in the case of automod metadata being
	// attached later.
	public get nodes() {
		this.#nodes ??= parse(this).toSorted((a, b) => a.start - b.start);

		return this.#nodes;
	}

	public get pinned() {
		return this.channel.chat.pinned?.message.id === this.id;
	}

	public async delete() {
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
			const id = Badge.key(badge.name, badge.version);

			const chatBadge = this.source.badges.get(id);
			const globalBadge = app.badges.get(id);

			const resolved = chatBadge ?? globalBadge;

			if (resolved) {
				this.badges.push(resolved);
			}
		}

		const enabled = new Set<string>(
			THIRD_PARTY_PROVIDERS.filter((p) => settings.state[p.badgesSetting]).map(
				(p) => p.badgeSetId,
			),
		);

		const external = (app.badges.users.get(this.author.id) ?? [])
			.filter((badge) => enabled.has(badge.setId))
			.toSorted((a, b) => b.setId.localeCompare(a.setId));

		this.badges.push(...external);
	}

	async #updateHeldMessage(allow: boolean) {
		const mutation = allow ? allowHeldMessageMutation : denyHeldMessageMutation;

		await this.channel.client.gql(mutation, { message: this.id });
		this.deleted = true;
	}
}
