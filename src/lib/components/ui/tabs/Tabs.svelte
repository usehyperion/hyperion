<script lang="ts">
	import { Tabs } from "@ui-sdk/svelte/tabs";
	import type { ComponentProps } from "svelte";

	import { cn } from "#lib/util/styles.js";

	let { class: className, value = $bindable(), ...rest }: ComponentProps<typeof Tabs> = $props();
</script>

<Tabs
	class={cn("flex gap-2 data-[orientation=horizontal]:flex-col", className)}
	bind:value
	{...rest}
/>
