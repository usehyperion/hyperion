import { RuneStore } from "@tauri-store/svelte";
import type { User } from "./graphql/twitch";
import { settings } from "./settings";
import { firstLeaf, type SplitNode } from "./split-layout";

interface Storage {
	[key: string]: unknown;
	user: User | null;
	accounts: User[];
	layout: SplitNode | null;
	pinned: string[];
}

export const storage = new RuneStore<Storage>(
	"storage",
	{
		user: null,
		accounts: [],
		layout: null,
		pinned: [],
	},
	{
		autoStart: true,
		hooks: {
			beforeBackendSync(state) {
				// Single-connection mode has no splits, so collapse any leftover
				// tree to its focused leaf rather than persisting a split layout.
				if (
					settings.state["advanced.singleConnection"] &&
					state.layout &&
					typeof state.layout !== "string"
				) {
					state.layout = firstLeaf(state.layout);
				}

				return state;
			},
		},
	},
);
