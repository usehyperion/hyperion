import type { Connection } from "#lib/graphql/index.js";

import { nodes } from "#lib/graphql/index.js";

export interface Page<T> {
	/**
	 * The items in the page, oldest first.
	 */
	items: T[];
	cursor: string | null;
	hasNext: boolean;
}

/**
 * Creates a page from a connection whose edges are returned newest first.
 * Nodes are skipped if `transform` returns `null`.
 */
export function toPage<N, T>(
	connection: Connection<N> | null | undefined,
	transform: (node: N) => T | null,
): Page<T> {
	return {
		items: nodes(connection)
			.toReversed()
			.map(transform)
			.filter((item) => item !== null),
		cursor: connection?.edges?.at(-1)?.cursor ?? null,
		hasNext: connection?.pageInfo?.hasNextPage ?? false,
	};
}

/**
 * Prepends a page of older items, skipping any that are already present.
 * Pages can overlap if items arrive between requests.
 */
export function prependUnique<T extends { id: string }>(items: T[], older: T[]) {
	const known = new Set(items.map((item) => item.id));

	return [...older.filter((item) => !known.has(item.id)), ...items];
}

/**
 * Tracks the cursor of a backwards paginated connection.
 */
export class Pager<T> {
	readonly #fetch: (after: string | null) => Promise<Page<T>>;

	#cursor: string | null = null;
	#older: Promise<T[]> | null = null;

	/**
	 * Whether there are older pages that can be fetched with
	 * {@linkcode older}.
	 */
	public hasOlder = $state(false);

	public constructor(fetch: (after: string | null) => Promise<Page<T>>) {
		this.#fetch = fetch;
	}

	/**
	 * Fetches the most recent page, resetting the cursor.
	 */
	public async first() {
		const page = await this.#fetch(null);

		this.#paginate(page);

		return page.items;
	}

	/**
	 * Fetches the page before the oldest fetched page. Concurrent calls share
	 * the same request.
	 */
	public older() {
		if (!this.hasOlder) return Promise.resolve([]);

		this.#older ??= this.#fetch(this.#cursor)
			.then((page) => {
				this.#paginate(page);

				return page.items;
			})
			.finally(() => {
				this.#older = null;
			});

		return this.#older;
	}

	#paginate(page: Page<T>) {
		this.#cursor = page.cursor;
		this.hasOlder = page.hasNext && !!page.cursor;
	}
}
