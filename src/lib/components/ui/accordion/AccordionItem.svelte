<script lang="ts">
	import { AccordionItem } from "@ui-sdk/svelte/accordion";
	import type { ComponentProps } from "svelte";

	import { cn } from "#lib/util/styles.js";

	const { class: className, ...rest }: ComponentProps<typeof AccordionItem> = $props();
</script>

<AccordionItem class={cn("flex flex-col border-b border-line", className)} {...rest} />
