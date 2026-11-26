<script lang="ts">
	import type { DialogInitialFocus } from "@ui-sdk/svelte/dialog";
	import {
		Drawer,
		DrawerBackdrop,
		DrawerContent,
		type DrawerController,
		type DrawerSide,
	} from "@ui-sdk/svelte/drawer";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		controller?: DrawerController;
		side?: DrawerSide;
		initialFocus?: DialogInitialFocus;
		header?: Snippet;
		onOpenChange?: (open: boolean) => void;
		onOpenChangeComplete?: (open: boolean) => void;
	}

	const {
		controller,
		side = "right",
		class: className,
		initialFocus,
		header,
		children,
		onOpenChange,
		onOpenChangeComplete,
		...rest
	}: Props = $props();
</script>

<Drawer {controller} {side} {onOpenChange} {onOpenChangeComplete}>
	<DrawerBackdrop class="fixed inset-0 bg-(--backdrop)" />

	<DrawerContent
		class={cn(
			"relative flex h-full w-80 max-w-[85vw] flex-col border-l border-line bg-surface-1 text-fg shadow-popup outline-none",
			className,
		)}
		{initialFocus}
		{...rest}
	>
		{#if header}
			<header
				class="flex shrink-0 flex-col gap-2 border-b border-line p-3"
				data-slot="sheet-header"
			>
				{@render header()}
			</header>
		{/if}

		<div class="min-h-0 grow overflow-y-auto" data-slot="sheet-body">
			{@render children?.()}
		</div>
	</DrawerContent>
</Drawer>
