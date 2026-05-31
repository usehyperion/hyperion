import type { Component, ComponentProps } from "svelte";
import { app } from "$lib/app.svelte";
import type { Command } from "$lib/commands";
import { log } from "$lib/log";
import { settings } from "$lib/settings";
import { sendPresence } from "$lib/seventv";
import type { SentMessage } from "$lib/twitch/api";
import { commands } from "../commands";
import Notice from "../components/message/events/Notice.svelte";
import type { Channel } from "./channel.svelte";
import { ComponentMessage } from "./message/component-message";
import { EventMessage, type EventMessageData } from "./message/event-message";
import type { Message } from "./message/message";
import { TextualMessage } from "./message/textual-message.svelte";
import type { UserMessage } from "./message/user-message";
import { Viewer } from "./viewer.svelte";

const RATE_LIMIT_WINDOW = 30 * 1000;
const RATE_LIMIT_GRACE = 1000;

export interface ChatMode {
	unique: boolean;
	subOnly: boolean;
	emoteOnly: boolean;
	followerOnly: number | boolean;
	slow: number | boolean;
}

export interface ChatSettings {
	unique?: boolean;
	subOnly?: boolean;
	emoteOnly?: boolean;
	followerOnly?: boolean;
	followerOnlyDuration?: number;
	slow?: number;
}

export class Chat {
	#bypassNext = false;
	#lastRecentAt: number | null = null;

	// Timestamps of last messages sent by normal/elevated users.
	#lastMessage: number[] = [];
	#lastMessageElevated: number[] = [];

	// Timestamps of the last rate limit hits by speed/amount.
	#lastHitSpdAt: number;
	#lastHitAmtAt: number;

	/**
	 * The commands available in the chat.
	 */
	public readonly commands = new Map<string, Command>();

	public mode: ChatMode;

	/**
	 * An array of messages sent in the chat.
	 */
	public messages = $state<Message[]>([]);

	/**
	 * An array of messages the current user has sent in the chat.
	 */
	public history: string[] = [];

	public input = $state<HTMLInputElement | null>(null);
	public value = $state("");

	/**
	 * The message the current user is replying to if any.
	 */
	public replyTarget = $state<UserMessage | null>(null);

	public constructor(public readonly channel: Channel) {
		const now = performance.now();

		this.#lastHitSpdAt = now - RATE_LIMIT_WINDOW * 2;
		this.#lastHitAmtAt = now - RATE_LIMIT_WINDOW * 2;

		this.mode = $state({
			emoteOnly: false,
			unique: false,
			slow: false,
			followerOnly: false,
			subOnly: false,
		});

		this.addCommands(commands);
	}

