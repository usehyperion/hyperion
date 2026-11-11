import { invoke } from "@tauri-apps/api/core";

import type { User } from "./graphql/twitch";
import type { Layout } from "./splits/types";

import { log } from "./log.js";
import { Persisted } from "./persisted.svelte";
import { settings } from "./settings.js";
import { restoreLayout } from "./splits/tree";
import { once } from "./util/resource.js";

export interface RecentSearch {
	id: string;
	login: string;
	displayName: string;
	profileImageURL: string;
	isLive: boolean;
	streamTitle: string | null;
}

interface Storage {
	user: User | null;
	accounts: User[];
	layout: Layout | null;
	pinned: string[];
	recentSearches: RecentSearch[];
	sidebarCollapsed: boolean;
}

export const storage = new Persisted<Storage>(
	"storage",
	{
		user: null,
		accounts: [],
		layout: null,
		pinned: [],
		recentSearches: [],
		sidebarCollapsed: true,
	},
	{
		restore(state) {
			state.layout = restoreLayout(state.layout);
			return state;
		},
	},
);

type LegacyStore = "settings" | "storage";

// TODO: Remove after 3 major versions (v0.15)
export const migrateLegacyStores = once(async () => {
	await Promise.all([migrate("settings", settings), migrate("storage", storage)]);
});

async function migrate<T extends object>(name: LegacyStore, store: Persisted<T>) {
	try {
		const contents = await invoke<string | null>("read_legacy_store", { store: name });
		if (contents === null) return;

		store.replace(JSON.parse(contents));
		await invoke("remove_legacy_store", { store: name });

		log.info(`Moved ${name} to local storage`);
	} catch (error) {
		log.error(`Failed to move ${name} to local storage`, error);
	}
}
