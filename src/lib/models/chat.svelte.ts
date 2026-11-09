import { invoke } from "@tauri-apps/api/core";
import type { Component, ComponentProps } from "svelte";

import type { Command } from "#lib/commands/index.js";

import { app } from "#lib/app.svelte.js";
import {
	pinMessageMutation,
	sendAnnouncementMutation,
	sendMessageMutation,
	sendPinnedMessageMutation,
	shieldModeMutation,
	updateChatSettingsMutation,
	updateChatSubOnlyMode,
} from "#lib/graphql/twitch.js";
import { log } from "#lib/log.js";
import { settings } from "#lib/settings/index.js";

import type { Channel } from "./channel.svelte";
import type { Message } from "./message/message.svelte";

import { commands } from "../commands";
import Notice from "../components/message/events/Notice.svelte";
import { RedemptionManager } from "../managers/redemption-manager";
import { EventMessage, type EventMeta } from "./message/event-message";
import { UserMessage } from "./message/user-message.svelte";
import { Pin } from "./pin.svelte";

const RATE_LIMIT_WINDOW = 30 * 1000;
const RATE_LIMIT_GRACE = 1000;

export interface ChatMode {
	unique: boolean;
	subOnly: boolean;
	emoteOnly: boolean;

	/**
	 * Minutes an account must have followed to chat (0 for any follower), or
	 * `null` when follower-only mode is off.
	 */
	followerOnly: number | null;

	/**
	 * Seconds between messages; 0 when slow mode is off.
	 */
	slow: number;
}

export interface ChatSettings {
	unique?: boolean;
	emoteOnly?: boolean;
	followerOnly?: boolean;
	followerOnlyDuration?: number;
	slow?: number;
}

export class Chat {
	/**
	 * The commands available in the chat.
	 */
	public readonly commands = new Map<string, Command>();
	public readonly redemptions = new RedemptionManager();

	public mode: ChatMode;
	public messages = $state<Message[]>([]);

	/**
	 * What the current user has entered in the chat.
	 */
	public history: string[] = [];
	public input = $state<HTMLInputElement | null>(null);

	public value = $state("");
	public pinned = $state<Pin | null>(null);

	/**
	 * The message the current user is replying to, if any.
	 */
	public replyTarget = $state<UserMessage | null>(null);

	#ids = new Set<string>();

	#bypassNext = false;

	#lastSent: string | null = null;
	#lastRecentAt: number | null = null;

	// Timestamps of last messages sent by normal/elevated users.
	#lastMessage: number[] = [];
	#lastMessageElevated: number[] = [];

	public constructor(public readonly channel: Channel) {
		this.mode = $state({
			emoteOnly: false,
			unique: false,
			slow: 0,
			followerOnly: null,
			subOnly: false,
		});

		this.addCommands(commands);
	}

	public addCommands(commands: Command[]) {
		for (const command of commands) {
			this.commands.set(command.name, command);
		}

		return this;
	}

