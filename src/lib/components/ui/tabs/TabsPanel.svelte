<script lang="ts">
	import { TabsPanel } from "@ui-sdk/svelte/tabs";
	import type { ComponentProps } from "svelte";

	import { cn } from "#lib/util/styles.js";

	const { class: className, ...rest }: ComponentProps<typeof TabsPanel> = $props();
</script>

<TabsPanel class={cn("min-w-0 rounded-control control-focus", className)} {...rest} />
