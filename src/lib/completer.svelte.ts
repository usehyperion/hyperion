import type { Command } from "./commands";
import type { Emote } from "./emotes";
import type { Chat } from "./models/chat.svelte";
import type { User } from "./models/user.svelte";
import type { Viewer } from "./models/viewer.svelte";

import { app } from "./app.svelte";
import { hasPermission, commands } from "./commands";
import { emoteSources } from "./emotes";
import { log } from "./log";
import { debounce } from "./util/index.js";

interface BaseSuggestion {
	value: string;
	display: string;
}

export interface CommandSuggestion extends BaseSuggestion {
	type: "command";
	command: Command;
}

export interface EmoteSuggestion extends BaseSuggestion {
	type: "emote";
	imageUrl: string;
}

export interface UserSuggestion extends BaseSuggestion {
	type: "user";
	style: string;
	user: User;
	role?: "broadcaster" | "moderator" | "vip";
}

export type Suggestion = CommandSuggestion | EmoteSuggestion | UserSuggestion;

export type Trigger = "@" | ":" | "/";

interface SearchOptions<T> {
	source: () => T[];
	comparee: (item: T) => string;
	map: (item: T) => Suggestion;
}

interface Match<T> {
	item: T;
	name: string;
	rank: number;
}

export class Completer {
	public query = "";
	public current = $state(0);
	public suggestions = $state<Suggestion[]>([]);

	#options: Record<Trigger, SearchOptions<any>>;

	// Where the inserted suggestion is while cycling through suggestions.
	#span: { start: number; end: number } | null = null;

	// Debounced so a burst of keystrokes collapses into a single batched request.
	#hydrateAvatars = debounce((users: User[]) => {
		this.chat.channel.client.users
			.fetchAvatars(users)
			.catch(log.swallow("Failed to load avatars"));
	}, 200);

	public constructor(
		private readonly chat: Chat,
		private readonly input: HTMLInputElement,
	) {
		const commandOptions: SearchOptions<Command> = {
			source: () => commands.filter((command) => hasPermission(command, chat.channel)),
			comparee: (item) => item.name,
			map: (item) => ({
				type: "command" as const,
				value: `/${item.name}`,
				display: `/${item.name}`,
				command: item,
			}),
		};

		const emoteOptions: SearchOptions<Emote> = {
			source: () => [
				...(app.user?.ownEmotes ?? []),
				...app.emotes.values(),
				...chat.channel.emotes.values(),
			],
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

		const viewerOptions: SearchOptions<Viewer> = {
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
					? "broadcaster"
					: item.moderator
						? "moderator"
						: item.vip
							? "vip"
							: undefined,
			}),
		};

		this.#options = {
			"/": commandOptions,
			":": emoteOptions,
			"@": viewerOptions,
		};
	}

	public tab(shift: boolean) {
		// Ignore if in the middle of a word
		if (this.chat.value.charAt(this.input.selectionStart ?? 0).trim() !== "") {
			return;
		}

		if (this.suggestions.length) {
			if (shift) {
				this.prev();
			} else {
				this.next();
			}

			this.complete();
		} else {
			this.#searchWord();

			if (this.suggestions.length) {
				this.complete();
			}
		}
	}

	public suggest(trigger: Trigger, query: string) {
		const suggestions = this.#search(this.#options[trigger], query);

		// Backfill avatars for the visible user suggestions only, keeping the
		// request small instead of hydrating every chatter.
		const users = suggestions
			.filter((suggestion) => suggestion.type === "user")
			.map((suggestion) => suggestion.user);

		if (users.length) {
			this.#hydrateAvatars(users);
		}

		return suggestions;
	}

	public complete() {
		const suggestion = this.suggestions[this.current];
		const text = this.chat.value;
		const cursor = this.input.selectionStart ?? text.length;

		// The word being completed ends at the cursor. Once a suggestion was
		// inserted, cycling replaces that instead.
		const { start, end } = this.#span ?? {
			start: cursor - this.query.length,
			end: cursor,
		};

		this.chat.value = `${text.slice(0, start) + suggestion.value} ${text.slice(end).trim()}`;
		this.input.focus();

		const endPos = start + suggestion.value.length + 1;
		this.input.setSelectionRange(endPos, endPos);

		this.query = suggestion.value;
		this.#span = { start, end: start + suggestion.value.length };
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
		this.suggestions = [];
		this.current = 0;
	}

	#searchWord() {
		const text = this.chat.value;
		const cursor = this.input.selectionStart ?? text.length;

		this.#span = null;
		this.query = text.slice(0, cursor).split(" ").pop() ?? "";

		const emotes = this.#search(this.#options[":"], this.query, true);
		const names = new Set(emotes.map((suggestion) => suggestion.value));

		this.suggestions = [
			...emotes,
			...this.#search(this.#options["@"], this.query, true).filter(
				(suggestion) => !names.has(suggestion.value),
			),
		];
	}

	#search<T>(options: SearchOptions<T>, text: string, tab = false) {
		const query = text.toLowerCase();
		if (!query) return [];

		const matches: Match<T>[] = [];
		const seen = new Set<string>();

		for (const item of options.source()) {
			const name = options.comparee(item);

			if (seen.has(name)) continue;
			seen.add(name);

			const lower = name.toLowerCase();

			// Exact matches > prefixes > substrings
			if (lower === query) {
				matches.push({ item, name, rank: 0 });
			} else if (lower.startsWith(query)) {
				matches.push({ item, name, rank: 1 });
			} else if (!tab && lower.includes(query)) {
				matches.push({ item, name, rank: 2 });
			}
		}

		return matches
			.toSorted((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
			.slice(0, 25)
			.map(({ item }) => options.map(item));
	}
}
