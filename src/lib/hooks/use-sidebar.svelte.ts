import { storage } from "$lib/stores";

class Sidebar {
	/**
	 * Whether the sidebar is collapsed.
	 */
	public get collapsed() {
		return storage.state.sidebarCollapsed;
	}

	public set collapsed(value: boolean) {
		storage.state.sidebarCollapsed = value;
	}

	public toggle() {
		this.collapsed = !this.collapsed;
	}
}

let instance: Sidebar | undefined;

export function useSidebar(): Sidebar {
	return (instance ??= new Sidebar());
}
