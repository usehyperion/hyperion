/**
 * How long a single slice of work may run before yielding to the main thread.
 * Leaves headroom within a 60Hz frame (~16.6ms) for style, layout, and paint.
 */
export const FRAME_BUDGET = 5;

const resolvers: (() => void)[] = [];

// Created lazily so importing this module doesn't open a port outside of the
// browser (e.g. during prerendering).
let channel: MessageChannel | null = null;

/**
 * Yields to the main thread so pending input and rendering can be processed
 * before continuing.
 *
 * Prefers `scheduler.yield()` so the continuation is prioritized over other
 * queued tasks, falling back to a `MessageChannel` which avoids the minimum
 * delay imposed on nested `setTimeout` calls.
 */
export function yieldToMain() {
	if ("scheduler" in globalThis && typeof scheduler.yield === "function") {
		return scheduler.yield();
	}

	if (!channel) {
		channel = new MessageChannel();
		channel.port1.addEventListener("message", () => resolvers.shift()?.());
		channel.port1.start();
	}

	const { port2 } = channel;

	return new Promise<void>((resolve) => {
		resolvers.push(resolve);
		port2.postMessage(null);
	});
}

/**
 * Creates a function that yields to the main thread only once the given time
 * budget has been exceeded since the last yield. Intended to be awaited
 * between units of work in a long-running loop.
 */
export function createYielder(budget = FRAME_BUDGET) {
	let deadline = performance.now() + budget;

	return async () => {
		if (performance.now() < deadline) return;

		await yieldToMain();
		deadline = performance.now() + budget;
	};
}
