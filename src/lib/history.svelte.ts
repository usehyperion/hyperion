import { goto } from "$app/navigation";
import { app } from "./app.svelte";

type HistoryEntry = { kind: "route"; path: string } | { kind: "channel"; id: string };

/**
 * App-managed back/forward history. Channels are not routes, so the stack is
 * maintained explicitly: sidebar channel clicks record channel entries while
 * route navigations (settings, whispers) record route entries. Splits and other
 * ways of opening a channel are intentionally ignored.
 */
export class History {
	#stack = $state<HistoryEntry[]>([]);
	#index = $state(-1);

	// Set while applying an entry so the resulting navigation/open doesn't push
	// a duplicate entry back onto the stack.
	#applying = false;

	public readonly canGoBack = $derived(this.#index > 0);
	public readonly canGoForward = $derived(this.#index < this.#stack.length - 1);

	public pushRoute(path: string) {
		this.#push({ kind: "route", path });
	}

	public pushChannel(id: string) {
		this.#push({ kind: "channel", id });
	}

	public async back() {
		if (!this.canGoBack) return;

		this.#index--;
		await this.#apply(this.#stack[this.#index]);
	}

	public async forward() {
		if (!this.canGoForward) return;

		this.#index++;
		await this.#apply(this.#stack[this.#index]);
	}

	public reset() {
		this.#stack = [];
		this.#index = -1;
	}

	#push(entry: HistoryEntry) {
		if (this.#applying) return;

		const current = this.#stack[this.#index];
		if (current && this.#matches(current, entry)) return;

		const next = this.#stack.slice(0, this.#index + 1);
		next.push(entry);

		this.#stack = next;
		this.#index = next.length - 1;
	}

	async #apply(entry: HistoryEntry) {
		this.#applying = true;

		try {
			if (entry.kind === "channel") {
				const channel = app.channels.get(entry.id);
				if (channel) await app.open(channel);
			} else {
				await goto(entry.path);
			}
		} finally {
			this.#applying = false;
		}
	}

	#matches(a: HistoryEntry, b: HistoryEntry) {
		if (a.kind === "route" && b.kind === "route") {
			return a.path === b.path;
		}

		if (a.kind === "channel" && b.kind === "channel") {
			return a.id === b.id;
		}

		return false;
	}
}