	public add(message: Message) {
		if (this.#ids.has(message.id)) {
			return this;
		}

		this.#ids.add(message.id);

		if (message.recent) {
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

	public repost(message: Message) {
		const index = this.messages.indexOf(message);
		if (index === -1) return this;

		this.messages.splice(index, 1);
		this.messages.push(message);

		if (this.#lastRecentAt !== null && index <= this.#lastRecentAt) {
			this.#lastRecentAt--;
		}

		return this;
	}

	/**
	 * Adds a channel event rendered by the given component.
	 */
	public event<C extends Component<any>>(
		component: C,
		props: ComponentProps<C>,
		meta?: Partial<EventMeta>,
	) {
		return this.add(new EventMessage(this.channel, component, props, meta));
	}

	/**
	 * Adds a plain text system notice.
	 */
	public notice(text: string, meta?: Partial<EventMeta>) {
		return this.event(Notice, { text }, meta);
	}

	public deleteMessages(id?: string) {
		for (const message of this.messages) {
			if (message.isUser() && (!id || message.author.id === id)) {
				message.deleted = true;
			}
		}
	}

	public async clear() {
		await invoke("privmsg", {
			channel: this.channel.user.username,
			message: "/clear",
		});
	}

	public reset() {
		this.#bypassNext = false;
		this.#lastSent = null;
		this.#lastRecentAt = null;
		this.replyTarget = null;
		this.messages = [];
		this.history = [];

		this.#ids.clear();

		this.setPin(null);

		this.redemptions.clear();
	}

	public async announce(message: string) {
		await this.channel.client.gql(sendAnnouncementMutation, {
			channel: this.channel.id,
			message,
		});
	}

	public async pin(id: string) {
		await this.channel.client.gql(pinMessageMutation, {
			channel: this.channel.id,
			message: id,
		});

		await this.fetchPinned();
	}

	public async fetchPinned() {
		const pin = await Pin.fetch(this);

		if (pin && this.pinned?.message.id === pin.message.id) {
			pin.hidden = this.pinned.hidden;
		}

		this.setPin(pin);
	}

	/**
	 * Replaces the pinned message, discarding the previous one.
	 */
	public setPin(pin: Pin | null) {
		this.pinned?.dispose();
		this.pinned = pin;
	}

	/**
	 * Removes the pinned message if it is still the given one.
	 */
	public clearPin(pin: Pin) {
		if (this.pinned === pin) this.setPin(null);
	}

	public async setShieldMode(active = true) {
		await this.channel.client.gql(shieldModeMutation, {
			channel: this.channel.id,
			mode: active ? "SHIELD" : "DEFAULT",
		});
	}

	public async setSubOnly(subOnly: boolean) {
		await this.channel.client.gql(updateChatSubOnlyMode, {
			channel: this.channel.id,
			subOnly,
		});
	}

	public async updateSettings(settings: ChatSettings) {
		const slowDuration = settings.slow ?? this.mode.slow;
		const isFollowerOnly = settings.followerOnly ?? this.mode.followerOnly !== null;

		await this.channel.client.gql(updateChatSettingsMutation, {
			input: {
				channelID: this.channel.id,
				followersOnlyDurationMinutes: isFollowerOnly
					? (settings.followerOnlyDuration ?? this.mode.followerOnly ?? 0)
					: -1,
				slowModeDurationSeconds: slowDuration,
				isEmoteOnlyModeEnabled: settings.emoteOnly ?? this.mode.emoteOnly,
				isUniqueChatModeEnabled: settings.unique ?? this.mode.unique,
			},
		});
	}

	public async send(message: string) {
		if (message.startsWith("/")) {
			await this.#runCommand(message);
			return;
		}

		const text = this.#prepare(message);
		if (text === null) return;

		// Clear the reply before sending so the UI doesn't wait on it.
		const replyId = this.replyTarget?.id;
		this.replyTarget = null;

		const { sent } = await this.channel.client.gql(sendMessageMutation, {
			input: {
				channelID: this.channel.id,
				replyParentMessageID: replyId,
				message: text,
				nonce: crypto.randomUUID(),
			},
		});

		if (sent?.dropReason) {
			const reason = sent.dropReason;

			log.warn(`Message dropped: ${reason}`);

			if (reason === "AUTOMOD_HELD") {
				this.notice(
					"Your message is being held for review by the moderators and has not been sent.",
				);
			} else {
				this.notice(`Your message was not sent: ${reason}`);
			}

			return;
		}

		if (sent?.message) {
			log.info("Message sent");
			void app.user?.sendPresence(this.channel.id);
		}
	}

	/**
	 * Sends a message and pins it.
	 */
	public async sendPinned(message: string) {
		const text = this.#prepare(message);
		if (text === null) return;

		await this.channel.client.gql(sendPinnedMessageMutation, {
			channel: this.channel.id,
			message: text,
		});

		void app.user?.sendPresence(this.channel.id);
	}

	async #runCommand(message: string) {
		if (!app.user) return;

		const [name, ...args] = message.slice(1).split(" ");

		const command = this.commands.get(name);
		if (!command || (command.modOnly && !this.channel.isMod)) return;

		try {
			await command.exec(args, this.channel, app.user);
		} catch (error) {
			if (error instanceof Error) {
				log.error(
					`Error executing command ${name} in channel ${this.channel.user.username}: ${error.message}`,
				);
			}

			throw error;
		}
	}

	#prepare(message: string) {
		if (!app.user) return null;

		const viewer = this.channel.viewers.get(app.user.id);
		const elevated = this.channel.isMod || !!viewer?.vip;

		if (this.#checkRateLimit(elevated)) {
			this.notice("You are sending messages too quickly. Your message was not sent.");
			return null;
		}

		if (
			!elevated &&
			settings.state["chat.messages.duplicateBypass"] &&
			this.#lastSent === message
		) {
			this.#bypassNext = !this.#bypassNext;
		} else {
			this.#bypassNext = false;
		}

		this.#lastSent = message;

		if (this.#bypassNext) {
			message = `${message} \u{E0000}`;
		}

		log.info(`Sending message in ${this.channel.user.username} (${this.channel.id})`);

		return message;
	}

	#checkRateLimit(elevated: boolean) {
		const now = performance.now();

		const queue = elevated ? this.#lastMessageElevated : this.#lastMessage;
		const maxMsgCount = elevated ? 99 : 19;
		const minMsgOffset = elevated ? 100 : 1100;

		const last = queue.at(-1);

		if (last && last + minMsgOffset > now) return true;

		while (queue.length && queue[0] + RATE_LIMIT_WINDOW + RATE_LIMIT_GRACE < now) {
			queue.shift();
		}

		if (queue.length >= maxMsgCount) return true;

		queue.push(now);
		return false;
	}
}
