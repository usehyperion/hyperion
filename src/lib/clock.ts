import { createSubscriber } from "svelte/reactivity";

/**
 * The current time updated on every whole multiple of the interval to stay in
 * sync with the system clock.
 */
class Clock {
	readonly #subscribe: () => void;

	#now = Date.now();

	public constructor(interval: number) {
		this.#subscribe = createSubscriber((update) => {
			let id: ReturnType<typeof setInterval> | undefined;

			const tick = () => {
				this.#now = Date.now();
				update();
			};

			this.#now = Date.now();

			const timeout = setTimeout(
				() => {
					tick();
					id = setInterval(tick, interval);
				},
				interval - (Date.now() % interval),
			);

			return () => {
				clearTimeout(timeout);
				clearInterval(id);
			};
		});
	}

	public get now() {
		this.#subscribe();
		return this.#now;
	}
}

export const everySecond = new Clock(1000);
export const everyMinute = new Clock(60 * 1000);
