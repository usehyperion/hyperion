<script lang="ts">
	import { AccordionPanel } from "@ui-sdk/svelte/accordion";
	import type { ComponentProps } from "svelte";

	import { cn } from "#lib/util/styles.js";

	const { class: className, ...rest }: ComponentProps<typeof AccordionPanel> = $props();
</script>

<AccordionPanel class={cn("px-3 py-2.5 text-ui", className)} {...rest} />
