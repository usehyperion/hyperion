import type { Command } from "./commands";
import type { Suggestion } from "./components/Suggestions.svelte";
import type { Emote } from "./emotes";
import type { Chat } from "./models/chat.svelte";
import type { User } from "./models/user.svelte";
import type { Viewer } from "./models/viewer.svelte";

import { app } from "./app.svelte";
import { commands } from "./commands";
import { emoteSources } from "./emotes";
import { log } from "./log";
import { debounce } from "./util/index.js";

interface SearchOptions<T> {
	source: () => T[];
	comparee: (item: T) => string;
	map: (item: T) => Suggestion;
}

export class Completer {
	#input: HTMLInputElement;

	#commandOptions: SearchOptions<Command>;
	#emoteOptions: SearchOptions<Emote>;
	#viewerOptions: SearchOptions<Viewer>;

	// Where the inserted suggestion is while cycling through suggestions.
	#span: { start: number; end: number } | null = null;

	public query = "";
	public prefixed = false;

	public current = $state(0);
	public suggestions = $state<Suggestion[]>([]);

	// Debounced so a burst of keystrokes collapses into a single batched request.
	#hydrateAvatars = debounce((users: User[]) => {
		this.chat.channel.client.users.fetchAvatars(users).catch((error: unknown) => {
			log.warn("Failed to load avatars", error);
		});
	}, 200);

	public constructor(
		private readonly chat: Chat,
		input: HTMLInputElement,
	) {
		this.#input = input;

		this.#commandOptions = {
			source: () => commands,
			comparee: (item) => item.name,
			map: (item) => ({
				type: "command" as const,
				value: `/${item.name}`,
				provider: item.provider,
				display: `/${item.name}`,
				description: item.description,
				args: item.args ?? [],
				broadcasterOnly: item.broadcasterOnly ?? false,
				modOnly: item.modOnly ?? false,
			}),
		};

		this.#emoteOptions = {
			source: () =>
				chat.channel.emotes
					.values()
					.toArray()
					.concat(...(app.user?.ownEmotes ?? []), ...app.emotes.values()),
			comparee: (item) => item.displayName,
			map: (item) => {
				const sources = emoteSources(item);
				const image = sources.find((source) => source.density === "2x") ?? sources[0];

				return {
					type: "emote" as const,
					value: item.displayName,
					display: item.displayName,
					imageUrl: image.url,
				};
			},
		};

		this.#viewerOptions = {
			source: () => chat.channel.viewers.values().toArray(),
			comparee: (item) => item.username,
			map: (item) => ({
				type: "user" as const,
				// Localized names are mentioned by login, as Twitch does.
				value: item.user.localizedName ? item.username : item.user.displayName,
				display: item.user.displayName,
				style: item.user.style,
				user: item.user,
				role: item.broadcaster
					? ("broadcaster" as const)
					: item.moderator
						? ("moderator" as const)
						: item.vip
							? ("vip" as const)
							: undefined,
			}),
		};
	}

	public tab(shift: boolean) {
		// Ignore if in the middle of a word
		if (this.chat.value.charAt(this.#input.selectionStart ?? 0).trim() !== "") {
			return;
		}

		if (this.prefixed && this.suggestions.length) {
			this.complete();
		} else if (this.suggestions.length) {
			if (shift) {
				this.prev();
			} else {
				this.next();
			}

			this.complete(false);
		} else {
			this.search(true);

			if (this.suggestions.length) {
				this.complete(false);
			}
		}
	}

	public complete(reset = true) {
		const suggestion = this.suggestions[this.current];
		const text = this.chat.value;
		const cursor = this.#input.selectionStart ?? text.length;

		// The word being completed ends at the cursor; once a suggestion was
		// inserted, cycling replaces that instead. Mentions keep their `@`.
		let { start, end } = this.#span ?? { start: cursor - this.query.length, end: cursor };
		if (!this.#span && this.query.startsWith("@")) start++;

		this.chat.value = `${text.slice(0, start) + suggestion.value} ${text.slice(end).trim()}`;
		this.#input.focus();

		const endPos = start + suggestion.value.length + 1;
		this.#input.setSelectionRange(endPos, endPos);

		if (reset) {
			this.reset();
		} else {
			this.query = suggestion.value;
			this.#span = { start, end: start + suggestion.value.length };
		}
	}

	public search(tab = false) {
		const text = this.chat.value;
		const cursor = this.#input.selectionStart ?? text.length;

		const left = text.slice(0, cursor);
		const lastWord = left.split(" ").pop();

		this.#span = null;

		if (!lastWord) {
			this.suggestions = [];
			return;
		}

		this.query = lastWord;

		if (this.query.startsWith("/")) {
			this.prefixed = true;
			this.suggestions = this.#search(this.#commandOptions).filter((suggestion) => {
				if (!app.user || suggestion.type !== "command") {
					return false;
				}

				if (suggestion.broadcasterOnly && this.chat.channel.id !== app.user.id) {
					return false;
				}

				if (suggestion.modOnly && !this.chat.channel.isMod) {
					return false;
				}

				return true;
			});
		} else if (this.query.startsWith(":")) {
			this.prefixed = true;
			this.suggestions = this.#search(this.#emoteOptions);
		} else if (this.query.startsWith("@")) {
			this.prefixed = true;
			this.suggestions = this.#search(this.#viewerOptions);
		} else if (tab) {
			this.suggestions = [
				...this.#search(this.#emoteOptions, true),
				...this.#search(this.#viewerOptions, true),
			];
		}

		// Backfill avatars for the visible user suggestions only, keeping the
		// request small instead of hydrating every chatter.
		const users = this.suggestions
			.filter((suggestion) => suggestion.type === "user")
			.map((suggestion) => suggestion.user);

		if (users.length) this.#hydrateAvatars(users);
	}

	public next() {
		this.current = (this.current + 1) % this.suggestions.length;
	}

	public prev() {
		this.current = (this.current - 1 + this.suggestions.length) % this.suggestions.length;
	}

	public reset() {
		this.#span = null;
		this.query = "";
		this.prefixed = false;
		this.suggestions = [];
		this.current = 0;
	}

	#search<T>(options: SearchOptions<T>, tab = false) {
		const searchFunction = tab ? "startsWith" : "includes";
		const query = tab ? this.query : this.query.slice(1);

		if (!query) return [];

		return options
			.source()
			.filter((item) =>
				options.comparee(item).toLowerCase()[searchFunction](query.toLowerCase()),
			)
			.slice(0, 25)
			.map(options.map)
			.toSorted((a, b) => a.value.localeCompare(b.value));
	}
}
