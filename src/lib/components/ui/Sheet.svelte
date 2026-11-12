<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { Snippet } from "svelte";
	import type { HTMLDialogAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";

	interface Props extends WithElementRef<HTMLDialogAttributes> {
		id: string;
		header?: Snippet;
	}

	let {
		id,
		class: className,
		ref = $bindable(null),
		header,
		children,
		...rest
	}: Props = $props();
</script>

<dialog
	{id}
	class={cn(
		"fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full max-w-xs flex-col bg-popover text-popover-foreground smooth-shadow-ring-lg open:flex sm:max-w-sm",
		"translate-x-full transition-[translate,overlay,display] transition-discrete duration-300 ease-out-quart",
		className,
	)}
	data-component="sheet"
	onclick={(event) => {
		if (event.target === event.currentTarget) {
			event.currentTarget.close();
		}
	}}
	bind:this={ref}
	{...rest}
>
	{#if header}
		<header class="flex shrink-0 flex-col gap-3 border-b p-3" data-slot="sheet-header">
			{@render header()}
		</header>
	{/if}

	<div class="min-h-0 grow overflow-y-auto" data-slot="sheet-content">
		{@render children?.()}
	</div>
</dialog>

<style>
	dialog {
		&::backdrop {
			background-color: oklch(0% 0 0deg / 50%);
			opacity: 0;
			transition:
				opacity 300ms ease-out,
				display 300ms ease-out allow-discrete;
		}

		&:is(:open, [open]) {
			translate: 0;

			&::backdrop {
				opacity: 1;

				@starting-style {
					opacity: 0;
				}
			}

			@starting-style {
				translate: 100%;
			}
		}
	}
</style>
