import { RuneStore } from "@tauri-store/svelte";

import type { User } from "./graphql/twitch";
import type { Layout } from "./splits/types";

import { migrate } from "./splits/document";

export interface RecentSearch {
	id: string;
	login: string;
	displayName: string;
	profileImageURL: string;
	isLive: boolean;
	streamTitle: string | null;
}

interface Storage {
	[key: string]: unknown;
	user: User | null;
	accounts: User[];
	layout: Layout | null;
	pinned: string[];
	recentSearches: RecentSearch[];
	sidebarCollapsed: boolean;
}

export const storage = new RuneStore<Storage>(
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
		autoStart: true,
		hooks: {
			beforeFrontendSync: (state) => {
				state.layout = migrate(state.layout);

				return state;
			},
		},
	},
);
