const PREFIX = "hyperion";

let counter = 0;
const noop = () => {};

/**
 * Starts a span and returns a function that ends it. Calling the returned
 * function more than once has no effect.
 */
export function start(name: string): () => void {
	if (!import.meta.env.DEV) return noop;

	const label = `${PREFIX}:${name}`;
	const mark = `${label}#${++counter}`;

	performance.mark(mark);

	let ended = false;

	return () => {
		if (ended) return;
		ended = true;

		const entry = performance.measure(label, mark);
		performance.clearMarks(mark);

		// oxlint-disable-next-line no-console
		console.debug(`[perf] ${name}: ${entry.duration.toFixed(1)}ms`);
	};
}

/**
 * Measures the time taken for the promise returned by `fn` to settle.
 */
export function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
	if (!import.meta.env.DEV) return fn();

	const end = start(name);

	try {
		return fn().finally(end);
	} catch (error) {
		end();
		throw error;
	}
}

/**
 * Records a span from the time the page started loading until now.
 */
export function sinceOrigin(name: string) {
	if (!import.meta.env.DEV) return;

	const entry = performance.measure(`${PREFIX}:${name}`, { start: 0 });

	// oxlint-disable-next-line no-console
	console.debug(`[perf] ${name}: ${entry.duration.toFixed(1)}ms`);
}
