<script lang="ts">
	import { FieldDescription, FieldLegend, FieldSet } from "@ui-sdk/svelte/field";
	import type { Snippet } from "svelte";
	import type { HTMLFieldsetAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	import type { FieldText } from "./Field.svelte";

	interface Props extends Omit<HTMLFieldsetAttributes, "children" | "disabled"> {
		legend?: FieldText;
		description?: FieldText;
		disabled?: boolean;
		children?: Snippet;
	}

	const { class: className, legend, description, disabled, children, ...rest }: Props = $props();
</script>

{#snippet text(value: FieldText)}
	{#if typeof value === "function"}{@render value()}{:else}{value}{/if}
{/snippet}

<FieldSet class={cn("flex min-w-0 flex-col gap-3", className)} {disabled} {...rest}>
	{#if legend || description}
		<div class="flex flex-col gap-0.5">
			{#if legend}
				<FieldLegend class="text-ui font-medium text-fg data-disabled:opacity-50">
					{@render text(legend)}
				</FieldLegend>
			{/if}

			{#if description}
				<FieldDescription
					class="text-2xs/relaxed text-fg-muted [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-fg"
				>
					{@render text(description)}
				</FieldDescription>
			{/if}
		</div>
	{/if}

	{@render children?.()}
</FieldSet>
