<script lang="ts">
	import { TabsIndicator, TabsList } from "@ui-sdk/svelte/tabs";
	import type { ComponentProps } from "svelte";

	import { cn } from "#lib/util/styles.js";

	import { setTabsVariant, type TabsVariant } from "./context.js";

	interface Props extends ComponentProps<typeof TabsList> {
		variant?: TabsVariant;
	}

	let { class: className, variant = "segmented", children: content, ...rest }: Props = $props();

	setTabsVariant(() => variant);
</script>

<TabsList
	class={cn(
		variant === "segmented"
			? "relative isolate flex h-control shrink-0 control-track p-0.5 vertical:h-auto vertical:flex-col"
			: "flex flex-col gap-px horizontal:flex-row",
		className,
	)}
	data-variant={variant}
	{...rest}
>
	{#snippet children(state)}
		{@render content?.(state)}

		{#if variant === "segmented"}
			<TabsIndicator
				class="absolute top-(--active-tab-top) left-(--active-tab-left) -z-1 h-(--active-tab-height) w-(--active-tab-width) rounded-[5px] control-raised transition-[top,left,width,height] duration-200 ease-out-quart data-[activation-direction=none]:transition-none motion-reduce:transition-none"
			/>
		{/if}
	{/snippet}
</TabsList>
