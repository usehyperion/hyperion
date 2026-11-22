import { createContext } from "svelte";

export type TabsVariant = "segmented" | "nav";

export const [getTabsVariant, setTabsVariant] = createContext<() => TabsVariant>();
