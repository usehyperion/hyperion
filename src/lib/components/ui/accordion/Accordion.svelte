<script lang="ts">
	import { Accordion } from "@ui-sdk/svelte/accordion";
	import type { ComponentProps } from "svelte";

	import { cn } from "#lib/util/styles.js";

	let {
		class: className,
		value = $bindable(),
		...rest
	}: ComponentProps<typeof Accordion> = $props();
</script>

<Accordion class={cn("flex flex-col", className)} bind:value {...rest} />