	/**
	 * Pushes a message into the chat, deduplicating by id and inserting recent
	 * (history) messages above live ones.
	 */
	public add(message: Message) {
		if (this.messages.some((m) => m.id === message.id)) {
			return this;
		}

		if (message instanceof TextualMessage && message.recent) {
			if (this.#lastRecentAt === null) {
				this.messages.unshift(message);
				this.#lastRecentAt = 0;
			} else {
				this.messages.splice(this.#lastRecentAt + 1, 0, message);
				this.#lastRecentAt++;
			}
		} else {
			this.messages.push(message);
		}

		return this;
	}

	/**
	 * Adds a channel event rendered by the given component.
	 */
	public event<C extends Component<any>>(
		component: C,
		props: ComponentProps<C> = {} as never,
		data?: Partial<EventMessageData>,
	) {
		return this.add(new EventMessage(this.channel, component, props, data));
	}

	/**
	 * Adds a plain-text system notice.
	 */
	public notice(text: string, data?: Partial<EventMessageData>) {
		return this.event(Notice, { text }, data);
	}

	/**
	 * Adds an arbitrary, chrome-less component to the chat.
	 */
	public component<C extends Component<any>>(
		component: C,
		props: ComponentProps<C> = {} as never,
	) {
		return this.add(new ComponentMessage(component, props));
	}

	public addCommands(commands: Command[]) {
		for (const command of commands) {
			this.commands.set(command.name, command);
		}

		return this;
	}

	public deleteMessages(id?: string) {
		for (const message of this.messages) {
			if (
				message instanceof TextualMessage &&
				message.isUser() &&
				(!id || message.author.id === id)
			) {
				message.deleted = true;
			}
		}
	}

	public async clear() {
		if (!app.user?.moderating.has(this.channel.id)) {
			return;
		}

		await this.channel.client.delete("/moderation/chat", {
			broadcaster_id: this.channel.id,
			moderator_id: app.user.id,
		});
	}

	public reset() {
		this.#bypassNext = false;
		this.#lastRecentAt = null;
		this.replyTarget = null;
		this.messages = [];
		this.history = [];
	}

	public async announce(message: string) {
		if (!app.user?.moderating.has(this.channel.id)) {
			return;
		}

		await this.channel.client.post("/chat/announcements", {
			params: {
				broadcaster_id: this.channel.id,
				moderator_id: app.user.id,
			},
			body: {
				message,
			},
		});
	}

	public async setShieldMode(active = true) {
		if (!app.user?.moderating.has(this.channel.id)) {
			return;
		}

		await this.channel.client.put("/moderation/shield_mode", {
			params: {
				broadcaster_id: this.channel.id,
				moderator_id: app.user.id,
			},
			body: {
				is_active: active,
			},
		});
	}

	public async updateSettings(settings: ChatSettings) {
		if (!app.user?.moderating.has(this.channel.id)) {
			return;
		}

		const followDuration =
			typeof this.mode.followerOnly === "number" ? this.mode.followerOnly : 0;

		const slowDuration = settings.slow ?? this.mode.slow;
		const isSlow = typeof slowDuration === "number" && slowDuration > 0;

		await this.channel.client.patch("/chat/settings", {
			params: {
				broadcaster_id: this.channel.id,
				moderator_id: app.user.id,
			},
			body: {
				subscriber_mode: settings.subOnly ?? this.mode.subOnly,
				follower_mode: settings.followerOnly ?? this.mode.followerOnly !== false,
				follower_mode_duration: settings.followerOnlyDuration ?? followDuration,
				slow_mode: isSlow,
				slow_mode_wait_time: isSlow ? slowDuration : 3,
				unique_chat_mode: settings.unique ?? this.mode.unique,
				emote_mode: settings.emoteOnly ?? this.mode.emoteOnly,
			},
		});
	}

	public async send(message: string) {
		if (!app.user) return;

		const viewer = this.channel.viewers.get(app.user.id) ?? new Viewer(this.channel, app.user);
		const elevated = viewer.moderator || viewer.vip;

		if (message.startsWith("/")) {
			const [name, ...args] = message.slice(1).split(" ");

			const command = this.commands.get(name);
			if (!command || (command.modOnly && !viewer.moderator)) return;

			try {
				await command.exec(args, this.channel, viewer.user);
			} catch (error) {
				if (error instanceof Error) {
					log.error(
						`Error executing command ${name} in channel ${this.channel.user.username}: ${error.message}`,
					);
				}

				throw error;
			}

			return;
		}

		const rateLimited = this.#checkRateLimit(elevated);
		if (rateLimited) return;

		if (
			!elevated &&
			settings.state["chat.messages.duplicateBypass"] &&
			this.history.at(-1) === message
		) {
			this.#bypassNext = !this.#bypassNext;

			if (this.#bypassNext) {
				message = `${message} \u{E0000}`;
			}
		} else {
			this.#bypassNext = false;
		}

		log.info(`Sending message in ${this.channel.user.username} (${this.channel.id})`);

		// Optimistically reset replyTarget to avoid UI delay
		const replyId = this.replyTarget?.id;
		this.replyTarget = null;

		const {
			data: [data],
		} = await this.channel.client.post<[SentMessage]>("/chat/messages", {
			body: {
				broadcaster_id: this.channel.id,
				sender_id: viewer.id,
				reply_parent_message_id: replyId,
				message,
			},
		});

		if (data.is_sent) {
			log.info("Message sent");
			await sendPresence(this.channel.id);
		} else if (data.drop_reason) {
			const reason = data.drop_reason.message;

			log.warn(`Message dropped: ${reason}`);
			this.notice(reason);
		}
	}

	#checkRateLimit(elevated: boolean) {
		const now = performance.now();

		const queue = elevated ? this.#lastMessageElevated : this.#lastMessage;
		const maxMsgCount = elevated ? 99 : 19;
		const minMsgOffset = elevated ? 100 : 1100;

		const last = queue.at(-1);

		if (last && last + minMsgOffset > now) {
			if (this.#lastHitSpdAt + RATE_LIMIT_WINDOW < now) {
				this.#lastHitSpdAt = now;
			}

			return true;
		}

		while (queue.length && queue[0] + RATE_LIMIT_WINDOW + RATE_LIMIT_GRACE < now) {
			queue.shift();
		}

		if (queue.length >= maxMsgCount) {
			if (this.#lastHitAmtAt + RATE_LIMIT_WINDOW < now) {
				this.#lastHitAmtAt = now;
			}

			return true;
		}

		queue.push(now);
		return false;
	}
}
