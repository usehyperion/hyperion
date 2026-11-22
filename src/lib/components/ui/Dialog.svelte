<script lang="ts">
	import {
		Dialog,
		DialogBackdrop,
		DialogContent,
		type DialogController,
		DialogDescription,
		type DialogInitialFocus,
		type DialogOpenChangeDetails,
		DialogTitle,
	} from "@ui-sdk/svelte/dialog";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	import { dialogController } from "#lib/dialog.js";
	import { cn } from "#lib/util/styles.js";

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "id" | "title" | "children"> {
		id?: string;
		controller?: DialogController;
		bodyClass?: string;
		title?: string;
		description?: string;
		dismissible?: boolean;
		initialFocus?: DialogInitialFocus;
		header?: Snippet;
		footer?: Snippet;
		children?: Snippet;
		onOpenChange?: (open: boolean, details: DialogOpenChangeDetails) => void;
		onOpenChangeComplete?: (open: boolean) => void;
	}

	const {
		id,
		controller,
		class: className,
		bodyClass,
		title,
		description,
		dismissible,
		initialFocus,
		header,
		footer,
		children,
		onOpenChange,
		onOpenChangeComplete,
		...rest
	}: Props = $props();

	const resolved = $derived(controller ?? (id ? dialogController(id) : undefined));
</script>

<Dialog controller={resolved} {dismissible} {onOpenChange} {onOpenChangeComplete}>
	<DialogBackdrop
		class="fixed inset-0 bg-(--backdrop) transition-opacity duration-150 ease-out starting:opacity-0 ending:opacity-0"
	/>

	<DialogContent
		class={cn(
			"fixed inset-0 m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md popup-surface flex-col overflow-hidden outline-none",
			className,
		)}
		{initialFocus}
		{...rest}
	>
		{#if header}
			<header
				class="flex flex-col gap-1 border-b border-line px-4 py-3"
				data-slot="dialog-header"
			>
				{@render header()}
			</header>
		{:else if title}
			<header
				class="flex flex-col gap-0.5 border-b border-line px-4 py-3"
				data-slot="dialog-header"
			>
				<DialogTitle class="text-sm font-semibold">{title}</DialogTitle>

				{#if description}
					<DialogDescription class="text-xs text-fg-muted">
						{description}
					</DialogDescription>
				{/if}
			</header>
		{/if}

		<div
			class={cn("flex min-h-0 grow flex-col gap-3 overflow-y-auto p-4", bodyClass)}
			data-slot="dialog-body"
		>
			{@render children?.()}
		</div>

		{#if footer}
			<footer
				class="flex shrink-0 justify-end gap-2 border-t border-line px-4 py-3"
				data-slot="dialog-footer"
			>
				{@render footer()}
			</footer>
		{/if}
	</DialogContent>
</Dialog>
