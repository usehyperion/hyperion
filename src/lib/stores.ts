import { RuneStore } from "@tauri-store/svelte";
import type { User } from "./graphql/twitch";
import { settings } from "./settings";
import type { SplitNode } from "./split-layout";

interface Storage {
	[key: string]: unknown;
	user: User | null;
	accounts: User[];
	lastJoined: string | null;
	pinned: string[];
}

export const storage = new RuneStore<Storage>(
	"storage",
	{
		user: null,
		accounts: [],
		lastJoined: null,
		pinned: [],
	},
	{ autoStart: true },
);

interface Layout {
	[key: string]: unknown;
	root: SplitNode | null;
}

export const layout = new RuneStore<Layout>(
	"layout",
	{ root: null },
	{
		autoStart: true,
		hooks: {
			beforeBackendSync(state) {
				if (settings.state["advanced.singleConnection"]) {
					state.root = null;
				}

				return state;
			},
		},
	},
);
