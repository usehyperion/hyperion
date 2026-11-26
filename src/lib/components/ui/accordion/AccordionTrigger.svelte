<script lang="ts">
	import { AccordionHeader, AccordionTrigger } from "@ui-sdk/svelte/accordion";
	import type { ComponentProps } from "svelte";
	import type { ClassValue } from "svelte/elements";

	import { IconAdd, IconIndeterminate } from "#lib/icons.js";
	import { cn } from "#lib/util/styles.js";

	interface Props extends ComponentProps<typeof AccordionTrigger> {
		headerClass?: ClassValue;
	}

	const { class: className, headerClass, children: content, ...rest }: Props = $props();
</script>

<AccordionHeader class={cn("flex bg-surface-1 data-open:bg-surface-2", headerClass)}>
	<AccordionTrigger
		class={cn(
			"flex h-8 w-full min-w-0 items-center gap-2 px-3 text-left text-body font-medium text-fg control-focus -outline-offset-2 transition-colors not-data-open:hover:bg-surface-2 data-disabled:opacity-50",
			className,
		)}
		{...rest}
	>
		{#snippet children(state)}
			{@render content?.(state)}

			{#if state.open}
				<IconIndeterminate
					class="ml-auto size-3.5 shrink-0 text-fg-muted"
					aria-hidden="true"
				/>
			{:else}
				<IconAdd class="ml-auto size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
			{/if}
		{/snippet}
	</AccordionTrigger>
</AccordionHeader>
