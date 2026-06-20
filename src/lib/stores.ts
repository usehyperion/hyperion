import { RuneStore } from "@tauri-store/svelte";
import type { User } from "./graphql/twitch";
import { settings } from "./settings";
import type { SplitNode } from "./split-layout";

interface Storage {
	[key: string]: unknown;
	user: User | null;
	accounts: User[];
	layout: SplitNode | null;
	lastJoined: string | null;
	pinned: string[];
}

export const storage = new RuneStore<Storage>(
	"storage",
	{
		user: null,
		accounts: [],
		layout: null,
		lastJoined: null,
		pinned: [],
	},
	{
		autoStart: true,
		hooks: {
			beforeBackendSync(state) {
				if (settings.state["advanced.singleConnection"]) {
					state.layout = null;
				}

				return state;
			},
		},
	},
);
