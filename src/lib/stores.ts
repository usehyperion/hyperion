import { RuneStore } from "@tauri-store/svelte";
import type { User } from "./graphql/twitch";
import type { SidebarState } from "./hooks/use-sidebar.svelte";
import { settings } from "./settings";
import { firstPane, isPane, type SplitNode } from "./split-layout";

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
	{
		autoStart: true,
		hooks: {
			beforeBackendSync(state) {
				// Single-connection mode has no splits or tabs, so collapse any
				// leftover tree to a single pane holding only the active channel.
				if (settings.state["advanced.singleConnection"] && state.layout) {
					if (!isPane(state.layout) || state.layout.tabs.length > 1) {
						const pane = firstPane(state.layout);

						state.layout = {
							...pane,
							tabs: pane.active ? [pane.active] : [],
						};
					}
				}

				return state;
			},
		},
	},
);
