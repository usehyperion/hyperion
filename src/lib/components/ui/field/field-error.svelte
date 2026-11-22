<script lang="ts">
	import { FieldError } from "@ui-sdk/svelte/field";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	import type { WithElementRef } from "#lib/util/index.js";

	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		errors,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		children?: Snippet;
		errors?: { message?: string }[];
	} = $props();

	const hasContent = $derived.by(() => {
		// has slotted error
		if (children) return true;

		// no errors
		if (!errors) return false;

		// has an error but no message
		if (errors.length === 1 && !errors[0]?.message) {
			return false;
		}

		return true;
	});

	const isMultipleErrors = $derived(errors && errors.length > 1);
	const singleErrorMessage = $derived(errors && errors.length === 1 && errors[0]?.message);
</script>

{#if hasContent}
	<FieldError match class={cn("text-2xs text-danger", className)} {...restProps}>
		{#snippet render({ props })}
			<div {...props} bind:this={ref}>
				{#if children}
					{@render children()}
				{:else if singleErrorMessage}
					{singleErrorMessage}
				{:else if isMultipleErrors}
					<ul class="ms-4 flex list-disc flex-col gap-0.5">
						{#each errors ?? [] as error, index (index)}
							{#if error?.message}
								<li>{error.message}</li>
							{/if}
						{/each}
					</ul>
				{/if}
			</div>
		{/snippet}
	</FieldError>
{/if}
