import type { Connection } from "#lib/graphql/index.js";

import { nodes } from "#lib/graphql/index.js";
import { shared } from "#lib/util/resource.js";

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
 * The items of a connection paginated backwards, oldest first.
 */
export class Pager<T extends { id: string }> {
	readonly #fetch: (after: string | null) => Promise<Page<T>>;

	#cursor: string | null = null;

	readonly #older = shared(async () => {
		const page = await this.#fetch(this.#cursor);
		this.#paginate(page);

		// Pages can overlap if items arrive between requests.
		const known = new Set(this.items.map((item) => item.id));
		this.items = [...page.items.filter((item) => !known.has(item.id)), ...this.items];
	});

	/**
	 * The loaded items, oldest first.
	 */
	public items = $state.raw<T[]>([]);

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
	 * Prepends the page before the oldest fetched page. Concurrent calls share
	 * the same request.
	 */
	public async older() {
		if (this.hasOlder) await this.#older();
	}

	#paginate(page: Page<T>) {
		this.#cursor = page.cursor;
		this.hasOlder = page.hasNext && !!page.cursor;
	}
}
