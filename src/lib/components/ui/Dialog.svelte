<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import { cn } from "cnfast";
	import type { Snippet } from "svelte";
	import type { HTMLDialogAttributes } from "svelte/elements";

	interface Props extends WithElementRef<HTMLDialogAttributes> {
		id: string;
		alert?: boolean;
		header?: Snippet;
		footer?: Snippet;
	}

	let {
		id,
		class: className,
		alert,
		ref = $bindable(null),
		header,
		children,
		footer,
		...rest
	}: Props = $props();
</script>

<dialog
	{id}
	class={cn(
		"fixed inset-0 m-auto w-full max-w-[calc(100%-2rem)] rounded-3xl border bg-popover p-6 text-popover-foreground shadow-lg sm:max-w-lg",
		"scale-95 opacity-0 transition-[opacity,scale,overlay,display] transition-discrete ease-out",
		className,
	)}
	role={alert ? "alertdialog" : null}
	data-component="dialog"
	bind:this={ref}
	{...rest}
>
	<header
		class="flex flex-col gap-2 heading:text-lg/1 heading:font-semibold [p]:text-sm [p]:text-muted-foreground"
		data-slot="dialog-header"
	>
		{@render header?.()}
	</header>

	<div class="space-y-4" data-slot="dialog-content">
		{@render children?.()}
	</div>

	<footer
		class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
		data-slot="dialog-footer"
	>
		{@render footer?.()}
	</footer>
</dialog>

<style>
	dialog {
		&::backdrop {
			background-color: oklch(0% 0 0deg / 50%);
			opacity: 0;
			transition:
				opacity 200ms ease-out,
				display 200ms ease-out allow-discrete;
		}

		&:is(:open, [open]) {
			opacity: 1;
			scale: 1;

			&::backdrop {
				opacity: 1;
				backdrop-filter: blur(6px);

				@starting-style {
					opacity: 0;
					backdrop-filter: blur(0);
				}
			}

			@starting-style {
				opacity: 0;
				scale: 0.95;
			}
		}
	}
</style>
