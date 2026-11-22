<script lang="ts">
	import { TabsTab } from "@ui-sdk/svelte/tabs";
	import type { ComponentProps } from "svelte";

	import { cn } from "#lib/util/styles.js";

	import { getTabsVariant } from "./context.js";

	const { class: className, ...rest }: ComponentProps<typeof TabsTab> = $props();

	const variant = getTabsVariant();
</script>

<TabsTab
	class={cn(
		"inline-flex min-w-0 items-center gap-2 text-ui whitespace-nowrap text-fg-muted control-focus transition-colors select-none hover:text-fg data-disabled:pointer-events-none data-disabled:opacity-40 data-selected:text-fg [&_svg]:shrink-0",
		variant() === "segmented"
			? "flex-1 justify-center gap-1.5 rounded-[5px] px-2.5 font-medium [&_svg]:size-3.5"
			: "h-control w-full justify-start rounded-control border border-transparent px-2 not-data-selected:hover:bg-surface-2 data-selected:control-raised [&_svg]:size-4",
		className,
	)}
	{...rest}
/>
