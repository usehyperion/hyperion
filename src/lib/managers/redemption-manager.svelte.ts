import RedemptionComponent from "$lib/components/message/Redemption.svelte";
import type { ChannelPointReward } from "$lib/twitch/pubsub";
import type { Chat } from "../models/chat.svelte";
import { ComponentMessage } from "../models/message/component-message";
import type { UserMessage } from "../models/message/user-message";
import type { Viewer } from "../models/viewer.svelte";

interface PendingRedemption {
	redemption: Redemption;
	timeout: ReturnType<typeof setTimeout>;
}

const TTL = 15 * 1000;

export class Redemption {
	public reward = $state<ChannelPointReward | null>(null);
	public message = $state<UserMessage | null>(null);
	public viewer = $state<Viewer | null>(null);
}

/**
 * Coordinates channel point redemptions that involve a chat message.
 *
 * Rewards that require viewer input emit both a `PRIVMSG` and a pubsub
 * redemption event in an unreliable order, with no shared id to join on. They're
 * correlated by `reward_id:user_id` and render a single message; whichever
 * event arrives first renders it, and the second fills in the rest.
 */
export class RedemptionManager {
	#pending = new Map<string, PendingRedemption>();

	public constructor(private readonly chat: Chat) {}

	/**
	 * Attaches the chat message to the redemption, rendering it if this is the
	 * first half to arrive.
	 */
	public resolveMessage(rewardId: string, userId: string, message: UserMessage) {
		const redeem = this.#upsert(`${rewardId}:${userId}`);

		redeem.message = message;
		redeem.viewer ??= message.viewer;

		this.#settle(`${rewardId}:${userId}`);
	}

	/**
	 * Attaches the reward to the redemption, rendering it if this is the first
	 * half to arrive.
	 */
	public resolveReward(reward: ChannelPointReward, userId: string, viewer: Viewer) {
		const redeem = this.#upsert(`${reward.id}:${userId}`);

		redeem.reward = reward;
		redeem.viewer ??= viewer;

		this.#settle(`${reward.id}:${userId}`);
	}

	public clear() {
		for (const { timeout } of this.#pending.values()) {
			clearTimeout(timeout);
		}

		this.#pending.clear();
	}

	#upsert(key: string) {
		const existing = this.#pending.get(key);
		if (existing) return existing.redemption;

		const redemption = new Redemption();
		const timeout = setTimeout(() => this.#pending.delete(key), TTL);

		this.#pending.set(key, { redemption: redemption, timeout });

		// Render exactly once so neither caller can duplicate it
		this.chat.add(new ComponentMessage(RedemptionComponent, redemption));

		return redemption;
	}

	#settle(key: string) {
		const pending = this.#pending.get(key);

		// Once both halves are present the entry is fully assembled and can be
		// dropped so a later redemption with the same reward+user starts fresh
		if (pending?.redemption.reward && pending.redemption.message) {
			clearTimeout(pending.timeout);
			this.#pending.delete(key);
		}
	}
}
