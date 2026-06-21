import type { ChannelPointReward } from "$lib/twitch/pubsub";
import type { UserMessage } from "../models/message/user-message.svelte";

const TTL = 15 * 1000;

/**
 * Correlates channel point redemptions that involve a chat message.
 */
export class RedemptionManager {
	readonly #messages = new Map<string, UserMessage>();
	readonly #rewards = new Map<string, ChannelPointReward>();
	readonly #timeouts = new Map<string, ReturnType<typeof setTimeout>>();

	/**
	 * Registers a redemption message. Attaches the reward immediately if it has
	 * already arrived; otherwise waits for it.
	 */
	public attachMessage(rewardId: string, userId: string, message: UserMessage) {
		const key = `${rewardId}:${userId}`;
		const reward = this.#rewards.get(key);

		if (reward) {
			message.redemption = reward;
			this.#forget(key);
			return;
		}

		this.#messages.set(key, message);
		this.#expire(key);
	}

	/**
	 * Registers a redeemed reward. Attaches it to the message immediately if it
	 * has already arrived; otherwise waits for it.
	 */
	public attachReward(reward: ChannelPointReward, userId: string) {
		const key = `${reward.id}:${userId}`;
		const message = this.#messages.get(key);

		if (message) {
			message.redemption = reward;
			this.#forget(key);
			return;
		}

		this.#rewards.set(key, reward);
		this.#expire(key);
	}

	public clear() {
		for (const timeout of this.#timeouts.values()) {
			clearTimeout(timeout);
		}

		this.#messages.clear();
		this.#rewards.clear();
		this.#timeouts.clear();
	}

	#expire(key: string) {
		clearTimeout(this.#timeouts.get(key));

		this.#timeouts.set(
			key,
			setTimeout(() => this.#forget(key), TTL),
		);
	}

	#forget(key: string) {
		clearTimeout(this.#timeouts.get(key));

		this.#timeouts.delete(key);
		this.#messages.delete(key);
		this.#rewards.delete(key);
	}
}
