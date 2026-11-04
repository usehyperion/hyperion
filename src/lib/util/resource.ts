export interface Once<T> {
	(): Promise<T>;

	/**
	 * Forgets the result so the next call loads again.
	 */
	reset(): void;
}

export function once<T>(load: () => Promise<T>): Once<T> {
	let pending: Promise<T> | null = null;

	const run = () => {
		if (pending) return pending;

		const current = load().catch((error: unknown) => {
			if (pending === current) pending = null;
			throw error;
		});

		pending = current;

		return current;
	};

	return Object.assign(run, {
		reset() {
			pending = null;
		},
	});
}

export function shared<T>(fn: () => Promise<T>): () => Promise<T> {
	let pending: Promise<T> | null = null;

	return () => {
		if (pending) return pending;

		const current = fn().finally(() => {
			if (pending === current) pending = null;
		});

		pending = current;

		return current;
	};
}

const requests = new Map<string, Promise<any>>();

export function dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
	const request = requests.get(key);
	if (request) return request;

	const promise = fetcher().finally(() => {
		requests.delete(key);
	});

	requests.set(key, promise);

	return promise;
}
