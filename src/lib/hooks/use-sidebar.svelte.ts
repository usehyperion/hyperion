import { storage } from "$lib/stores";

export type SidebarState = "hidden" | "collapsed" | "expanded";

class Sidebar {
	/**
	 * The current sidebar visibility state.
	 */
	public get state(): SidebarState {
		return storage.state.sidebar;
	}

	public set state(value: SidebarState) {
		storage.state.sidebar = value;
	}

	/**
	 * Whether the sidebar is collapsed.
	 */
	public get collapsed() {
		return this.state === "collapsed";
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

export function useSidebar(): Sidebar {
	return (instance ??= new Sidebar());
}
