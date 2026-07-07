type SidebarState = "hidden" | "collapsed" | "expanded";

const SIDEBAR_STATE_KEY = "hyperion:sidebar";

function loadState(): SidebarState {
	if (typeof localStorage === "undefined") {
		return "collapsed";
	}

	const stored = localStorage.getItem(SIDEBAR_STATE_KEY);

	if (stored === "hidden" || stored === "collapsed" || stored === "expanded") {
		return stored;
	}

	return "collapsed";
}

class Sidebar {
	/**
	 * The current sidebar visibility state.
	 */
	public state = $state<SidebarState>(loadState());

	/**
	 * Whether the sidebar is collapsed.
	 */
	public readonly collapsed = $derived(this.state === "collapsed");

	public constructor() {
		if (typeof localStorage !== "undefined") {
			$effect.root(() => {
				$effect(() => {
					localStorage.setItem(SIDEBAR_STATE_KEY, this.state);
				});
			});
		}
	}

	/**
	 * Cycles the sidebar through hidden → collapsed → expanded → hidden.
	 */
	public cycle() {
		this.state =
			this.state === "hidden"
				? "collapsed"
				: this.state === "collapsed"
					? "expanded"
					: "hidden";
	}

	/**
	 * Toggles the sidebar between hidden and collapsed.
	 */
	public toggle() {
		this.state = this.state === "hidden" ? "collapsed" : "hidden";
	}
}

let instance: Sidebar | undefined;

/**
 * Returns the shared sidebar store, holding its visibility state and controls.
 */
export function useSidebar(): Sidebar {
	return (instance ??= new Sidebar());
}
