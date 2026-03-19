import { app } from "$lib/app.svelte";
import { settings } from "$lib/settings";
import type { AutoModMetadata, StructuredMessage } from "$lib/twitch/eventsub";
import type {
	BasicUser,
	PrivmsgMessage,
	Reply,
	Source,
	UserNoticeEvent,
	UserNoticeMessage,
} from "$lib/twitch/irc";
import { extractEmotes } from "$lib/util";
import { Badge } from "../badge";
import { User } from "../user.svelte";
import { Viewer } from "../viewer.svelte";
import type { Channel } from "../channel.svelte";
import { parse } from "./parse";
import { TextualMessage } from "./textual-message.svelte";
import type { Node } from "./parse";

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

/**
 * User messages are either messages received by `PRIVMSG` commands or
 * notifications received by `USERNOTICE` commands.
 */
export class UserMessage extends TextualMessage {
	#nodes: Node[] = [];

	public override readonly id: string;
	public override readonly text: string;

	public readonly [Symbol.toStringTag] = "UserMessage";

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

	public constructor(
		channel: Channel,
		public readonly data: PrivmsgMessage | UserNoticeMessage,
	) {
		super(channel, data);

		const viewer = channel.viewers.get(data.sender.id);

		this.id = data.message_id;

		// message_text should only be possibly null if it's a USERNOTICE, in
		// which case we can assume system_message is present
		this.text = data.message_text ?? (data as UserNoticeMessage).system_message;

		this.author = viewer?.user ?? createPartialUser(channel, data.sender, data.name_color);
		this.viewer = viewer ?? null;

		this.action = "is_action" in data && data.is_action;
		this.highlighted = "is_highlighted" in data && data.is_highlighted;
		this.shared = data.source != null;

		this.bits = "bits" in data ? (data.bits ?? 0) : 0;
		this.event = "event" in data ? data.event : null;
		this.reply = "reply" in data ? data.reply : null;
		this.source = this.channel;

		this.#populateBadges();
	}

	/**
	 * Creates a user message from a message received over EventSub.
	 */
	public static from(channel: Channel, message: StructuredMessage, sender: BasicUser) {
		const isAction = /^\x01ACTION.*$/.test(message.text);
		const text = isAction ? message.text.slice(8, -1) : message.text;

		return new this(channel, {
			type: "privmsg",
			badge_info: [],
			badges: [],
			bits: message.fragments.reduce((a, b) => {
				return a + (b.type === "cheermote" ? b.cheermote.bits : 0);
			}, 0),
			channel_id: "",
			channel_login: "",
			deleted: false,
			emotes: extractEmotes(message.fragments),
			message_id: message.message_id,
			message_text: text,
			name_color: "",
			is_action: isAction,
			is_first_msg: false,
			is_highlighted: false,
			is_mod: false,
			is_subscriber: false,
			is_recent: false,
			is_returning_chatter: false,
			reply: null,
			sender,
			source_only: false,
			source: null,
			server_timestamp: Date.now(),
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
			app.user.moderating.has(this.channel.id) &&
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

	public async setSource(source: Source) {
		if (source.channel_id === this.channel.id) {
			return;
		}

		this.source = await app.channels.fetch(source.channel_id);
		await this.source.fetchBadges();
	}

	/**
	 * Deletes the message from chat.
	 */
	public async delete() {
		if (!app.user?.moderating.has(this.channel.id)) {
			return;
		}

		await this.channel.client.delete("/moderation/chat", {
			broadcaster_id: this.channel.id,
			moderator_id: app.user.id,
			message_id: this.id,
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

		for (const badge of (this.data.source ?? this.data).badges) {
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
		if (!app.user?.moderating.has(this.channel.id)) {
			return;
		}

		try {
			await this.channel.client.post("/moderation/automod/message", {
				body: {
					user_id: app.user.id,
					msg_id: this.id,
					action: allow ? "ALLOW" : "DENY",
				},
			});
		} finally {
			this.deleted = true;
		}
	}
}
