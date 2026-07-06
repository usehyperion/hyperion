import { RuneStore } from "@tauri-store/svelte";
import type { User } from "./graphql/twitch";
import type { SidebarState } from "./hooks/use-sidebar.svelte";
import type { SplitNode } from "./splits/types";

interface Storage {
	[key: string]: unknown;
	user: User | null;
	accounts: User[];
	layout: SplitNode | null;
	pinned: string[];
	sidebar: SidebarState;
}

export const storage = new RuneStore<Storage>(
	"storage",
	{
		user: null,
		accounts: [],
		layout: null,
		pinned: [],
		sidebar: "expanded",
	},
	{ autoStart: true },
);
